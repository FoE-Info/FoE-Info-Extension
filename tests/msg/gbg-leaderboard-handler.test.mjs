import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

function dataModule(source) {
  return 'data:text/javascript,' + encodeURIComponent(source);
}

const MODULE_STUBS = {
  bootstrap: dataModule(
    'export class Alert {}\nexport class Popover {}\nexport class Tooltip {}\nexport default { Alert, Popover, Tooltip };\n',
  ),
  'webextension-polyfill': dataModule(
    'export default { storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} }, onChanged: { addListener() {} } } };\n',
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

const { handleBattlegroundState, handleLeaderboard, handlePlayerLeaderboard } =
  await import('../../src/js/msg/GbgLeaderboardHandler.js');
const { guildBattlegroundState } =
  await import('../../src/js/state/GuildBattlegroundState.js');
const { showOptions } = await import('../../src/js/state/showOptions.js');
const { BattlegroundPerformance, GBGdata, GuildMembers } =
  await import('../../src/js/state/state.js');

describe('GbgLeaderboardHandler Suite', () => {
  beforeEach(() => {
    BattlegroundPerformance.length = 0;
    GBGdata.length = 0;
    GuildMembers.length = 0;
    showOptions.showBattleground = false;
  });

  describe('handlePlayerLeaderboard', () => {
    it('populates GBGdata and BattlegroundPerformance correctly', () => {
      const msg = {
        responseData: [
          {
            player: { name: 'Player1' },
            negotiationsWon: 10,
            battlesWon: 25,
            attrition: 15,
          },
          {
            player: { name: 'Player2' },
            negotiationsWon: 0,
            battlesWon: 5,
            attrition: 2,
          },
        ],
      };

      handlePlayerLeaderboard(msg);

      assert.equal(GBGdata.length, 2);
      assert.deepEqual(GBGdata[0], { name: 'Player1', total: 45 }); // 10*2 + 25
      assert.deepEqual(GBGdata[1], { name: 'Player2', total: 5 }); // 0*2 + 5

      assert.equal(BattlegroundPerformance.length, 2);
      assert.deepEqual(BattlegroundPerformance[0], {
        name: 'Player1',
        wonNegotiations: 10,
        wonBattles: 25,
        attrition: 15,
      });
    });

    it('falls back to "Unknown" when player name is missing', () => {
      const msg = {
        responseData: [{ negotiationsWon: 2, battlesWon: 3, attrition: 1 }],
      };

      handlePlayerLeaderboard(msg);

      assert.equal(GBGdata[0].name, 'Unknown');
      assert.equal(BattlegroundPerformance[0].name, 'Unknown');
      assert.equal(GBGdata[0].total, 7); // 2*2 + 3
    });

    it('gracefully handles empty or malformed payload', () => {
      assert.doesNotThrow(() => handlePlayerLeaderboard(null));
      assert.doesNotThrow(() => handlePlayerLeaderboard({}));
      assert.doesNotThrow(() =>
        handlePlayerLeaderboard({ responseData: null }),
      );
      assert.equal(GBGdata.length, 0);
      assert.equal(BattlegroundPerformance.length, 0);
    });

    it('uses explicitly provided state object and triggers onPerformanceUpdated when showBattleground is true', async () => {
      const customPerformance = [];
      const customGBGdata = [];
      const customMembers = [
        { name: 'ExistingMember', wonNegotiations: 1, wonBattles: 2 },
      ];
      let updatedPerformance = null;
      let updatedOrigin = null;
      let bgTimeSet = null;

      const mockStorage = {
        get: async () => ({
          'https://en7.forgeofempires.com': [
            { name: 'OldMember', wonNegotiations: 0, wonBattles: 0 },
          ],
          'https://en7.forgeofempires.comBGtime': 1700000000,
        }),
        set: async () => {},
        remove: async () => {},
      };

      const msg = {
        responseData: [
          {
            player: { name: 'ActiveFighter' },
            negotiationsWon: 3,
            battlesWon: 7,
            attrition: 4,
          },
        ],
      };

      handlePlayerLeaderboard(msg, {
        state: {
          BattlegroundPerformance: customPerformance,
          GBGdata: customGBGdata,
          GuildMembers: customMembers,
          GameOrigin: 'https://en7.forgeofempires.com',
          EpocTime: 1700000500,
          setBGtime: (val) => {
            bgTimeSet = val;
          },
        },
        storageApi: mockStorage,
        showOptions: { showBattleground: true },
        onPerformanceUpdated: (perf, origin) => {
          updatedPerformance = perf;
          updatedOrigin = origin;
        },
      });

      // Allow storage promise microtask to resolve
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(customPerformance.length, 1);
      assert.equal(customPerformance[0].name, 'ActiveFighter');
      assert.equal(customGBGdata[0].total, 13); // 3*2 + 7
      assert.equal(updatedOrigin, 'https://en7.forgeofempires.com');
      assert.equal(updatedPerformance, customPerformance);
      assert.ok(customMembers.some((m) => m.name === 'ActiveFighter'));
      assert.ok(bgTimeSet !== null);
    });
  });

  describe('handleBattlegroundState', () => {
    it('only processes when stateId is subscribed and executes onRow', () => {
      let setResultCalled = false;
      const originalSetResult = guildBattlegroundState.setResult;
      const customPerformance = [];
      const customGBGdata = [];

      guildBattlegroundState.setResult = (opts) => {
        setResultCalled = true;
        if (typeof opts?.onRow === 'function') {
          opts.onRow({
            rank: 1,
            name: 'Hero',
            negotiations: 10,
            fights: 50,
            attrition: 20,
          });
        }
      };

      try {
        handleBattlegroundState({ responseData: { stateId: 'unsubscribed' } });
        assert.equal(setResultCalled, false);

        handleBattlegroundState(
          {
            responseData: {
              stateId: 'subscribed',
              playerLeaderboardEntries: [
                {
                  player: { name: 'Fighter1' },
                  wonNegotiations: 5,
                  wonBattles: 20,
                },
              ],
            },
          },
          {
            state: {
              BattlegroundPerformance: customPerformance,
              GBGdata: customGBGdata,
              GameOrigin: 'testOrigin',
            },
          },
        );
        assert.equal(setResultCalled, true);
        assert.equal(customGBGdata.length, 1);
        assert.equal(customGBGdata[0].name, 'Fighter1');
        assert.equal(customGBGdata[0].total, 30); // 5*2 + 20
        assert.equal(customPerformance.length, 1);
        assert.deepEqual(customPerformance[0], [1, 'Hero', 10, 50, 20]);
      } finally {
        guildBattlegroundState.setResult = originalSetResult;
      }
    });
  });

  describe('handleLeaderboard', () => {
    it('delegates to guildBattlegroundState.setLeaderboard', () => {
      let received = null;
      const original = guildBattlegroundState.setLeaderboard;
      guildBattlegroundState.setLeaderboard = (data) => {
        received = data;
      };

      try {
        const payload = { responseData: [{ guild: 'Alpha', score: 1000 }] };
        handleLeaderboard(payload);
        assert.deepEqual(received, { leaderboard: payload.responseData });
      } finally {
        guildBattlegroundState.setLeaderboard = original;
      }
    });
  });
});
