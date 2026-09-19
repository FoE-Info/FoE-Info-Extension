import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setupMockDOM } from '../helpers/test-mocks.mjs';

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

setupMockDOM({
  window: {
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    location: { href: 'https://en7.forgeofempires.com/game/index' },
  },
});
globalThis.getComputedStyle = globalThis.window.getComputedStyle;
globalThis.location = globalThis.window.location;
globalThis.DEV = false;

const service = await import('../../src/js/msg/GuildBattlegroundService.js');
const { GBGdata, BattlegroundPerformance, VolcanoProvinceDefs } =
  await import('../../src/js/state/state.js');
const { showOptions } = await import('../../src/js/state/showOptions.js');
const { guildBattlegroundState } =
  await import('../../src/js/state/GuildBattlegroundState.js');
const { conversationService } =
  await import('../../src/js/msg/ConversationService.js');
await import('../../src/js/ui/gbgRenderBinding.js');

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

  await t.test(
    'chat target message stays active across routine getUpdatedProvinces and getBuildings, switching back only on marker changes',
    () => {
      service.clearBattleground();
      guildBattlegroundState.setTargetMessageActive(false);

      let targetsGBG = globalThis.document.getElementById('targetsGBG');
      if (!targetsGBG) {
        targetsGBG = globalThis.document.createElement('div');
        targetsGBG.id = 'targetsGBG';
        globalThis.document.body.appendChild(targetsGBG);
      }
      targetsGBG.innerHTML = '';

      VolcanoProvinceDefs.length = 0;
      VolcanoProvinceDefs.push(
        { id: 1, name: 'A1 South', connections: [] },
        { id: 2, name: 'B1 South', connections: [] },
      );

      // 1. Initialize battleground map with provinces
      service.getBattleground({
        responseData: {
          currentParticipantId: 1,
          map: {
            id: 'volcano_1',
            provinces: [
              { id: 1, lockedUntil: 0, totalBuildingSlots: 1 },
              { id: 2, lockedUntil: 0, totalBuildingSlots: 1 },
            ],
          },
          battlegroundParticipants: [{ participantId: 1, signals: [] }],
        },
      });

      // 2. User opens and reads Battlegrounds Targets thread
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Attack B1S now!',
                  sender: { name: 'Commander' },
                  date: 1700000000,
                },
              },
            ],
          },
        },
      });

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'Must display chat target message',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('Attack B1S now!'),
        'Must display thread message text',
      );
      assert.equal(
        guildBattlegroundState.isTargetMessageActive(),
        true,
        'targetMessageActive must be true',
      );

      // 3. User closes the Message Center thread -> game sends getUpdatedProvinces
      service.getUpdatedProvinces({
        responseData: [{ id: 1, currentProgress: 25 }],
      });

      // Assert it did NOT switch back to Target Generator!
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'Must stay on chat target message after getUpdatedProvinces',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('Attack B1S now!'),
        'Message text must remain intact',
      );
      assert.equal(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        false,
        'Target generator must not overwrite thread message',
      );

      // 4. Routine getBuildings call
      service.getBuildings({
        responseData: {
          provinceId: 1,
          placedBuildings: [],
          availableBuildings: [],
        },
      });

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'Must stay on chat target message after getBuildings',
      );
      assert.equal(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        false,
        'Target generator must not overwrite thread message on getBuildings',
      );

      // 5. New signal placed on map for province 1 (setSignal)
      service.setSignal(null, [1, 'focus']);

      assert.equal(
        guildBattlegroundState.isTargetMessageActive(),
        false,
        'targetMessageActive must be reset to false when signal is set',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator when signal is placed',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('A1S'),
        'Target generator must show province 1 target',
      );

      // 6. User opens thread again
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Switch to D4A!',
                  sender: { name: 'Commander' },
                  date: 1700000005,
                },
              },
            ],
          },
        },
      });
      assert.ok(targetsGBG.innerHTML.includes('Switch to D4A!'));
      assert.equal(guildBattlegroundState.isTargetMessageActive(), true);

      // Routine province update while thread message is active
      service.getUpdatedProvinces({
        responseData: [{ id: 1, currentProgress: 50 }],
      });
      assert.ok(
        targetsGBG.innerHTML.includes('Switch to D4A!'),
        'Must stay on thread message during routine province update',
      );

      // 7. Second signal placed on map for province 2 (setSignal)
      service.setSignal(null, [2, 'focus']);

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator when second signal is placed',
      );
      assert.ok(targetsGBG.innerHTML.includes('A1S'));
      assert.ok(targetsGBG.innerHTML.includes('B1S'));

      // 8. User opens thread again
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Hold position!',
                  sender: { name: 'Commander' },
                  date: 1700000010,
                },
              },
            ],
          },
        },
      });
      assert.ok(targetsGBG.innerHTML.includes('Hold position!'));

      // 9. Existing signal state for province 2 changed from focus to ignore (updateSignal: Stop)
      service.updateSignal(null, [2, 'ignore']);

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator when signal type changes to stop',
      );
      assert.ok(targetsGBG.innerHTML.includes('A1S'));
      assert.equal(
        targetsGBG.innerHTML.includes('B1S'),
        false,
        'Stopped province must be excluded from target generator',
      );

      // 10. User opens thread again
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Resume attack!',
                  sender: { name: 'Commander' },
                  date: 1700000015,
                },
              },
            ],
          },
        },
      });
      assert.ok(targetsGBG.innerHTML.includes('Resume attack!'));

      // 11. Last focus signal removed from map (removeSignal)
      service.removeSignal(null, [1]);

      assert.equal(
        guildBattlegroundState.isTargetMessageActive(),
        false,
        'targetMessageActive must be reset to false when signal is removed',
      );
      assert.equal(
        targetsGBG.innerHTML,
        '',
        'Target generator container must be cleared when all focus signals are removed',
      );

      // 12. User opens thread again, then exits map and comes back to it
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Attack A1S again!',
                  sender: { name: 'Commander' },
                  date: 1700000020,
                },
              },
            ],
          },
        },
      });
      assert.ok(targetsGBG.innerHTML.includes('Attack A1S again!'));
      assert.equal(guildBattlegroundState.isTargetMessageActive(), true);

      // User re-enters map (getBattleground)
      service.getBattleground({
        responseData: {
          currentParticipantId: 1,
          map: {
            id: 'volcano_1',
            provinces: [
              { id: 1, lockedUntil: 0, totalBuildingSlots: 1 },
              { id: 2, lockedUntil: 0, totalBuildingSlots: 1 },
            ],
          },
          battlegroundParticipants: [
            { participantId: 1, signals: [{ id: 1, type: 'focus' }] },
          ],
        },
      });
      assert.equal(
        guildBattlegroundState.isTargetMessageActive(),
        false,
        'targetMessageActive must be reset to false when entering battleground map',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator when re-entering map',
      );

      // 13. User opens thread, then marks existing signal as stop sign via setSignal
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Target on A1S',
                  sender: { name: 'Commander' },
                  date: 1700000025,
                },
              },
            ],
          },
        },
      });
      assert.ok(targetsGBG.innerHTML.includes('Target on A1S'));
      assert.equal(guildBattlegroundState.isTargetMessageActive(), true);

      // Setting ignore signal (stop sign) on only focus province
      service.setSignal(null, [1, 'ignore']);
      assert.equal(
        guildBattlegroundState.isTargetMessageActive(),
        false,
        'targetMessageActive must be reset to false when setting ignore signal',
      );
      assert.equal(
        targetsGBG.innerHTML,
        '',
        'Previous thread target message must be cleared when all focus targets are stopped',
      );
    },
  );
});
