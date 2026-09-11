#!/usr/bin/env node

/**
 * i18n Translation Dictionary Parity Auditor
 * Audits all src/i18n/*.json dictionaries against the canonical en.json.
 *
 * Usage:
 *   node scripts/audit-i18n.mjs        # Check parity and report missing keys
 *   node scripts/audit-i18n.mjs --fix  # Backfill missing keys from en.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const I18N_DIR = path.resolve(__dirname, '../src/i18n');
const CANONICAL_FILE = 'en.json';

const shouldFix = process.argv.includes('--fix');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function runAudit() {
  const canonicalPath = path.join(I18N_DIR, CANONICAL_FILE);
  if (!fs.existsSync(canonicalPath)) {
    console.error(`Error: Canonical file not found at ${canonicalPath}`);
    process.exit(1);
  }

  const canonicalDict = loadJson(canonicalPath);
  const canonicalKeys = Object.keys(canonicalDict).filter(
    (k) => k !== '@metadata',
  );

  const files = fs
    .readdirSync(I18N_DIR)
    .filter((f) => f.endsWith('.json') && f !== CANONICAL_FILE);

  console.log(
    `[i18n-audit] Canonical source: ${CANONICAL_FILE} (${canonicalKeys.length} keys)\n`,
  );

  let hasDisparity = false;
  const reports = [];

  for (const file of files) {
    const filePath = path.join(I18N_DIR, file);
    const dict = loadJson(filePath);
    const dictKeys = new Set(
      Object.keys(dict).filter((k) => k !== '@metadata'),
    );

    const missingKeys = canonicalKeys.filter((k) => !dictKeys.has(k));
    const extraKeys = Array.from(dictKeys).filter(
      (k) => !canonicalKeys.includes(k),
    );

    reports.push({
      file,
      total: dictKeys.size,
      missing: missingKeys,
      extra: extraKeys,
    });

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      hasDisparity = true;
    }

    if (shouldFix && missingKeys.length > 0) {
      for (const k of missingKeys) {
        dict[k] = canonicalDict[k];
      }
      saveJson(filePath, dict);
      console.log(
        `[i18n-audit] Fixed ${file}: Backfilled ${missingKeys.length} missing keys.`,
      );
    }
  }

  console.log('Locale Report:');
  console.log('--------------------------------------------------');
  for (const r of reports) {
    const status =
      r.missing.length === 0 ?
        '✓ 100% complete'
      : `✗ Missing ${r.missing.length} keys`;
    console.log(
      `${r.file.padEnd(12)}: ${String(r.total).padStart(2)} keys | ${status}`,
    );
    if (r.missing.length > 0 && !shouldFix) {
      console.log(`   Missing: ${r.missing.join(', ')}`);
    }
    if (r.extra.length > 0) {
      console.log(`   Extra (not in en.json): ${r.extra.join(', ')}`);
    }
  }
  console.log('--------------------------------------------------');

  if (hasDisparity && !shouldFix) {
    console.log(
      '\nNotice: Disparities found across translation dictionaries.\nRun `npm run i18n:fix` to automatically backfill missing keys.',
    );
    process.exit(1);
  } else {
    console.log(
      '\nAll checked translation dictionaries are in full key parity!',
    );
  }
}

runAudit();
