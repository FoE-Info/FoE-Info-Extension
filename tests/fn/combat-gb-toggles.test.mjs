import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

function isEsmSource(source) {
  return /^\s*(?:import|export)\s/m.test(source);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && context.parentURL) {
        const parentDir = dirname(fileURLToPath(context.parentURL));
        for (const candidate of ['', '.js', '.mjs', '/index.js']) {
          const resolved = resolvePath(parentDir, specifier + candidate);
          try {
            readFileSync(resolved);
            return { url: pathToFileURL(resolved).href, shortCircuit: true };
          } catch {}
        }
      }
      throw err;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.js') && url.includes('/src/js/')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      if (isEsmSource(source)) {
        return { format: 'module', source, shortCircuit: true };
      }
    }
    return nextLoad(url, context);
  },
});

const combatToggles = await import('../../src/js/fn/combatGbToggles.js');
const { collapseBattleground, setCollapse } =
  await import('../../src/js/fn/collapseState.js');

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
