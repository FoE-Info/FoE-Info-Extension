import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { buildLiveCityViewData } from '../../src/js/ui/liveCityViewDataBuilder.js';

test('liveCityViewDataBuilder Unit Suite', async (t) => {
  await t.test('builds viewData with sanitized user tooltip and scores', () => {
    const user = {
      user_name: 'HeroPlayer',
      score: 50000,
      clan_name: 'Champions',
    };
    const myInfo = {
      name: 'FallbackPlayer',
      score: 10000,
      createdAt: 1600000000,
    };
    const goodsData = {
      totalGoodsAmount: new BigNumber(1200),
      goodsBoostPercent: new BigNumber(10),
      goodsByEra: { fe: new BigNumber(1200) },
      liveGoodsHTML: '<span>FE:1200</span>',
    };
    const calculatedStats = {
      clanGoods: 300,
      availableFP: 25,
      aidStats: null,
      units: { buildings: [{ name: 'Camp' }] },
    };

    const { viewData, renderOpts } = buildLiveCityViewData({
      user,
      myInfo,
      currentEra: 'FutureEra',
      goodsData,
      calculatedStats,
      ctx: {},
      city: { fpProductionBoost: 15 },
      formatDate: (ts) => `Formatted:${ts}`,
      getUserTooltipHTML: () => `<div title="O'Connor">Tooltip "info"</div>`,
      getScoreDBOrigin: () => 'foe-helper',
      buildFpTooltipHTML: () => '<div>FP Tooltip</div>',
      buildTotalGoodsTooltipHTML: () => '<div>Goods Tooltip</div>',
      buildUnitsTooltipHTML: (b) => `<div>${b.length} buildings</div>`,
    });

    assert.equal(viewData.name, 'HeroPlayer');
    assert.equal(viewData.era, 'FutureEra');
    assert.equal(viewData.score, 10000); // MyInfo.score takes precedence over user.score
    assert.equal(viewData.guild, 'Champions');
    assert.equal(viewData.totalGoods.toNumber(), 1200);
    assert.equal(viewData.clanGoods, 300);
    assert.equal(viewData.availableFP, 25);
    assert.match(viewData.userTitle, /Formatted:1600000000/);
    assert.match(viewData.userTooltipHTML, /&#39;Connor/);
    assert.match(viewData.userTooltipHTML, /&quot;info&quot;/);
    assert.equal(viewData.origin, 'FOE-HELPER');
    assert.equal(viewData.fpTooltipHTML, '<div>FP Tooltip</div>');
    assert.equal(viewData.totalGoodsTooltipHTML, '<div>Goods Tooltip</div>');
    assert.equal(renderOpts.unitsTooltipHTML, '<div>1 buildings</div>');
  });

  await t.test('falls back to user score when myInfo score is missing', () => {
    const user = { user_name: 'HeroPlayer', score: 50000 };
    const myInfo = { name: 'FallbackPlayer', score: null };
    const { viewData } = buildLiveCityViewData({
      user,
      myInfo,
    });
    assert.equal(viewData.score, 50000);
  });
});
