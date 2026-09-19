import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

test('StartupService.renderLiveCityStats guards against premature render before startupContext', () => {
  const startupPath = path.resolve('src/js/msg/StartupService.js');
  const content = fs.readFileSync(startupPath, 'utf8');

  assert.ok(
    content.includes('export function renderLiveCityStats(ctx) {'),
    'StartupService must export renderLiveCityStats',
  );
  assert.ok(
    content.includes(
      'const startupContext = ctx?.lastStartupContext || lastStartupContext;',
    ),
    'renderLiveCityStats must inspect available startupContext',
  );
  assert.ok(
    content.includes('if (!startupContext && !ctx?.force && !lastStartupMsg)'),
    'renderLiveCityStats must guard against publishing when no startup message or context has arrived',
  );
});
