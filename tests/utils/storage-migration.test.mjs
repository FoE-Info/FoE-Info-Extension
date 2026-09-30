import assert from 'node:assert/strict';
import test from 'node:test';
import migration from '../../src/js/utils/storageMigration.js';

const { migrateLegacyStorage } = migration;

test('failed migration retains legacy settings and can be retried', async () => {
  const saved = { donationPercent: 195, collapseGBInfo: true };
  let rejectWrite = true;
  let removals = 0;
  const local = {
    async set(values) {
      if (rejectWrite) throw new Error('quota');
      Object.assign(saved, values);
    },
    async remove(keys) {
      removals++;
      for (const key of keys) delete saved[key];
    },
  };
  await assert.rejects(migrateLegacyStorage(saved, local), /quota/);
  assert.equal(removals, 0);
  assert.equal(saved.donationPercent, 195);
  assert.equal(saved['global:settings'], undefined);
  rejectWrite = false;
  const result = await migrateLegacyStorage(saved, local);
  assert.equal(result.migratedWorld.donation.percent, 195);
  assert.equal(result.migratedWorld.collapses.collapseGBInfo, true);
  assert.equal(saved.donationPercent, undefined);
  assert.equal(saved['world:en7'].donation.percent, 195);
  assert.equal(await migrateLegacyStorage(saved, local), null);
});

test('cleanup failure preserves successfully migrated values', async () => {
  const saved = { donationPercent: 195 };
  const result = await migrateLegacyStorage(saved, {
    async set(values) {
      Object.assign(saved, values);
    },
    async remove() {
      throw new Error('cleanup unavailable');
    },
  });
  assert.equal(result.migratedWorld.donation.percent, 195);
  assert.equal(saved['world:en7'].donation.percent, 195);
  assert.equal(saved.donationPercent, 195);
});
