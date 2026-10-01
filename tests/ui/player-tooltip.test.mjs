import assert from 'node:assert/strict';
import test from 'node:test';

const tooltipPkg = await import('../../src/js/ui/playerTooltip.js');
const {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  pendingScoreDBFetches,
  updateIgnoreListUI,
  normalizeIgnoreListData,
  playerNameCache,
  setIgnoredPlayers,
  updatePlayerNameCache,
} = tooltipPkg.default || tooltipPkg;

const { scoreDBRetryAfter, NEGATIVE_CACHE_TTL_MS } = tooltipPkg;

// Let queued fetch microtasks settle so the pending set reflects reality.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test('Player Tooltip - ScoreDB retry behavior', async (t) => {
  const originalFetch = globalThis.fetch;
  t.beforeEach(() => {
    pendingScoreDBFetches.clear();
    scoreDBRetryAfter.clear();
    for (const key of Object.keys(playerNameCache)) {
      delete playerNameCache[key];
    }
  });
  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test(
    'a rejected request is not persisted as "not found"',
    async () => {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      assert.equal(formatPlayerLabel(501), '#501');
      await settle();

      assert.notEqual(playerNameCache['501']?.notFound, true);
      assert.equal(typeof playerNameCache['501'].scoreDBRetryAfter, 'number');
      assert.equal(
        scoreDBRetryAfter.has('501'),
        true,
        'a network failure schedules a retry without marking the player missing',
      );
      assert.equal(
        pendingScoreDBFetches.has('501'),
        false,
        'the pending key is released so a later render can retry',
      );
    },
  );

  await t.test('a 503 is not persisted as "not found"', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 503 });

    assert.equal(formatPlayerLabel(502), '#502');
    await settle();

    assert.notEqual(playerNameCache['502']?.notFound, true);
    assert.equal(typeof playerNameCache['502'].scoreDBRetryAfter, 'number');
    assert.equal(scoreDBRetryAfter.has('502'), true);
  });

  await t.test('a 404 is a definitive "not found"', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404 });

    assert.equal(formatPlayerLabel(503), '#503');
    await settle();

    assert.equal(playerNameCache['503'].notFound, true);
    assert.equal(scoreDBRetryAfter.has('503'), false);
    assert.equal(formatPlayerLabel(503), null);
  });

  await t.test('a negative entry expires and is looked up again', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return {
        ok: true,
        text: async () => '<title>RealName - Forge of Empires</title>',
      };
    };

    // Fresh negative entry: no lookup, and the player stays suppressed.
    updatePlayerNameCache(504, null, { notFound: true });
    assert.equal(formatPlayerLabel(504), null);
    assert.equal(calls, 0);

    // Aged past the TTL: the verdict is re-checked instead of trusted forever.
    playerNameCache['504'].lastUpdated = Date.now() - NEGATIVE_CACHE_TTL_MS;
    assert.equal(formatPlayerLabel(504), '#504');
    await settle();

    assert.equal(calls, 1);
    assert.equal(formatPlayerLabel(504), 'RealName');
  });

  await t.test('a backoff window suppresses a retry burst', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new TypeError('Failed to fetch');
    };

    formatPlayerLabel(505);
    await settle();
    assert.equal(calls, 1);

    formatPlayerLabel(505);
    await settle();
    assert.equal(calls, 1, 'still inside the backoff window');
    assert.equal(pendingScoreDBFetches.has('505'), false);
  });
});

