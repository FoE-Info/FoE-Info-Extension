import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// GuildBattlegroundService.js uses ESM syntax but lives in a CommonJS package.
// Register a synchronous loader hook so the mixed src/js module graph can be
// imported in Node, and stub browser-only packages that have no Node runtime.
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

const service = await import('../../src/js/msg/GuildBattlegroundService.js');
const { GBGdata, BattlegroundPerformance } =
  await import('../../src/js/state/state.js');
const { showOptions } = await import('../../src/js/state/showOptions.js');

showOptions.showBattleground = false;

const malformedPayloads = [
  null,
  undefined,
  {},
  { responseData: null },
  { responseData: {} },
];

test('GuildBattlegroundService partial RPC payload guards', async (t) => {
  await t.test(
    'getBattleground tolerates partial, empty, and null payloads',
    () => {
      const payloads = [
        ...malformedPayloads,
        { responseData: { map: {} } },
        { responseData: { map: { id: null, provinces: 'not-an-array' } } },
        {
          responseData: {
            map: { id: 'volcano_1', provinces: [null, undefined, { id: 5 }] },
          },
        },
      ];

      for (const payload of payloads) {
        assert.doesNotThrow(
          () => service.getBattleground(payload),
          `getBattleground must not throw for payload ${JSON.stringify(payload)}`,
        );
      }
    },
  );

  await t.test('getState tolerates partial, empty, and null payloads', () => {
    const payloads = [
      ...malformedPayloads,
      { responseData: { stateId: 'subscribed' } },
      {
        responseData: {
          stateId: 'subscribed',
          playerLeaderboardEntries: [null, {}, { player: null }],
        },
      },
      {
        responseData: { stateId: 'subscribed', playerLeaderboardEntries: 'x' },
      },
    ];

    for (const payload of payloads) {
      assert.doesNotThrow(
        () => service.getState(payload),
        `getState must not throw for payload ${JSON.stringify(payload)}`,
      );
    }
  });

  await t.test(
    'getPlayerLeaderboard tolerates partial, empty, and null payloads',
    () => {
      const payloads = [
        ...malformedPayloads,
        { responseData: [] },
        { responseData: [null, {}, { player: null }] },
      ];

      for (const payload of payloads) {
        assert.doesNotThrow(
          () => service.getPlayerLeaderboard(payload),
          `getPlayerLeaderboard must not throw for payload ${JSON.stringify(payload)}`,
        );
      }
    },
  );

  await t.test(
    'malformed entries fall back to Unknown instead of aborting parsing',
    () => {
      service.getPlayerLeaderboard({
        responseData: [null, { player: {} }],
      });
      assert.deepEqual(
        GBGdata.map((entry) => entry.name),
        ['Unknown', 'Unknown'],
      );
      assert.deepEqual(
        BattlegroundPerformance.map((entry) => entry.name),
        ['Unknown', 'Unknown'],
      );

      service.getState({
        responseData: {
          stateId: 'subscribed',
          playerLeaderboardEntries: [null, { player: {} }],
        },
      });
      assert.deepEqual(
        GBGdata.map((entry) => entry.name),
        ['Unknown', 'Unknown'],
      );
    },
  );
});
