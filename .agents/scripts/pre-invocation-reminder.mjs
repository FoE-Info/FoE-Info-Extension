#!/usr/bin/env node

/**
 * PreInvocation Hook
 * Injects transient guardrail reminder for invariants across Forge of Empires extensions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON_PATH = path.resolve(SCRIPT_DIR, '../../package.json');

let displayName = 'FoE-Info Extension';
try {
  if (fs.existsSync(PACKAGE_JSON_PATH)) {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    displayName = pkg.displayName || displayName;
  }
} catch {
  // fallback to default
}

process.stdin.resume();
process.stdin.on('end', () => {
  const prefixName = displayName.replace(/\s+Extension$/i, '');
  const response = {
    injectSteps: [
      {
        ephemeralMessage: `${prefixName} Guardrail Reminder: Default to direct execution as main agent; delegate only when an isolated domain specialist (FoE mechanics, Graphify exploration, browser observation & QA) or parallel review is required. Keep slices <= 100 lines and files <= 600 lines, verify with fresh evidence before completion, and never bundle static game metadata into runtime source code.`,
      },
    ],
  };
  process.stdout.write(JSON.stringify(response));
});