test('Player Tooltip & Ignore List UI Suite', async (t) => {
  const originalFetch = globalThis.fetch;
  t.beforeEach(() => {
    globalThis.fetch = async () => ({
      ok: false,
      text: async () => '',
    });
    pendingScoreDBFetches.clear();
    setIgnoredPlayers({}, {});
    for (const key of Object.keys(playerNameCache)) {
      delete playerNameCache[key];
    }
  });

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test(
    'ignore popup omits missing and unresolved players while retaining IDs for retries',
    async () => {
      globalThis.fetch = async () => {
        throw new TypeError('Temporary network failure');
      };
      updatePlayerNameCache(701, null, { notFound: true });
      updatePlayerNameCache(702, 'Active Rival');
      setIgnoredPlayers({ 0: 701 }, { 0: 702, 1: 703 });
      const html = getUserTooltipHTML();
      assert.match(html, /Active Rival/);
      assert.doesNotMatch(html, /#701|#703|Player\/701|Player\/703/);
      await settle();
      assert.notEqual(playerNameCache['703']?.notFound, true);
      assert.equal(typeof playerNameCache['703'].scoreDBRetryAfter, 'number');
      updatePlayerNameCache(703, 'Recovered Rival');
      assert.match(getUserTooltipHTML(), /Recovered Rival/);
    },
  );

  await t.test(
    'getScoreDBOrigin handles URL formats, plain world codes, and falsy fallbacks',
    () => {
      // URL formats
      assert.equal(
        getScoreDBOrigin('https://zz1.forgeofempires.com/game/index'),
        'zz1',
      );
      assert.equal(getScoreDBOrigin('http://us14.forgeofempires.com/'), 'us14');

      // Plain world codes
      assert.equal(getScoreDBOrigin('en7'), 'en7');
      assert.equal(getScoreDBOrigin(' DE4 '), 'de4');

      // Falsy fallbacks default to 'en7'
      assert.equal(getScoreDBOrigin(''), 'en7');
      assert.equal(getScoreDBOrigin(null), 'en7');
      assert.equal(getScoreDBOrigin(undefined), 'en7');
    },
  );

  await t.test(
    'formatPlayerLabel formats cached players with previous names and notFound players',
    () => {
      // 1. Not found player
      updatePlayerNameCache(101, null, { notFound: true });
      assert.equal(formatPlayerLabel(101), null);

      // 2. Current name only
      updatePlayerNameCache(102, 'SirLancelot');
      assert.equal(formatPlayerLabel(102), 'SirLancelot');

      // 3. Current name with previous names
      playerNameCache['103'] = {
        currentName: 'QueenGuinevere',
        previousNames: ['LadyG', 'PrincessG'],
      };
      const label = formatPlayerLabel(103);
      assert.equal(
        label,
        'QueenGuinevere <small class="text-muted">(formerly PrincessG)</small>',
      );

      // 4. Uncached player returns #id and records pending fetch
      const uncachedLabel = formatPlayerLabel(999);
      assert.equal(uncachedLabel, '#999');
      assert.equal(pendingScoreDBFetches.has('999'), true);
    },
  );

  await t.test(
    'getUserTooltipHTML formats ignored players and handles empty lists',
    () => {
      // Empty lists
      setIgnoredPlayers({}, {});
      const emptyHtml = getUserTooltipHTML();
      assert.match(emptyHtml, /<div class="pop foe-ignore-list">/);
      assert.match(emptyHtml, /<em>(?:<span data-i18n="none">)?None/);

      // Populated lists
      updatePlayerNameCache(201, 'RivalAlpha');
      updatePlayerNameCache(202, 'RivalBeta');
      setIgnoredPlayers({ 0: 201 }, { 0: 202 });

      const populatedHtml = getUserTooltipHTML();
      assert.match(populatedHtml, /<strong><span data-i18n="ignored_by">/);
      assert.match(populatedHtml, /RivalAlpha/);
      assert.match(populatedHtml, /<strong><span data-i18n="ignoring">/);
      assert.match(populatedHtml, /RivalBeta/);
      assert.match(populatedHtml, /mt-2 pt-2 border-top/);
      assert.doesNotMatch(
        populatedHtml,
        /<em>(?:<span data-i18n="none">)?None/,
      );
    },
  );

  await t.test(
    'updateIgnoreListUI updates element attributes and handles missing elements gracefully',
    () => {
      // 1. Missing element: does not throw
      assert.doesNotThrow(() => {
        updateIgnoreListUI({ ignoredPlayerIds: { 0: 301 } });
      });

      // 2. Mock DOM element
      let contentAttr = null;
      globalThis.document = {
        getElementById: (id) => {
          if (id === 'user') {
            return {
              setAttribute: (name, val) => {
                if (name === 'data-bs-content') contentAttr = val;
              },
              getAttribute: () => null,
            };
          }
          return null;
        },
      };

      updatePlayerNameCache(301, 'TargetPlayer');
      updateIgnoreListUI({ ignoredPlayerIds: { 0: 301 } });

      assert.ok(contentAttr);
      assert.match(contentAttr, /TargetPlayer/);
    },
  );

  await t.test(
    'normalizeIgnoreListData cleanly extracts data from RPC envelopes and DTOs',
    () => {
      assert.equal(normalizeIgnoreListData(null), null);
      assert.equal(normalizeIgnoreListData({}), null);

      // Raw RPC responseData format
      const rpcEnvelope = {
        responseData: {
          ignored_by_player_ids: { 0: 101 },
          ignored_player_ids: { 0: 202 },
        },
      };
      const normRpc = normalizeIgnoreListData(rpcEnvelope);
      assert.deepEqual(normRpc, {
        ignoredByPlayerIds: { 0: 101 },
        ignoredPlayerIds: { 0: 202 },
      });

      // CamelCase DTO format
      const dto = {
        ignoredByPlayerIds: { 0: 303 },
        ignoredPlayerIds: { 0: 404 },
      };
      const normDto = normalizeIgnoreListData(dto);
      assert.deepEqual(normDto, {
        ignoredByPlayerIds: { 0: 303 },
        ignoredPlayerIds: { 0: 404 },
      });
    },
  );
});
