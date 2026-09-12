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

const DAILY_PRODUCTION_HEADER =
  '<div class="foe-section-header"><span data-i18n="daily_production">Daily Production</span></div>';
const COMBAT_BOOSTS_HEADER =
  '<div class="foe-section-header"><span data-i18n="combat_boosts">Combat Boosts</span></div>';

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
    'buildOwnCityCard: renders both section headers in order',
    () => {
      const html = buildOwnCityCard(baseOwnParams);
      assert.ok(html.includes(DAILY_PRODUCTION_HEADER));
      assert.ok(html.includes(COMBAT_BOOSTS_HEADER));
      assert.ok(
        html.indexOf(DAILY_PRODUCTION_HEADER) <
          html.indexOf(COMBAT_BOOSTS_HEADER),
        'Daily Production section must precede Combat Boosts',
      );
    },
  );

  await t.test(
    'buildOwnCityCard: renders inline coin and supply boosts',
    () => {
      const html = buildOwnCityCard({
        ...baseOwnParams,
        exact: true,
        coins: { total: new BigNumber(25000000), boostPercent: 120 },
        supplies: { total: new BigNumber(14200000), boostPercent: 85 },
      });
      assert.match(html, /stat_coins">Coins<\/span>: 25,000,000 \(\+120%\)/);
      assert.match(
        html,
        /stat_supplies">Supplies<\/span>: 14,200,000 \(\+85%\)/,
      );
    },
  );

  await t.test('buildOwnCityCard: renders Guild before Score', () => {
    const html = buildOwnCityCard({
      ...baseOwnParams,
      playerInfo: {
        guild: 'Test Guild',
        era: 'SpaceAgeTitan',
        score: 1234567890,
      },
    });
    const guildIdx = html.indexOf('Guild</span>: Test Guild');
    const scoreIdx = html.indexOf('Score</span>:');
    assert.ok(guildIdx !== -1, 'Guild line must render');
    assert.ok(scoreIdx !== -1, 'Score line must render');
    assert.ok(guildIdx < scoreIdx, 'Guild must appear before Score');
  });

  await t.test(
    'buildOwnCityCard: renders crit strike when AO and CC are present',
    () => {
      const html = buildOwnCityCard({
        ...baseOwnParams,
        spec: {
          arcPercent: new BigNumber(90),
          chatBonus: new BigNumber(300),
          goodsPerQuest: new BigNumber(25),
          aoCriticalStrike: new BigNumber(33),
          ccCriticalStrike: new BigNumber(25),
        },
      });
      assert.match(html, /Crit Strike<\/span>: 33% \(AO\), 25% \(CC\)/);
    },
  );

  await t.test(
    'buildVisitedCityCard: is symmetrical with headers, inline boosts, and crit strike',
    () => {
      const html = buildVisitedCityCard({
        ...baseVisitedParams,
        exact: true,
        coins: { total: new BigNumber(25000000), boostPercent: 120 },
        supplies: { total: new BigNumber(14200000), boostPercent: 85 },
        spec: {
          arcPercent: new BigNumber(90),
          chatBonus: new BigNumber(300),
          goodsPerQuest: new BigNumber(25),
          aoCriticalStrike: new BigNumber(33),
          ccCriticalStrike: new BigNumber(25),
        },
      });
      assert.ok(html.includes(DAILY_PRODUCTION_HEADER));
      assert.ok(html.includes(COMBAT_BOOSTS_HEADER));
      assert.match(html, /stat_coins">Coins<\/span>: 25,000,000 \(\+120%\)/);
      assert.match(
        html,
        /stat_supplies">Supplies<\/span>: 14,200,000 \(\+85%\)/,
      );
      assert.match(html, /Crit Strike<\/span>: 33% \(AO\), 25% \(CC\)/);
    },
  );

  await t.test(
    'buildVisitedCityCard: header shows City Overview title and buttons; player name in body',
    () => {
      const html = buildVisitedCityCard({
        ...baseVisitedParams,
        isCollapsed: false,
      });
      assert.match(html, /id="visiticon"[^>]*data-bs-toggle="collapse"/);
      assert.match(html, /id="visit-copy-btn"/);
      assert.match(html, /id="visit-close-btn"/);
      assert.doesNotMatch(html, /data-bs-toggle="popover"/);
      assert.doesNotMatch(html, /data-bs-toggle="tooltip"/);

      const parts = html.split('id="visitText"');
      assert.equal(parts.length, 2);
      assert.match(
        parts[0],
        /data-i18n="city_overview"/,
        'Header bar must show the City Overview title',
      );
      assert.doesNotMatch(
        parts[0],
        /VisitedPlayer/,
        'Header bar must not contain the player name',
      );
      assert.match(
        parts[1],
        /VisitedPlayer/,
        'Body must contain the player name',
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

  await t.test(
    'buildOwnCityCard: collapsed header shows the player name',
    () => {
      const html = buildOwnCityCard({ ...baseOwnParams, isCollapsed: true });
      const header = html.split('id="citystatsText"')[0];
      assert.match(header, /Player1/);
      assert.doesNotMatch(
        header,
        /data-i18n="city_overview"/,
        'Collapsed header must not show the City Overview title',
      );
      assert.match(header, /id="infoIcon"/);
    },
  );

  await t.test(
    'buildVisitedCityCard: collapsed header shows the player name',
    () => {
      const html = buildVisitedCityCard({
        ...baseVisitedParams,
        isCollapsed: true,
      });
      const header = html.split('id="visitText"')[0];
      assert.match(header, /VisitedPlayer/);
      assert.doesNotMatch(
        header,
        /data-i18n="city_overview"/,
        'Collapsed header must not show the City Overview title',
      );
      assert.doesNotMatch(header, /data-bs-toggle="popover"/);
    },
  );
});
