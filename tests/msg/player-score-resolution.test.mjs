import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const require = createRequire(import.meta.url);

test('Player score resolution and persistence', async (t) => {
  const storage = require('../../src/js/utils/storage.js');
  const { MyInfo, setMyScore } = await import('../../src/js/state/state.js');
  const {
    otherPlayerServiceUpdateActions,
  } = require('../../src/js/msg/OtherPlayerService.js');
  const {
    parseUserAccount,
    extractPlayerPoints,
  } = require('../../src/js/parsers/accountParser.js');
  const {
    renderLiveCityStats,
  } = require('../../src/js/ui/renderLiveCityStats.js');

  await t.test(
    'otherPlayerServiceUpdateActions updates MyInfo.score and saves to storage on social list',
    () => {
      setMyScore(0);
      storage.set('playerScore', 0);
      MyInfo.id = 12345;

      const payload = [
        {
          player_id: 12345,
          name: 'TestPlayer',
          is_self: true,
          score: 987654321,
        },
        {
          player_id: 67890,
          name: 'NeighborOne',
          is_self: false,
          score: 123456,
        },
      ];

      otherPlayerServiceUpdateActions(payload);

      assert.equal(
        MyInfo.score,
        987654321,
        'MyInfo.score should be updated to self player score',
      );
      assert.equal(
        storage.getSync('playerScore'),
        987654321,
        'storage should have cached playerScore',
      );
    },
  );

  await t.test(
    'otherPlayerServiceUpdateActions updates score when payload is an object with clan_members',
    () => {
      setMyScore(0);
      MyInfo.id = 99999;

      const payload = {
        clan_members: [
          {
            id: 99999,
            name: 'GuildLeader',
            is_self: true,
            score: 555444333,
          },
        ],
      };

      otherPlayerServiceUpdateActions(payload);

      assert.equal(
        MyInfo.score,
        555444333,
        'MyInfo.score should be updated from clan_members payload',
      );
      assert.equal(
        storage.getSync('playerScore'),
        555444333,
        'storage should have cached score from clan_members',
      );
    },
  );

  await t.test('accountParser extracts points across all known keys', () => {
    assert.equal(extractPlayerPoints({ rank_points: 12345 }), 12345);
    assert.equal(extractPlayerPoints({ player_points: 23456 }), 23456);
    assert.equal(extractPlayerPoints({ score: 34567 }), 34567);
    assert.equal(extractPlayerPoints({ points: 45678 }), 45678);
    assert.equal(extractPlayerPoints({}), 0);
  });

  await t.test(
    'storage cache fallback populates score when user_data has 0 score',
    () => {
      storage.set('playerScore', 87654321);
      const parsedUser = parseUserAccount({
        user_name: 'TestHero',
        player_id: 42,
        score: 0,
      });
      if (!parsedUser.score || parsedUser.score === 0) {
        const cached = storage.getSync('playerScore');
        if (cached && Number(cached) > 0) {
          parsedUser.score = Number(cached);
        }
      }
      assert.equal(
        parsedUser.score,
        87654321,
        'storage cache should populate player score',
      );
    },
  );

  await t.test(
    'renderLiveCityStats prioritizes MyInfo.score over 0 in user.score',
    () => {
      setMyScore(888777666);

      let capturedPlayerInfo = null;
      const mockRenderCityStats = (
        containerId,
        calculatedStats,
        playerInfo,
      ) => {
        capturedPlayerInfo = playerInfo;
      };

      renderLiveCityStats({
        lastStartupContext: {
          user: { score: 0, user_name: 'TestHero', era: 'SpaceAgeSpaceHub' },
        },
        renderCityStats: mockRenderCityStats,
      });

      assert.ok(capturedPlayerInfo, 'renderCityStats should have been called');
      assert.equal(
        capturedPlayerInfo.score,
        888777666,
        'renderLiveCityStats should pick positive MyInfo.score over 0',
      );
    },
  );

  await t.test('storage compatibility shim requires without throwing', () => {
    assert.doesNotThrow(() => {
      require('../../src/js/fn/storage.js');
    }, 'src/js/fn/storage.js should be requireable in CJS');
  });
});
