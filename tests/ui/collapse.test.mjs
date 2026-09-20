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

const collapse = await import('../../src/js/fn/collapse.js');
const setCollapse = collapse.default;

test('collapse.js Characterization Suite', async (t) => {
  await t.test('exports all default boolean state values accurately', () => {
    assert.equal(collapse.collapseFriends, true);
    assert.equal(collapse.collapseGuild, true);
    assert.equal(collapse.collapseHood, true);
    assert.equal(collapse.collapseIncidents, true);
    assert.equal(collapse.collapseArmy, false);
    assert.equal(collapse.collapseGoods, true);
    assert.equal(collapse.collapseStats, false);
    assert.equal(collapse.collapseGBInfo, false);
    assert.equal(collapse.collapseGBRewards, false);
    assert.equal(collapse.collapseGBDonors, false);
    assert.equal(collapse.collapseGBinvest, false);
    assert.equal(collapse.collapseInvested, false);
    assert.equal(collapse.collapseDonation, false);
    assert.equal(collapse.collapseBattleground, false);
    assert.equal(collapse.collapseBuildingCost, true);
    assert.equal(collapse.collapseExpedition, false);
    assert.equal(collapse.collapseTreasury, true);
    assert.equal(collapse.collapseTreasuryLog, true);
    assert.equal(collapse.collapseGalaxy, false);
    assert.equal(collapse.collapseTarget, false);
    assert.equal(collapse.collapseTargetGen, false);
    assert.equal(collapse.collapseBuildings, false);
    assert.equal(collapse.collapseLists, false);
    assert.equal(collapse.collapseRewards, false);
    assert.equal(collapse.collapseBonus, true);
    assert.equal(collapse.collapseCultural, true);
    assert.equal(collapse.collapseClipboard, true);
    assert.equal(collapse.collapseGBGLeaderboard, false);
    assert.equal(collapse.collapseQIContributions, false);
    assert.equal(collapse.collapseQILeaderboard, false);
  });

  await t.test('default export set() updates live state bindings', () => {
    const initialFriends = collapse.collapseFriends;
    setCollapse('collapseFriends', !initialFriends);
    assert.equal(collapse.collapseFriends, !initialFriends);

    // Reset back
    setCollapse('collapseFriends', initialFriends);
    assert.equal(collapse.collapseFriends, initialFriends);

    // Unknown key does not throw
    assert.doesNotThrow(() => setCollapse('unknownKey', true));
  });

  await t.test(
    'all 29 fCollapse toggles are defined as callable functions',
    () => {
      const toggles = [
        collapse.fCollapseGBInfo,
        collapse.fCollapseFriends,
        collapse.fCollapseLists,
        collapse.fCollapseHood,
        collapse.fCollapseGalaxy,
        collapse.fCollapseGuild,
        collapse.fCollapseIncidents,
        collapse.fCollapseArmy,
        collapse.fCollapseGoods,
        collapse.fCollapseStats,
        collapse.fCollapseRewards,
        collapse.fCollapseGBDonors,
        collapse.fCollapseInvested,
        collapse.fCollapseDonation,
        collapse.fCollapseBattleground,
        collapse.fCollapseBuildingCost,
        collapse.fCollapseBuildings,
        collapse.fCollapseExpedition,
        collapse.fCollapseTreasury,
        collapse.fCollapseTreasuryLog,
        collapse.fCollapseTarget,
        collapse.fCollapseTargetGen,
        collapse.fCollapseBonus,
        collapse.fCollapseCultural,
        collapse.fCollapseClipboard,
        collapse.fCollapseGBGLeaderboard,
        collapse.fCollapseQIContributions,
        collapse.fCollapseQILeaderboard,
      ];

      for (const toggle of toggles) {
        assert.equal(typeof toggle, 'function');
      }
    },
  );

  await t.test('fHideAllTooltips is exported and callable', () => {
    assert.equal(typeof collapse.fHideAllTooltips, 'function');
  });

  await t.test('toggling updates associated state variable', () => {
    const currentBonus = collapse.collapseBonus;
    collapse.fCollapseBonus();
    assert.equal(collapse.collapseBonus, !currentBonus);
    collapse.fCollapseBonus();
    assert.equal(collapse.collapseBonus, currentBonus);
  });

  await t.test('fCollapseArmy onToggle updates armyUnits element', () => {
    const prevDoc = globalThis.document;
    const armyUnits = { innerHTML: '' };
    const armyUnits2 = { innerHTML: '<span>Unit A</span>' };
    const armyUnits3 = { innerHTML: '<span>Unit B</span>' };

    globalThis.document = {
      getElementById: (id) => {
        if (id === 'armyUnits') return armyUnits;
        if (id === 'armyUnits2') return armyUnits2;
        if (id === 'armyUnits3') return armyUnits3;
        return null;
      },
      querySelectorAll: () => [],
    };

    try {
      setCollapse('collapseArmy', false);
      collapse.fCollapseArmy();
      assert.equal(collapse.collapseArmy, true);
      assert.equal(
        armyUnits.innerHTML,
        '<span>Unit A</span> <span>Unit B</span>',
      );

      collapse.fCollapseArmy();
      assert.equal(collapse.collapseArmy, false);
      assert.equal(armyUnits.innerHTML, '');
    } finally {
      globalThis.document = prevDoc;
    }
  });

  await t.test('fCollapseInvested onToggle updates onHandFP element', () => {
    const prevDoc = globalThis.document;
    const onHandEl = { innerHTML: '' };
    const availableFpEl = { innerHTML: '500 FP' };

    globalThis.document = {
      getElementById: (id) => {
        if (id === 'onHandFP') return onHandEl;
        if (id === 'availableFPID') return availableFpEl;
        return null;
      },
      querySelectorAll: () => [],
    };

    try {
      setCollapse('collapseInvested', false);
      collapse.fCollapseInvested();
      assert.equal(collapse.collapseInvested, true);
      assert.match(onHandEl.innerHTML, /Available FP/);
      assert.match(onHandEl.innerHTML, /500 FP/);

      collapse.fCollapseInvested();
      assert.equal(collapse.collapseInvested, false);
      assert.equal(onHandEl.innerHTML, '');
    } finally {
      globalThis.document = prevDoc;
    }
  });
});
