import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GbDonationState.js';
import bindingPkg from '../../src/js/ui/gbDonationRenderBinding.js';

const { GbDonationState } = statePkg;
const { bindGbDonationPanels } = bindingPkg;

test('gbDonationRenderBinding - renders the published payloads', async (t) => {
  await t.test('forwards the donation payload to renderDonation', () => {
    const state = new GbDonationState();
    const calls = [];
    const off = bindGbDonationPanels(state, {
      renderDonation: (...args) => calls.push(args),
    });

    const payload = {
      containers: { donation2DIV: {} },
      gbData: { name: 'The Arc' },
      rankings: [{ rank: 1 }],
      showOptions: { showDonation: true },
    };
    state.setDonationPanel(payload);
    off();
    state.setDonationPanel({ gbData: { name: 'Other' } });

    assert.deepEqual(calls, [
      [
        payload.containers,
        payload.gbData,
        payload.rankings,
        payload.showOptions,
      ],
    ]);
  });

  await t.test('routes a unified reward through showReward', () => {
    const state = new GbDonationState();
    const calls = [];
    bindGbDonationPanels(state, {
      showReward: (...args) => calls.push(args),
    });

    const reward = {
      mode: 'unified',
      container: {},
      amount: 2,
      formattedName: 'The Arc',
      args: { name: 'The Arc', subType: 'The Arc', amount: 2 },
    };
    state.setReward(reward);

    assert.deepEqual(calls, [['greatBuilding', reward.args]]);
  });

  await t.test('routes a generic reward through renderReward', () => {
    const state = new GbDonationState();
    const calls = [];
    bindGbDonationPanels(state, {
      renderReward: (...args) => calls.push(args),
      showReward: () => {
        throw new Error('unified renderer must not run');
      },
    });

    const container = {};
    state.setReward({
      mode: 'generic',
      container,
      amount: 2,
      formattedName: 'The Arc BP',
      args: {},
    });

    assert.deepEqual(calls, [[container, 2, 'The Arc BP']]);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new GbDonationState();
    let called = false;
    bindGbDonationPanels(state, {
      renderDonation: () => {
        called = true;
      },
      renderReward: () => {
        called = true;
      },
      showReward: () => {
        called = true;
      },
    });

    state.setDonationPanel(null);
    state.setReward(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindGbDonationPanels(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
