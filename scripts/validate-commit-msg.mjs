#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const VALID_TYPES = [
  'feat',
  'fix',
  'chore',
  'refactor',
  'docs',
  'test',
  'perf',
  'build',
  'ci',
  'revert',
];

export const NON_IMPERATIVE_WORDS = [
  'added',
  'adds',
  'adding',
  'fixed',
  'fixes',
  'fixing',
  'updated',
  'updates',
  'updating',
  'removed',
  'removes',
  'removing',
  'refactored',
  'refactors',
  'refactoring',
  'implemented',
  'implements',
  'implementing',
  'changed',
  'changes',
  'changing',
  'created',
  'creates',
  'creating',
  'deleted',
  'deletes',
  'deleting',
  'resolved',
  'resolves',
  'resolving',
  'moved',
  'moves',
  'moving',
];

export const BANNED_SLOP_WORDS = [
  'comprehensive',
  'robust',
  'seamless',
  'seamlessly',
  'enhance',
  'enhances',
  'enhanced',
  'enhancing',
  'leverage',
  'leveraged',
  'leveraging',
  'holistic',
];

export const TEMPLATE_PHRASES = [
  'this commit',
  'this change',
  'we are',
  'i have',
];

export const FILLER_ADVERBS = [
  'just',
  'really',
  'basically',
  'simply',
  'actually',
];

/**
 * Checks if a body line is exempt from the 72-char limit because it is a URL or markdown link.
 * @param {string} line
 * @returns {boolean}
 */
