#!/usr/bin/env node

/**
 * PreToolUse Safety Gate Hook
 * Blocks or asks for confirmation before executing destructive commands.
 *
 * Command matching is operand-aware: the command is tokenized with
 * `shell-quote` and only real `rm` invocations (or `rm` nested in a POSIX
 * shell) are checked, so unrelated strings such as commit messages or
 * `node -e` payloads do not trip the gate. Git and browser guards stay
 * regex-based over the quote-stripped command.
 */

import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let parseShell = null;
try {
  ({ parse: parseShell } = createRequire(import.meta.url)('shell-quote'));
} catch {
  parseShell = null;
}

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

// Used only when shell-quote is unavailable, so recursive `rm` of protected
// trees is still blocked rather than silently allowed.
export const LEGACY_RM_PATTERN =
  /rm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*|-r\s+-f|-f\s+-r)\s+.*(src|\.agents|tests|\/|\*|\.\/)/i;

const PROTECTED_ROOTS = new Set(['src', '.agents', 'tests']);

const GENERATED_ARTIFACTS = new Set([
  'build',
  'dist',
  'node_modules',
  '__pycache__',
  '.cache',
  '.worktrees',
  'coverage',
  'tmp',
  'temp',
  '.turbo',
  '.next',
  '.venv',
  'venv',
]);

const SHELL_INTERPRETERS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

const SHELL_OPERATORS = new Set([
  '&&',
  '||',
  ';',
  '|',
  '&',
  '>>',
  '>',
  '<',
  '<<',
  '>&',
  '<&',
]);

function isObjectToken(token) {
  return token && typeof token === 'object' && typeof token.op === 'string';
}

function isSeparator(token) {
  return isObjectToken(token) && SHELL_OPERATORS.has(token.op);
}

function isGlob(token) {
  return isObjectToken(token) && token.op === 'glob';
}

function splitSegments(tokens) {
  const segments = [];
  let current = [];
  for (const token of tokens) {
    if (isSeparator(token)) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

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
  if (isGlob(operand)) return true;
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

function isDangerousRmTokens(tokens) {
  if (!tokens.length) return false;
  if (basename(tokens[0]) !== 'rm') return false;
  const rest = tokens.slice(1);
  if (!rest.some(isRecursiveFlag)) return false;
  const operands = rest.filter(
    (token) =>
      !isSeparator(token) &&
      !(typeof token === 'string' && token.startsWith('-')),
  );
  if (!operands.length) return false;
  return operands.some(isDangerousOperand);
}

function nestedShellDanger(tokens) {
  if (!tokens.length) return false;
  if (!SHELL_INTERPRETERS.has(basename(tokens[0]))) return false;
  return tokens.some((token) => {
    if (typeof token !== 'string' || !/\brm\b/.test(token)) return false;
    try {
      const nested = parseShell(token).filter((part) => !isSeparator(part));
      return isDangerousRmTokens(nested);
    } catch {
      return false;
    }
  });
}

export function isDangerousCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;

  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(stripQuoted(cmd)))) {
    return true;
  }

  if (!parseShell) return LEGACY_RM_PATTERN.test(cmd);

  let tokens;
  try {
    tokens = parseShell(cmd);
  } catch {
    return LEGACY_RM_PATTERN.test(cmd);
  }

  for (const segment of splitSegments(tokens)) {
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
