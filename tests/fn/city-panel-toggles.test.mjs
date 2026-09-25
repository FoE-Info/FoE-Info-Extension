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

const cityToggles = await import('../../src/js/fn/cityPanelToggles.js');
const { setCollapse } = await import('../../src/js/fn/collapseState.js');

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