function isExemptBodyLine(line) {
  const trimmed = line.trim();
  // Bare URL
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return true;
  }
  // Markdown link
  if (/^\[.+?\]\(\S+?\)$/i.test(trimmed)) {
    return true;
  }
  // Bullet point with URL or markdown link
  if (/^[-*]\s+https?:\/\/\S+$/i.test(trimmed)) {
    return true;
  }
  if (/^[-*]\s+\[.+?\]\(\S+?\)$/i.test(trimmed)) {
    return true;
  }
  // Line containing a URL or markdown link where removing links leaves <= 72 characters
  const withoutLinks = trimmed
    .replace(/\[.+?\]\(\S+?\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
  if (
    (/https?:\/\/\S+/i.test(trimmed) || /\[.+?\]\(\S+?\)/i.test(trimmed)) &&
    withoutLinks.length <= 72
  ) {
    return true;
  }
  return false;
}

/**
 * Validates a commit message string against unslop-commit and Conventional Commit standards.
 * @param {string} messageRaw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCommitMessage(messageRaw) {
  const errors = [];

  if (typeof messageRaw !== 'string') {
    return { valid: false, errors: ['Commit message must be a string'] };
  }

  // Split into lines, filter comment lines starting with # (standard git comments)
  const lines = messageRaw.split(/\r?\n/);
  const cleanLines = lines.filter((line) => !line.trimStart().startsWith('#'));

  // Trim leading and trailing blank lines
  while (cleanLines.length > 0 && cleanLines[0].trim() === '') {
    cleanLines.shift();
  }
  while (
    cleanLines.length > 0 &&
    cleanLines[cleanLines.length - 1].trim() === ''
  ) {
    cleanLines.pop();
  }

  if (cleanLines.length === 0) {
    return { valid: false, errors: ['Commit message cannot be empty'] };
  }

  const subject = cleanLines[0].trim();

  // Gracefully permit standard git automatic merge commits and reverts
  if (/^Merge\s+/.test(subject) || /^Revert\s+".+"/.test(subject)) {
    return { valid: true, errors: [] };
  }

  // 1. Subject line length check (<= 72 chars)
  if (subject.length > 72) {
    errors.push(`Subject line exceeds 72 characters (${subject.length} chars)`);
  }

  // 2. Trailing period check
  if (subject.endsWith('.')) {
    errors.push('Subject line must not end with a period');
  }

  // 3. Header format check: <type>(<optional-scope>)?: <summary> or <type>(<optional-scope>)!?: <summary>
  const headerRegex =
    /^(?<type>[a-zA-Z0-9_-]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?:\s(?<summary>.*)$/;
  const match = subject.match(headerRegex);

  if (!match) {
    errors.push(
      'Subject line must follow format "<type>(<optional-scope>): <summary>" or "<type>(<optional-scope>)!: <summary>"',
    );
  } else {
    const { type, scope, summary } = match.groups;

    if (!VALID_TYPES.includes(type)) {
      errors.push(
        `Invalid commit type "${type}". Valid types are: ${VALID_TYPES.join(', ')}`,
      );
    }

    if (scope !== undefined && scope.trim().length === 0) {
      errors.push('Scope must not be empty when parentheses are provided');
    }

    if (!summary || summary.trim().length === 0) {
      errors.push('Commit summary must not be empty');
    } else {
      // Summary must start with lowercase letter or digit
      if (!/^[a-z0-9]/.test(summary)) {
        errors.push(
          'Commit summary must start with a lowercase letter or digit',
        );
      }

      // Imperative mood check: reject leading non-imperative words
      const firstWordMatch = summary.trim().match(/^([a-zA-Z0-9_-]+)/);
      if (firstWordMatch) {
        const firstWord = firstWordMatch[1].toLowerCase();
        if (NON_IMPERATIVE_WORDS.includes(firstWord)) {
          errors.push(
            `Subject summary must use imperative mood; leading word "${firstWord}" is prohibited (e.g. use "add", "fix", "update", "remove")`,
          );
        }
      }
    }
  }

  // Full clean text for slop, template, and filler checks
  const fullText = cleanLines.join('\n');

  // 4. Slop check: reject banned marketing/AI buzzwords anywhere in the message
  for (const slopWord of BANNED_SLOP_WORDS) {
    const regex = new RegExp(`\\b${slopWord}\\b`, 'i');
    if (regex.test(fullText)) {
      errors.push(`Prohibited marketing/AI buzzword found: "${slopWord}"`);
    }
  }

  // 5. Template check: reject template phrases anywhere in the message
  for (const phrase of TEMPLATE_PHRASES) {
    const phrasePattern = phrase.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${phrasePattern}\\b`, 'i');
    if (regex.test(fullText)) {
      errors.push(`Prohibited template phrase found: "${phrase}"`);
    }
  }

  // 6. Filler check: reject filler adverbs anywhere in the message
  for (const filler of FILLER_ADVERBS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'i');
    if (regex.test(fullText)) {
      errors.push(`Prohibited filler adverb found: "${filler}"`);
    }
  }

  // 7. Body line check: if body lines exist, each line <= 72 characters unless URL or markdown link
  if (cleanLines.length > 1) {
    const bodyLines = cleanLines.slice(1);
    for (let i = 0; i < bodyLines.length; i++) {
      const bodyLine = bodyLines[i];
      if (bodyLine.length > 72 && !isExemptBodyLine(bodyLine)) {
        errors.push(
          `Body line ${i + 2} exceeds 72 characters (${bodyLine.length} chars)`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// CLI Execution Support
const isDirectCli = () => {
  if (!process.argv[1]) return false;
  try {
    return (
      fs.realpathSync(fileURLToPath(import.meta.url)) ===
      fs.realpathSync(path.resolve(process.argv[1]))
    );
  } catch {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  }
};

if (isDirectCli()) {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write(
      'Error: Commit message file path argument is required.\n' +
        'Usage: node scripts/validate-commit-msg.mjs <commit_msg_file>\n',
    );
    process.exit(1);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    process.stderr.write(
      `Error reading commit message file "${filePath}": ${err.message}\n`,
    );
    process.exit(1);
  }

  const result = validateCommitMessage(content);
  if (!result.valid) {
    process.stderr.write(
      '❌ Commit message rejected by unslop-commit standard:\n',
    );
    for (const err of result.errors) {
      process.stderr.write(`  - ${err}\n`);
    }
    process.stderr.write(
      '\nRefer to .agents/rules/unslop-commit.md for guidelines.\n',
    );
    process.exit(1);
  }

  process.exit(0);
}
