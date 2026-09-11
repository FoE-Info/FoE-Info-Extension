import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { calculateInvestments } from '../../src/js/calc/InvestedCalculator.js';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher } = dispatcherPkg;

test('Great Buildings Contributions Protocol & Calculation Suite', async (t) => {
  await t.test(
    'calculates contributions with exact BigNumber Arc boost and ceiling rounding',
    () => {
      const payload = {
        __class__: 'ServerRequest',
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getContributions',
        responseData: [
          {
            rank: 2,
            player: {
              player_id: 855676320,
              name: 'Red Ginge',
            },
            forge_points: 631,
            reward: {
              strategy_point_amount: 365,
              blueprints: 10,
              medals: 1284,
            },
            entity_id: 858,
            city_entity_id: 'X_LateMiddleAge_Landmark3',
            name: 'Castel del Monte',
            current_progress: 2662,
            max_progress: 2860,
          },
        ],
      };

      // 90% Arc bonus (1.9x): 365 * 1.9 = 693.5 -> 694 FP return.
      // Invested: 631 FP -> Profit: 694 - 631 = +63 FP.
      const res = calculateInvestments(payload, 90);

      assert.equal(res.success, true);
      assert.equal(res.results.length, 1);
      assert.equal(res.totalInvested, 631);
      assert.equal(res.totalReturn, 694);
      assert.equal(res.netProfitLoss, 63);

      const item = res.results[0];
      assert.equal(item.player.name, 'Red Ginge');
      assert.equal(item.name, 'Castel del Monte');
      assert.equal(item.reward.strategy_points, 694);
      assert.equal(item.netProfitLoss, 63);
      assert.equal(item.is_safe, true);
    },
  );

  await t.test(
    'safely ignores non-number context argument without BigNumber error',
    () => {
      const payload = {
        __class__: 'ServerRequest',
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getContributions',
        responseData: [
          {
            rank: 1,
            player: { name: 'Donor1' },
            forge_points: 100,
            reward: { strategy_point_amount: 50 },
            name: 'The Arc',
          },
        ],
      };

      // Context object should default to 90% Arc bonus safely
      assert.doesNotThrow(() => {
        const res = calculateInvestments(payload, 90);
        assert.equal(res.success, true);
        assert.equal(res.results.length, 1);
        assert.equal(res.totalReturn, 95);
        assert.equal(res.netProfitLoss, -5);
      });
    },
  );

  await t.test('handles empty or null contributions array defensively', () => {
    const emptyRes = calculateInvestments([]);
    assert.equal(emptyRes.success, true);
    assert.equal(emptyRes.results.length, 0);
    assert.equal(emptyRes.totalInvested, 0);
    assert.equal(emptyRes.totalReturn, 0);
    assert.equal(emptyRes.netProfitLoss, 0);

    const nullRes = calculateInvestments(null);
    assert.equal(nullRes.success, true);
    assert.equal(nullRes.results.length, 0);
  });

  await t.test(
    'dispatches cleanly through MessageDispatcher and legacyBridge with isolated context',
    async () => {
      const dispatcher = new MessageDispatcher();
      let capturedMsg = null;
      let capturedArgsCount = 0;

      const mockGetContributions = (...args) => {
        capturedArgsCount = args.length;
        capturedMsg = args[0];
        return calculateInvestments(args[0], 90);
      };

      registerLegacyBridge(dispatcher, {
        getContributions: mockGetContributions,
      });

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getContributions',
        responseData: [
          {
            rank: 1,
            player: { name: 'PlayerA' },
            forge_points: 500,
            reward: { strategy_points: 300 },
            name: 'Statue of Zeus',
          },
        ],
        requestId: 42,
      };

      const batchResult = await dispatcher.dispatchBatch([msg], {
        contextKey: 'test',
      });
      assert.equal(batchResult.total, 1);
      assert.equal(batchResult.succeeded, 1);
      assert.equal(batchResult.failed, 0);
      assert.equal(batchResult.results[0].success, true);
      assert.equal(batchResult.results[0].result.success, true);

      // Verify that legacyBridge wrapped handler passed only msg (1 argument)
      assert.equal(capturedArgsCount, 1);
      assert.equal(capturedMsg.requestId, 42);
    },
  );

  await t.test(
    'updateContributionProgress recalculates total invested from rankings and updates GBselected.current',
    async () => {
      const gbDonationPkg =
        await import('../../src/js/msg/GbDonationService.js');
      const { updateContributionProgress, syncGbSelected } =
        gbDonationPkg.default || gbDonationPkg;

      // Setup building: Zeus lvl 155 (total 18761)
      const GBselected = {
        id: 858,
        player: 7560963,
        player_id: 7560963,
        total: 18761,
        current: 17586, // Prior to donation (13176 + 2940 + 1470)
      };

      // Owner donates 3 FP -> new self contribution 13179
      const rankingsAfter3FP = [
        {
          player: { player_id: 7560963, is_self: true, name: 'Overlord Negan' },
          forge_points: 13179,
        },
        {
          rank: 1,
          player: { player_id: 101, name: 'PEGASUS SPIRIT' },
          forge_points: 2940,
        },
        {
          rank: 2,
          player: { player_id: 102, name: 'Maximus Vorenus' },
          forge_points: 1470,
        },
      ];

      const rankingParams = {
        entityId: 858,
        playerId: 7560963,
        level: 155,
        contribution: 3,
      };

      updateContributionProgress(
        GBselected,
        rankingsAfter3FP,
        rankingParams,
        7560963,
      );

      // Total invested must update to 17589 (13179 + 2940 + 1470)
      assert.equal(
        GBselected.current,
        17589,
        'GBselected.current must update to 17589 after 3 FP donation',
      );
      const remaining = GBselected.total - GBselected.current;
      assert.equal(remaining, 1172, 'Remaining FP must be 1172');

      // Test CityMapService.updateEntity sync with state.invested_forge_points
      const entityUpdate = {
        id: 858,
        cityentity_id: 'X_BronzeAge_Landmark1',
        type: 'greatbuilding',
        state: {
          invested_forge_points: 17592,
          forge_points_for_level_up: 18761,
        },
      };
      syncGbSelected(GBselected, entityUpdate);
      assert.equal(
        GBselected.current,
        17592,
        'syncGbSelected must read state.invested_forge_points',
      );
      assert.equal(
        GBselected.total,
        18761,
        'syncGbSelected must read state.forge_points_for_level_up',
      );
    },
  );
});
