#!/usr/bin/env node
/** Plain verification uses the same stage registry as evidence capture. */
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runValidation } from './lib/validation-runner.mjs';

export function parseProfile(args) {
  if (!args.length) return 'full';
  if (
    args.length === 2 &&
    args[0] === '--profile' &&
    ['docs', 'static', 'full'].includes(args[1])
  )
    return args[1];
  throw new Error('Use --profile docs|static|full.');
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await runValidation({
      root: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
      profile: parseProfile(process.argv.slice(2)),
    });
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
