#!/usr/bin/env node
/** Run the extension checks in order and preserve any failing exit status. */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const stages = [
  'version:check',
  'audit:refs:published',
  'check',
  'lint',
  'typecheck',
  'contracts:audit',
  'rpc:contract:check',
  'i18n:check',
  'test',
  'test:coverage',
  'build:dev',
  'check:bundle-budget',
];
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  for (const stage of stages) {
    console.log(`\nVerify: ${stage}`);
    const result = spawnSync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', stage],
      { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
    );
    if (result.error) console.error(result.error.message);
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
}
