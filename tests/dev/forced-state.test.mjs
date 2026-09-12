import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fixturesDir = path.join(root, 'tests/fixtures');
const forcedDir = path.join(fixturesDir, 'forced');

const rewardModule = await import('../../src/js/ui/rewardCategories.js');
const { resolveBucketKey } = rewardModule.default || rewardModule;

function readJson(file) {
  return JSON.parse(readFileSync(path.join(forcedDir, file), 'utf8'));
}

test('forced-state panel config is well formed', () => {
  const config = readJson('panels.json');
  assert.equal(typeof config.galaxy, 'boolean');
  assert.equal(typeof config.rewards, 'boolean');
  assert.equal(typeof config.galaxyCharges, 'number');
  assert.ok(existsSync(path.join(fixturesDir, config.galaxyFixture)));
  assert.ok(existsSync(path.join(forcedDir, config.rewardsFixture)));
});

test('forced reward template routes through known reward sources', () => {
  const template = readJson('rewards.json');
  assert.ok(Array.isArray(template));
  assert.ok(template.length > 0);
  for (const entry of template) {
    assert.equal(typeof entry.source, 'string');
    assert.equal(
      typeof resolveBucketKey(entry.source),
      'string',
      `unroutable forced reward source: ${entry.source}`,
    );
    assert.equal(typeof entry.payload, 'object');
  }
});
