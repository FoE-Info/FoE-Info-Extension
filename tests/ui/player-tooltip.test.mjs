import assert from 'node:assert/strict';
import test from 'node:test';

const tooltipPkg = await import('../../src/js/ui/playerTooltip.js');
const {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  pendingScoreDBFetches,
  updateIgnoreListUI,
  playerNameCache,
  setIgnoredPlayers,
  updatePlayerNameCache,
} = tooltipPkg.default || tooltipPkg;

test('Player Tooltip & Ignore List UI Suite', async (t) => {
  t.beforeEach(() => {
    pendingScoreDBFetches.clear();
    setIgnoredPlayers({}, {});
    for (const key of Object.keys(playerNameCache)) {
      delete playerNameCache[key];
    }
  });

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
      assert.match(emptyHtml, /<p class="pop">/);
      assert.match(emptyHtml, /<em>None<\/em>/);

      // Populated lists
      updatePlayerNameCache(201, 'RivalAlpha');
      updatePlayerNameCache(202, 'RivalBeta');
      setIgnoredPlayers({ 0: 201 }, { 0: 202 });

      const populatedHtml = getUserTooltipHTML();
      assert.match(populatedHtml, /<strong>Ignored By:<\/strong>/);
      assert.match(populatedHtml, /RivalAlpha/);
      assert.match(populatedHtml, /<strong>Ignoring:<\/strong>/);
      assert.match(populatedHtml, /RivalBeta/);
      assert.doesNotMatch(populatedHtml, /<em>None<\/em>/);
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
});
