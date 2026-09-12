import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/TreasuryState.js';
import bindingPkg from '../../src/js/ui/treasuryRenderBinding.js';

const { TreasuryState } = statePkg;
const { bindTreasuryPanel } = bindingPkg;

test('treasuryRenderBinding - reactive channel routing', async (t) => {
  await t.test('repaints reserves and logs independently', () => {
    const state = new TreasuryState();
    const calls = [];
    const off = bindTreasuryPanel(state, {
      renderReserves: (reserves) => calls.push(['reserves', reserves]),
      renderLogs: (logs, totals, options) =>
        calls.push(['logs', logs.length, options.showTreasury]),
    });

    const reserves = new Map([['wood', 10]]);
    state.setReserves(reserves);
    state.setLogs(
      [{ action: 'donate' }],
      { totalLogCount: 1 },
      {
        showTreasury: true,
      },
    );
    off();

    state.setReserves(new Map());

    assert.deepEqual(calls, [
      ['reserves', reserves],
      ['logs', 1, true],
    ]);
  });

  await t.test('skips reserves render until reserves exist', () => {
    const state = new TreasuryState();
    const calls = [];
    bindTreasuryPanel(state, {
      renderReserves: () => calls.push('reserves'),
      renderLogs: () => calls.push('logs'),
    });

    state.setReserves(null);
    state.setLogs([], {}, {});

    assert.deepEqual(calls, ['logs']);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindTreasuryPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
