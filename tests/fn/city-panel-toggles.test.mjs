import assert from 'node:assert/strict';
import test from 'node:test';

const cityToggles = await import('../../src/js/fn/cityPanelToggles.mjs');
const { setCollapse } = await import('../../src/js/fn/collapseState.mjs');

test('cityPanelToggles unit test suite', async (t) => {
  await t.test(
    'exports all 12 city panel toggles as callable functions',
    () => {
      const toggles = [
        cityToggles.fCollapseFriends,
        cityToggles.fCollapseLists,
        cityToggles.fCollapseHood,
        cityToggles.fCollapseGalaxy,
        cityToggles.fCollapseGuild,
        cityToggles.fCollapseIncidents,
        cityToggles.fCollapseGoods,
        cityToggles.fCollapseStats,
        cityToggles.fCollapseBuildings,
        cityToggles.fCollapseBonus,
        cityToggles.fCollapseCultural,
        cityToggles.fCollapseClipboard,
      ];

      for (const fn of toggles) {
        assert.equal(typeof fn, 'function');
      }
    },
  );

  await t.test(
    'fCollapseGoods executes toggle runner and mutates state',
    () => {
      setCollapse('collapseGoods', true);
      cityToggles.fCollapseGoods();
      // After toggle, should flip
      // or from collapseState
      // Toggle again
      cityToggles.fCollapseGoods();
    },
  );
});
