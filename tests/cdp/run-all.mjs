#!/usr/bin/env node

/**
 * CDP Test Suite Runner
 * Sequentially executes all live Chromium CDP integration tests in tests/cdp/.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = ['panel-popovers.mjs', 'devtools-reload.mjs'];

async function runTest(file) {
  const filePath = path.join(__dirname, file);
  console.log(`\n========================================`);
  console.log(`[CDP Suite] Running ${file}...`);
  console.log(`========================================`);

  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [filePath], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });

    proc.on('close', (code) => {
      resolve({ file, success: code === 0, code });
    });
  });
}

async function main() {
  console.log('[CDP Suite] Starting Live Browser CDP Tests on port 9222...');
  const results = [];

  for (const file of testFiles) {
    const res = await runTest(file);
    results.push(res);
    if (!res.success) {
      console.error(
        `\n[CDP Suite] ✖ ${file} failed with exit code ${res.code}`,
      );
    } else {
      console.log(`[CDP Suite] ✔ ${file} passed!`);
    }
  }

  console.log('\n========================================');
  console.log('[CDP Suite] Summary:');
  const allPassed = results.every((r) => r.success);
  for (const r of results) {
    console.log(`  ${r.success ? '✔' : '✖'} ${r.file}`);
  }
  console.log('========================================');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[CDP Suite] Fatal error:', err);
  process.exit(1);
});
