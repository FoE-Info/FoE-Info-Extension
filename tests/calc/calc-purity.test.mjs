import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calcDir = fileURLToPath(new URL('../../src/js/calc/', import.meta.url));

const BANNED_PATTERNS = [
  { label: 'globalThis.', regex: /globalThis\./g },
  { label: 'window.', regex: /\bwindow\./g },
  { label: 'document.', regex: /\bdocument\./g },
  {
    label: '../msg/ import',
    regex: /['"`](?:\.\.\/)+msg\//g,
  },
];

function listCalcFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCalcFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function findViolations(files) {
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(process.cwd(), file);
    for (const { label, regex } of BANNED_PATTERNS) {
      regex.lastIndex = 0;
      let match = regex.exec(content);
      while (match !== null) {
        const line = content.slice(0, match.index).split('\n').length;
        violations.push(`${relative}:${line} [${label}] ${match[0]}`);
        match = regex.exec(content);
      }
    }
  }
  return violations;
}

describe('calc purity guard', () => {
  const files = listCalcFiles(calcDir);

  it('discovers calc source files to scan', () => {
    assert.ok(files.length > 0, `no files found under ${calcDir}`);
  });

  it('has no globalThis/window/document references or msg imports', () => {
    const violations = findViolations(files);
    assert.deepEqual(
      violations,
      [],
      `calc purity violations:\n${violations.join('\n')}`,
    );
  });
});
