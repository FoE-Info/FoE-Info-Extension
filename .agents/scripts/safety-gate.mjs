#!/usr/bin/env node

/**
 * PreToolUse Safety Gate Hook
 * Blocks or asks for confirmation before executing destructive commands.
 *
 * Command matching is operand-aware via an internal minimal shell tokenizer,
 * so behavior is identical across the Antigravity hook runner and the opencode
 * plugin regardless of module resolution (no runtime dependency on
 * `shell-quote`). Only real `rm` invocations — or `rm` nested in a POSIX shell
 * — are checked, so unrelated strings such as commit messages or `node -e`
 * payloads do not trip the gate. Git and browser guards stay regex-based over
 * the quote-stripped command.
 */

import { fileURLToPath } from 'node:url';

export const DANGEROUS_PATTERNS = [
  /git\s+reset\s+.*(--hard|--merge)/i,
  /git\s+push\s+.*(--force|-f)\b/i,
  /git\s+clean\s+.*-[a-z]*f/i,
  /git\s+restore\s+.*([.]|\*|src(\/|$))/i,
  /git\s+checkout\s+.*((-f|--force)\b|(--\s+)?[.](?:\s|$))/i,
  /git\s+branch\s+.*(-[dD]|--delete)\s+(refs\/heads\/)?development\b/i,
  /git\s+push\s+.*--delete\s+(?:refs\/heads\/)?development\b/i,
  /git\s+push\s+.*\s:(?:refs\/heads\/)?development\b/i,
  /git\s+stash\s+(drop|clear)\b/i,
  /\bfoe-browser\b/i,
  /\b(pkill|killall)\s+.*chrome/i,
];

// Trees that must never be recursively deleted.
const PROTECTED_ROOTS = new Set(['src', '.agents', 'tests']);

// Scratch/build trees that are safe to remove.
const GENERATED_ARTIFACTS = new Set([
  'build',
  'dist',
  'node_modules',
  '__pycache__',
  '.cache',
  '.worktrees',
  '.superpowers',
  'coverage',
  'tmp',
  'temp',
  '.turbo',
  '.next',
  '.venv',
  'venv',
]);

const SHELL_INTERPRETERS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

function stripQuoted(text) {
  return text.replace(/"[^"]*"|'[^']*'/g, ' ');
}

function basename(token) {
  return String(token)
    .replace(/\/+$/, '')
    .split('/')
    .pop();
}

function isGeneratedArtifact(path) {
  return GENERATED_ARTIFACTS.has(basename(path));
}

function isRecursiveFlag(token) {
  if (typeof token !== 'string') return false;
  if (token === '--recursive') return true;
  return /^-[a-zA-Z]*r/i.test(token) || token.includes('R');
}

function isDangerousOperand(operand) {
  const raw = String(operand);
  if (raw.includes('*') || raw.includes('?') || raw.includes('[')) return true;
  const normalized = raw.replace(/\/+$/, '').replace(/^\.\//, '');
  if (normalized === '' || normalized === '.' || normalized === '/') {
    return true;
  }
  const segments = normalized.split('/').filter(Boolean);
  const touchesProtected = segments.some((part) => PROTECTED_ROOTS.has(part));
  if (!touchesProtected) return false;
  return !isGeneratedArtifact(normalized);
}

/**
 * Minimal shell tokenizer: splits a command into segments on unquoted
 * operators/newlines and each segment into whitespace-delimited string tokens.
 * Quotes and backslash escapes are resolved. Deterministic across runtimes so
 * the gate cannot silently fall back to a blunter policy.
 *
 * @param {string} cmd
 * @returns {string[][]}
 */
export function tokenizeCommand(cmd) {
  const segments = [];
  let current = [];
  let token = '';
  let quote = null;

  const flushToken = () => {
    if (token !== '') {
      current.push(token);
      token = '';
    }
  };
  const flushSegment = () => {
    flushToken();
    if (current.length) segments.push(current);
    current = [];
  };

  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && quote === '"' && i + 1 < cmd.length) {
        token += cmd[i + 1];
        i += 1;
      } else {
        token += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '\\') {
      if (i + 1 < cmd.length) {
        token += cmd[i + 1];
        i += 1;
      }
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      flushToken();
      continue;
    }
    if (ch === '\n' || ch === ';') {
      flushSegment();
      continue;
    }
    if (ch === '&' || ch === '|') {
      if (cmd[i + 1] === ch) i += 1;
      flushSegment();
      continue;
    }
    if (ch === '>' || ch === '<') {
      flushToken();
      while (i + 1 < cmd.length && /[><&]/.test(cmd[i + 1])) i += 1;
      continue;
    }
    token += ch;
  }
  flushSegment();
  return segments;
}

function isDangerousRmTokens(tokens) {
  if (!tokens.length) return false;
  if (basename(tokens[0]) !== 'rm') return false;
  const rest = tokens.slice(1);
  if (!rest.some(isRecursiveFlag)) return false;
  const operands = rest.filter(
    (token) => !(typeof token === 'string' && token.startsWith('-')),
  );
  if (!operands.length) return false;
  return operands.some(isDangerousOperand);
}

function nestedShellDanger(tokens) {
  if (!tokens.length) return false;
  if (!SHELL_INTERPRETERS.has(basename(tokens[0]))) return false;
  return tokens.some((token) => {
    if (typeof token !== 'string' || !/\brm\b/.test(token)) return false;
    return tokenizeCommand(token).some((segment) =>
      isDangerousRmTokens(segment),
    );
  });
}

export function isDangerousCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;

  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(stripQuoted(cmd)))) {
    return true;
  }

  for (const segment of tokenizeCommand(cmd)) {
    if (isDangerousRmTokens(segment)) return true;
    if (nestedShellDanger(segment)) return true;
  }

  return false;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const payload = JSON.parse(input || '{}');
      const toolCall = payload.toolCall || {};

      if (toolCall.name === 'run_command') {
        const cmd = toolCall.args?.CommandLine || '';
        if (isDangerousCommand(cmd)) {
          const response = {
            decision: 'force_ask',
            reason: `Potentially destructive command detected: "${cmd}". User confirmation required.`,
          };
          process.stdout.write(JSON.stringify(response));
          return;
        }
      }

      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    } catch {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    }
  });
}
