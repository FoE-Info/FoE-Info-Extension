import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/BonusState.js';
import bindingPkg from '../../src/js/ui/bonusRenderBinding.js';

const { BonusState } = statePkg;
const { bindBonusPanel } = bindingPkg;

test('bonusRenderBinding - replays bonus state to the panel', async (t) => {
  await t.test('renders summary then updates each amount span', () => {
    const state = new BonusState();
    const calls = [];
    const off = bindBonusPanel(state, {
      renderSummary: (html, summary) => calls.push(['summary', html, summary]),
      updateAmount: (id, amount) => calls.push(['amount', id, amount]),
      updateDailyFp: (total) => calls.push(['daily', total]),
    });

    state.setSummary({
      bonusHTML: 'Spoils',
      aid: 1,
      spoils: 2,
      diplomatic: 3,
      strike: 4,
      dailyForgePoints: 12,
    });
    off();

    assert.deepEqual(calls, [
      ['summary', 'Spoils', { aid: 1, spoils: 2, diplomatic: 3, strike: 4 }],
      ['amount', 'spoilsID', 2],
      ['amount', 'diplomaticID', 3],
      ['amount', 'firststrikeID', 4],
      ['amount', 'aidID', 1],
      ['daily', 12],
    ]);
  });

  await t.test('skips daily fp when not present', () => {
    const state = new BonusState();
    const calls = [];
    bindBonusPanel(state, {
      renderSummary: () => calls.push('summary'),
      updateAmount: () => {},
      updateDailyFp: () => calls.push('daily'),
    });

    state.setSummary({ spoils: 5 });

    assert.deepEqual(calls, ['summary']);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindBonusPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
