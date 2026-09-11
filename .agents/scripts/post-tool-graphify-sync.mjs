#!/usr/bin/env node

/**
 * PostToolUse Graphify Sync Hook
 * Adheres strictly to the Antigravity PostToolUse contract (stdout: {}).
 * Performs fast AST updates when relevant source code files are edited.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

export function affectsAst(targetFile) {
  if (!targetFile || typeof targetFile !== 'string') return false;
  return (
    (/(^|[/\\])src[/\\]/i.test(targetFile) &&
      /\.(js|mjs|cjs|html|css|scss)$/i.test(targetFile)) ||
    /(^|[/\\])webpack\..*\.js$/i.test(targetFile)
  );
}

export function extractTargetFile(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const args = payload.toolCall?.args || payload.args || {};
  return (
    args.TargetFile ||
    args.targetFile ||
    args.target_file ||
    args.FilePath ||
    args.filePath ||
    args.path ||
    ''
  );
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
      if (payload.error) {
        return;
      }

      const targetFile = extractTargetFile(payload);

      if (affectsAst(targetFile)) {
        execSync('npm run graph:foe-info:ast', {
          cwd: projectRoot,
          stdio: 'ignore',
          timeout: 5000,
        });
      }
    } catch (err) {
      if (process.env.DEBUG_HOOKS) {
        process.stderr.write(
          `[post-tool-graphify-sync] ${err?.message || err}\n`,
        );
      }
    } finally {
      process.stdout.write('{}');
    }
  });
}

