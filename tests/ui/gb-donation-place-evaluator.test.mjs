import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { evaluateGbDonationPlaces } from '../../src/js/ui/gbDonationPlaceEvaluator.js';

test('gbDonationPlaceEvaluator Suite', async (t) => {
  const dummyTables = {
    calcPlaceValues: () => ({
      remaining: 1500,
      donation: new BigNumber(100),
      rewardFP: new BigNumber(120),
      profit: 20,
      percent: new BigNumber(20),
      donateCustom: new BigNumber(100),
      profitNum: 20,
      outcome: 'profit',
    }),
    gbTabSafe: () => '<tr class="tab-safe"></tr>',
    gbTabNotSafe: () => '<tr class="tab-notsafe"></tr>',
    gbTabEmpty: () => '<tr class="tab-empty"></tr>',
  };

  await t.test(
    'evaluates first passable place and generates outcome HTML',
    () => {
      const result = evaluateGbDonationPlaces({
        GBselected: {
          name: 'The Arc',
          total: 2000,
          current: 500,
          connected: true,
        },
        Top: [0, 0, 0, 0, 0, 0],
        GBrewards: [500, 250, 100, 50, 10],
        currentPercent: 190,
        City: { ArcBonus: 90 },
        PlayerName: 'Hero',
        MyInfo: { name: 'Hero' },
        isGbLocked: false,
        depTables: dummyTables,
        calcPlaceValues: dummyTables.calcPlaceValues,
        isPlacePassableFn: () => true,
        getSafe: () => ({
          safe: [true, false, false, false, false],
          donateSuggest: [new BigNumber(950), new BigNumber(475), 0, 0, 0],
        }),
        getFriendlyDonation: () => '<span class="friendly">Friendly</span>',
        getDonations: () => ' P1(950)',
        ownerSafeAddFn: () => 10,
        BN: BigNumber,
      });

      assert.equal(result.foundPlace, true);
      assert.ok(result.olddonationHTML.includes('1st Place'));
      assert.ok(result.olddonationHTML.includes('Friendly'));
      assert.ok(result.olddonationHTML.includes('10FP'));
      assert.ok(result.newdonationHTML.includes('tab-safe'));
      assert.ok(result.copyText.includes('P1(950)'));
    },
  );

  await t.test('handles empty / no passable places', () => {
    const result = evaluateGbDonationPlaces({
      GBselected: {
        name: 'The Arc',
        total: 2000,
        current: 500,
        connected: true,
      },
      Top: [1000, 500, 300, 100, 50, 0],
      GBrewards: [500, 250, 100, 50, 10],
      currentPercent: 190,
      City: { ArcBonus: 90 },
      PlayerName: 'Hero',
      MyInfo: { name: 'Hero' },
      isGbLocked: false,
      depTables: dummyTables,
      calcPlaceValues: dummyTables.calcPlaceValues,
      isPlacePassableFn: () => false,
      getSafe: () => ({ safe: [], donateSuggest: [] }),
      getFriendlyDonation: () => '',
      getDonations: () => '',
      ownerSafeAddFn: () => 0,
      BN: BigNumber,
    });

    assert.equal(result.foundPlace, false);
    assert.equal(result.copyText, '');
    assert.ok(result.newdonationHTML.includes('tab-empty'));
  });
});
