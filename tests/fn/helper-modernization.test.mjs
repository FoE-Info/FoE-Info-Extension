import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// helper.js uses ESM syntax but lives in a CommonJS package. Register a
// synchronous loader hook so the mixed src/js module graph can be imported in
// Node, and stub browser-only packages that have no Node runtime.
function dataModule(source) {
  return 'data:text/javascript,' + encodeURIComponent(source);
}

const MODULE_STUBS = {
  bootstrap: dataModule(
    'export class Alert {}\nexport class Popover {}\nexport class Tooltip {}\nexport default { Alert, Popover, Tooltip };\n',
  ),
  'webextension-polyfill': dataModule(
    'export default { storage: { local: { get: async () => ({}), set: async () => {} }, onChanged: { addListener() {} } } };\n',
  ),
};

function isEsmSource(source) {
  return /^\s*(?:import|export)\s/m.test(source);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (MODULE_STUBS[specifier]) {
      return { url: MODULE_STUBS[specifier], shortCircuit: true };
    }
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

function noop() {}
function createMockElement() {
  return {
    id: '',
    innerHTML: '',
    innerText: '',
    style: {},
    classList: { add: noop, remove: noop, contains: () => false },
    appendChild: noop,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    focus: noop,
    remove: noop,
  };
}

globalThis.document = {
  readyState: 'complete',
  body: createMockElement(),
  head: createMockElement(),
  documentElement: createMockElement(),
  getElementById: () => null,
  createElement: createMockElement,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
};
globalThis.window = globalThis;
globalThis.addEventListener = noop;
globalThis.removeEventListener = noop;
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.location = { href: 'https://en7.forgeofempires.com/game/index' };

const helperUrl = new URL('../../src/js/fn/helper.js', import.meta.url);
const helperSource = readFileSync(helperUrl, 'utf8');
const helper = await import(helperUrl.href);
const formatters = await import('../../src/js/utils/formatters.js');
const renderer = await import('../../src/js/ui/renderBattlegroundsPanel.js');

test('helper.js re-exports the pure formatters with identity parity', () => {
  for (const name of ['fRound', 'fNumber', 'fFormatNumber', 'fAgestring']) {
    assert.equal(typeof helper[name], 'function', `${name} must be exported`);
    assert.strictEqual(
      helper[name],
      formatters[name],
      `${name} must be the same reference as formatters.js`,
    );
  }
});

test('helper.js re-exports the extracted GBG renderer functions', () => {
  assert.strictEqual(
    helper.fshowBattleground,
    renderer.fshowBattleground,
    'fshowBattleground must be the extracted renderer reference',
  );
  assert.strictEqual(
    helper.fshowBattlegroundChanges,
    renderer.fshowBattlegroundChanges,
    'fshowBattlegroundChanges must be the extracted renderer reference',
  );
});

test('legacy helper surface remains intact for existing callers', () => {
  const legacyFns = [
    'getCityEntityDef',
    'fEntityNameTrim',
    'fGoodsTally',
    'translateContainer',
    'checkGBG',
    'setMyGuildPermissions',
    'fGBname',
    'fGBsname',
    'fLevelfromAge',
    'fAgefromLevel',
    'fGVGagesname',
  ];
  for (const name of legacyFns) {
    assert.equal(
      typeof helper[name],
      'function',
      `${name} must remain exported as a function`,
    );
  }
});

test('helper.js stays under the 250-line modernization target', () => {
  const lines = (helperSource.match(/\n/g) || []).length;
  assert.ok(lines < 250, `helper.js should be < 250 lines, got ${lines}`);
});
