import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GreatBuildingsState.js';
import bindingPkg from '../../src/js/ui/greatBuildingsRenderBinding.js';

const { GreatBuildingsState } = statePkg;
const { bindGreatBuildingsPanels } = bindingPkg;

test('greatBuildingsRenderBinding - renders the published payloads', async (t) => {
  await t.test('forwards the donors payload to renderDonors', () => {
    const state = new GreatBuildingsState();
    const calls = [];
    const off = bindGreatBuildingsPanels(state, {
      renderDonors: (payload) => calls.push(payload),
    });

    const payload = { GBselected: { name: 'The Arc' }, rankings: [] };
    state.setDonors(payload);
    off();
    state.setDonors({ GBselected: { name: 'Other' } });

    assert.deepEqual(calls, [payload]);
  });

  await t.test('forwards the info payload to renderInfo', () => {
    const state = new GreatBuildingsState();
    const calls = [];
    const off = bindGreatBuildingsPanels(state, {
      renderInfo: (...args) => calls.push(args),
    });

    const payload = {
      targetEl: { id: 'gbInfo' },
      gbData: { name: 'The Arc' },
      playerName: 'PlayerOne',
      showOptions: { showGBInfo: true },
    };
    state.setInfo(payload);
    off();
    state.setInfo({ gbData: { name: 'Other' } });

    assert.deepEqual(calls, [
      [
        payload.targetEl,
        payload.gbData,
        payload.playerName,
        payload.showOptions,
      ],
    ]);
  });

  await t.test('forwards the donation payload to renderDonation', () => {
    const state = new GreatBuildingsState();
    const calls = [];
    const off = bindGreatBuildingsPanels(state, {
      renderDonation: (payload) => calls.push(payload),
    });

    const payload = { GBselected: { name: 'The Arc' }, donationDIV: {} };
    state.setDonation(payload);
    off();
    state.setDonation({ GBselected: { name: 'Other' } });

    assert.deepEqual(calls, [payload]);
  });

  await t.test('renders in publish order: donors, info, donation', () => {
    const state = new GreatBuildingsState();
    const order = [];
    bindGreatBuildingsPanels(state, {
      renderDonors: () => order.push('donors'),
      renderInfo: () => order.push('info'),
      renderDonation: () => order.push('donation'),
    });

    state.setDonors({ rankings: [] });
    state.setInfo({ gbData: {} });
    state.setDonation({ GBselected: {} });

    assert.deepEqual(order, ['donors', 'info', 'donation']);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new GreatBuildingsState();
    let called = false;
    bindGreatBuildingsPanels(state, {
      renderDonors: () => {
        called = true;
      },
      renderInfo: () => {
        called = true;
      },
      renderDonation: () => {
        called = true;
      },
    });

    state.setDonors(null);
    state.setInfo(null);
    state.setDonation(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindGreatBuildingsPanels(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
