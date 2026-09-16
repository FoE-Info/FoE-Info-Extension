import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import statePkg from '../../src/js/state/GbDonationState.js';

const { GbDonationState } = statePkg;
const root = process.cwd();

test('GbDonationState exposes reward notifications only', () => {
  assert.equal(GbDonationState.prototype.setDonationPanel, undefined);
  assert.equal(GbDonationState.prototype.getDonationPanel, undefined);
});

test('legacy Great Building donation renderer is absent', () => {
  assert.equal(
    fs.existsSync(path.join(root, 'src/js/ui/renderGbDonationLegacy.js')),
    false,
  );
});
