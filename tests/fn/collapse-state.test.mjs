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

const state = await import('../../src/js/fn/collapseState.js');
const { setCollapse } = state;

test('collapseState unit test suite', async (t) => {
  await t.test('initializes default values correctly', () => {
    assert.equal(state.collapseFriends, true);
    assert.equal(state.collapseGuild, true);
    assert.equal(state.collapseHood, true);
    assert.equal(state.collapseIncidents, true);
    assert.equal(state.collapseArmy, false);
    assert.equal(state.collapseGoods, true);
    assert.equal(state.collapseStats, false);
    assert.equal(state.collapseGBInfo, false);
    assert.equal(state.collapseGBRewards, false);
    assert.equal(state.collapseGBDonors, false);
    assert.equal(state.collapseGBinvest, false);
    assert.equal(state.collapseInvested, false);
    assert.equal(state.collapseDonation, false);
    assert.equal(state.collapseBattleground, false);
    assert.equal(state.collapseBuildingCost, true);
    assert.equal(state.collapseExpedition, false);
    assert.equal(state.collapseTreasury, true);
    assert.equal(state.collapseTreasuryLog, true);
    assert.equal(state.collapseGalaxy, false);
    assert.equal(state.collapseTarget, false);
    assert.equal(state.collapseTargetGen, false);
    assert.equal(state.collapseBuildings, false);
    assert.equal(state.collapseLists, false);
    assert.equal(state.collapseRewards, false);
    assert.equal(state.collapseBonus, true);
    assert.equal(state.collapseCultural, true);
    assert.equal(state.collapseClipboard, true);
    assert.equal(state.collapseGBGLeaderboard, false);
    assert.equal(state.collapseQIContributions, false);
    assert.equal(state.collapseQILeaderboard, false);
  });

  await t.test(
    'setCollapse updates state and reflects across live bindings',
    () => {
      setCollapse('collapseGoods', false);
      assert.equal(state.collapseGoods, false);
      setCollapse('collapseGoods', true);
      assert.equal(state.collapseGoods, true);

      setCollapse('collapseArmy', true);
      assert.equal(state.collapseArmy, true);
      setCollapse('collapseArmy', false);
      assert.equal(state.collapseArmy, false);
    },
  );

  await t.test('setCollapse handles unrecognized keys gracefully', () => {
    assert.doesNotThrow(() => {
      setCollapse('nonExistentCollapseKey', true);
    });
  });
});
