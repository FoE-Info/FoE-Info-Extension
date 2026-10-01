import assert from 'node:assert/strict';
import test from 'node:test';

const combatToggles = await import('../../src/js/fn/combatGbToggles.mjs');
const { setCollapse } = await import('../../src/js/fn/collapseState.mjs');

test('combatGbToggles unit test suite', async (t) => {
  await t.test(
    'exports all 16 combat/GB panel toggles as callable functions',
    () => {
      const toggles = [
        combatToggles.fCollapseGBInfo,
        combatToggles.fCollapseArmy,
        combatToggles.fCollapseRewards,
        combatToggles.fCollapseGBDonors,
        combatToggles.fCollapseInvested,
        combatToggles.fCollapseDonation,
        combatToggles.fCollapseBattleground,
        combatToggles.fCollapseBuildingCost,
        combatToggles.fCollapseExpedition,
        combatToggles.fCollapseTreasury,
        combatToggles.fCollapseTreasuryLog,
        combatToggles.fCollapseTarget,
        combatToggles.fCollapseTargetGen,
        combatToggles.fCollapseGBGLeaderboard,
        combatToggles.fCollapseQIContributions,
        combatToggles.fCollapseQILeaderboard,
      ];

      for (const fn of toggles) {
        assert.equal(typeof fn, 'function');
      }
    },
  );

  await t.test('fCollapseBattleground executes toggle runner', () => {
    setCollapse('collapseBattleground', false);
    combatToggles.fCollapseBattleground();
    // Toggle back
    combatToggles.fCollapseBattleground();
  });
});
