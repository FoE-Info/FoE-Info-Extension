import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { buildOwnCityCard } from '../../src/js/ui/templates/ownCityCard.js';
import { buildVisitedCityCard } from '../../src/js/ui/templates/visitedCityCard.js';

function createMockMilitary() {
  const zeroPair = { att: new BigNumber(0), def: new BigNumber(0) };
  return {
    red: { base: zeroPair, gbg: zeroPair, ge: zeroPair, qi: zeroPair },
    blue: { base: zeroPair, gbg: zeroPair, ge: zeroPair, qi: zeroPair },
  };
}

test('City Card Bonus Lines Suite', async (t) => {
  const baseOwnParams = {
    prefix: 'citystats',
    playerName: 'Player1',
    playerInfo: { guild: 'Test Guild', era: 'SpaceAgeTitan' },
    stats: {},
    isCollapsed: false,
    fpHTML: '<div>FP: 100</div>',
    coins: { total: new BigNumber(0), boostPercent: 0 },
    supplies: { total: new BigNumber(0), boostPercent: 0 },
    goodsDisplay: '100',
    goodsBoostText: '',
    goodsHTML: '',
    clanGoodsHTML: '',
    spec: {
      arcPercent: new BigNumber(90),
      chatBonus: new BigNumber(300),
      goodsPerQuest: new BigNumber(25),
    },
    units: { daily: 0, traz: 0 },
    mil: createMockMilitary(),
    exact: false,
  };

  const baseVisitedParams = {
    prefix: 'visit',
    playerName: 'VisitedPlayer',
    playerEra: 'SpaceAgeTitan',
    playerScore: '1,000,000',
    playerInfo: { guild: 'Visited Guild' },
    fpTooltipEscaped: '',
    fp: { total: new BigNumber(100) },
    exact: false,
    goodsDisplay: '50',
    goodsBoostText: '',
    goodsHTML: '',
    clanGoodsHTML: '',
    spec: {
      arcPercent: new BigNumber(90),
      chatBonus: new BigNumber(300),
      goodsPerQuest: new BigNumber(25),
    },
    units: { total: new BigNumber(0), daily: 0, traz: 0 },
    mil: createMockMilitary(),
  };

  await t.test(
    'buildOwnCityCard: renders Arc and CF Bonus in separate consecutive divs',
    () => {
      const html = buildOwnCityCard(baseOwnParams);
      assert.doesNotMatch(
        html,
        /Arc.*?,.*CF/,
        'Arc and CF bonus should not be combined on the same line with a comma',
      );
      assert.match(
        html,
        /<div>Arc <span data-i18n="bonus">Bonus<\/span>: 90%<\/div>\s*<div>CF <span data-i18n="bonus">Bonus<\/span>: 300% \(25 <span data-i18n="goods">Goods<\/span>\)<\/div>/,
      );
    },
  );

  await t.test(
    'buildOwnCityCard: renders only Arc Bonus when chatBonus is 0',
    () => {
      const html = buildOwnCityCard({
        ...baseOwnParams,
        spec: {
          arcPercent: new BigNumber(90),
          chatBonus: new BigNumber(0),
          goodsPerQuest: new BigNumber(5),
        },
      });
      assert.match(
        html,
        /<div>Arc <span data-i18n="bonus">Bonus<\/span>: 90%<\/div>/,
      );
      assert.doesNotMatch(html, /CF <span data-i18n="bonus">Bonus<\/span>/);
    },
  );

  await t.test(
    'buildOwnCityCard: renders only CF Bonus when arcPercent is 0',
    () => {
      const html = buildOwnCityCard({
        ...baseOwnParams,
        spec: {
          arcPercent: new BigNumber(0),
          chatBonus: new BigNumber(300),
          goodsPerQuest: new BigNumber(25),
        },
      });
      assert.doesNotMatch(html, /Arc <span data-i18n="bonus">Bonus<\/span>/);
      assert.match(
        html,
        /<div>CF <span data-i18n="bonus">Bonus<\/span>: 300% \(25 <span data-i18n="goods">Goods<\/span>\)<\/div>/,
      );
    },
  );

  await t.test(
    'buildVisitedCityCard: renders Arc and CF Bonus in separate consecutive divs',
    () => {
      const html = buildVisitedCityCard(baseVisitedParams);
      assert.doesNotMatch(html, /Arc.*?,.*CF/);
      assert.match(
        html,
        /<div>Arc <span data-i18n="bonus">Bonus<\/span>: 90%<\/div>\s*<div>CF <span data-i18n="bonus">Bonus<\/span>: 300% \(25 <span data-i18n="goods">Goods<\/span>\)<\/div>/,
      );
    },
  );

  await t.test(
    'buildVisitedCityCard: renders only Arc Bonus when chatBonus is missing or zero',
    () => {
      const html = buildVisitedCityCard({
        ...baseVisitedParams,
        spec: {
          arcPercent: new BigNumber(90),
          chatBonus: new BigNumber(0),
          goodsPerQuest: new BigNumber(5),
        },
      });
      assert.match(
        html,
        /<div>Arc <span data-i18n="bonus">Bonus<\/span>: 90%<\/div>/,
      );
      assert.doesNotMatch(html, /CF <span data-i18n="bonus">Bonus<\/span>/);
    },
  );

  await t.test(
    'buildVisitedCityCard: has Other Player Information header title, collapse icon, close button, and moves player name into body',
    () => {
      const html = buildVisitedCityCard({
        ...baseVisitedParams,
        isCollapsed: false,
      });
      assert.match(
        html,
        /<strong[^>]*data-bs-toggle="collapse"[^>]*><span data-i18n="other_player_information">Other Player Information<\/span><\/strong>/,
      );
      assert.match(html, /id="visiticon"[^>]*data-bs-toggle="collapse"/);
      assert.match(html, /id="visit-close-btn"/);

      const parts = html.split('id="visitText"');
      assert.equal(parts.length, 2);
      assert.doesNotMatch(
        parts[0],
        /VisitedPlayer/,
        'Header bar must not contain player name',
      );
      assert.match(
        parts[1],
        /<strong class="text-primary text-decoration-underline text-truncate">VisitedPlayer<\/strong>/,
        'Player name must be on line 1 of collapsible body',
      );
    },
  );

  await t.test(
    'buildOwnCityCard: has clickable title to collapse and collapse icon, but no close button',
    () => {
      const html = buildOwnCityCard(baseOwnParams);
      assert.match(html, /<strong[^>]*data-bs-toggle="collapse"/);
      assert.match(html, /<strong[^>]*role="button"/);
      assert.match(html, /id="citystatsicon"[^>]*data-bs-toggle="collapse"/);
      assert.doesNotMatch(
        html,
        /id="citystats-close-btn"/,
        'Own city card must not have a close button',
      );
    },
  );
});
