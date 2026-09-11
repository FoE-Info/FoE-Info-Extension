import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import builderPkg from '../../src/js/ui/cityStatsHtmlBuilder.js';

const { buildCityStatsHTML } = builderPkg.default || builderPkg;

describe('cityStatsHtmlBuilder Suite', () => {
  it('generates complete citystats HTML string with player badges, FP, and boosts', () => {
    const City = {
      ForgePoints: 125,
      Coins: 2500000,
      CoinBoost: 50,
      Attack: 100,
      Defense: 80,
      CityAttack: 20,
      CityDefense: 30,
      ArcBonus: 90.6,
      ChatBonus: 100,
      TrazUnits: 45,
      GBGAttackingAttack: 50,
      GBGAttackingDefense: 40,
      GBGDefendingAttack: 10,
      GBGDefendingDefense: 15,
      GEAttackingAttack: 30,
      GEAttackingDefense: 25,
      GEDefendingAttack: 5,
      GEDefendingDefense: 5,
      QIAttackingAttack: 15,
      QIAttackingDefense: 12,
      QIDefendingAttack: 8,
      QIDefendingDefense: 8,
    };

    const MyInfo = {
      name: 'TesterPlayer',
      createdAt: 1609459200,
    };

    const tooltipHTML = {
      fp: '125FP Breakdown',
      clanGoods: '50 Clan Goods',
      totalGoods: '200 Goods',
    };

    const html = buildCityStatsHTML({
      City,
      MyInfo,
      tooltipHTML,
      goodsHTML: '<span>50 SAM</span>',
      userTooltipHTML: '<div>User details</div>',
      clanGoods: 50,
      clanPower: 1200,
      diamonds: 500,
      gameOrigin: 'en7',
      collapseStats: false,
    });

    assert.ok(html.includes('TesterPlayer'));
    assert.ok(html.includes('[EN7]'));
    assert.ok(html.includes('125FP'));
    assert.ok(html.includes('Diamonds</span>: 500'));
    assert.ok(html.includes('Guild Goods</span>: 50'));
    assert.ok(html.includes('Guild Power</span>: 1200'));
    assert.ok(html.includes('Army Units</span>: 45'));
    assert.ok(html.includes('150% Att, 120% Def')); // GBG attack total
    assert.ok(html.includes('id="citystatsCopyID"'));
  });

  it('handles zero/empty state without throwing', () => {
    const html = buildCityStatsHTML({
      City: {},
      MyInfo: { name: 'Player' },
      tooltipHTML: {},
    });
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('Player'));
  });
});
