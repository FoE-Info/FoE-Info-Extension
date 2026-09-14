import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import allyPkg from '../../src/js/msg/AllyService.js';
import boostPkg from '../../src/js/msg/BoostService.js';
import castlePkg from '../../src/js/msg/CastleSystemService.js';
import hiddenPkg from '../../src/js/msg/HiddenRewardService.js';
import inventoryPkg from '../../src/js/msg/InventoryService.js';
import outpostPkg from '../../src/js/msg/OutpostService.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher } = dispatcherPkg;
const { HiddenRewardService } = hiddenPkg;
const { CastleSystemService } = castlePkg;
const { BoostService } = boostPkg;
const { AllyService } = allyPkg;
const { InventoryService } = inventoryPkg;
const { OutpostService } = outpostPkg;

function loadFixture(filename) {
  const filePath = new URL(
    `../../tests/fixtures/rpc/${filename}`,
    import.meta.url,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('Domain Services Protocol & Parsing - City Suite', async (t) => {
  // Test 1: HiddenRewardService (Incidents)
  await t.test(
    'HiddenRewardService: parses incidents, expiration, and rarity',
    async () => {
      const fixture = loadFixture('HiddenRewardService.getOverview.json');
      const service = new HiddenRewardService();

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'HiddenRewardService',
        requestMethod: 'getOverview',
        responseData: fixture,
      };

      const res = service.getOverview(msg);
      assert.ok(res);
      assert.equal(res.success, true);
      assert.ok(
        res.total >= 10,
        `Expected at least 10 incidents, got ${res.total}`,
      );
      assert.equal(service.incidents.length, fixture.hiddenRewards.length);

      const first = service.incidents[0];
      const rawFirst = fixture.hiddenRewards[0];
      assert.equal(first.hiddenRewardId, rawFirst.hiddenRewardId);
      assert.equal(first.type, rawFirst.type);
      assert.equal(first.rarity, rawFirst.rarity);
      assert.equal(
        first.formattedRarity,
        rawFirst.rarity[0].toUpperCase() + rawFirst.rarity.slice(1),
      );
      assert.equal(first.positionContext, rawFirst.position?.context || '');
      assert.equal(first.startTime, rawFirst.startTime);
      assert.equal(first.expireTime, rawFirst.expireTime);
      assert.equal(
        first.durationSeconds,
        rawFirst.expireTime - rawFirst.startTime,
      );

      // Assert expiration calculations
      const nowBeforeExpire = first.startTime - 1;
      assert.equal(first.isExpired(nowBeforeExpire), false);
      assert.equal(
        first.remainingSeconds(nowBeforeExpire),
        first.expireTime - nowBeforeExpire,
      );

      const nowAfterExpire = first.expireTime + 1;
      assert.equal(first.isExpired(nowAfterExpire), true);
      assert.equal(first.remainingSeconds(nowAfterExpire), 0);

      // Breakdown assertions (derived from fixture rarities)
      const rarities = service.getRarityBreakdown();
      const expectedRarities = {};
      for (const inc of fixture.hiddenRewards) {
        expectedRarities[inc.rarity] = (expectedRarities[inc.rarity] || 0) + 1;
      }
      for (const [key, count] of Object.entries(expectedRarities)) {
        assert.equal(rarities[key], count);
      }
      const totalRarityCount = Object.values(expectedRarities).reduce(
        (a, b) => a + b,
        0,
      );
      assert.equal(
        Object.values(rarities).reduce((a, b) => a + b, 0),
        totalRarityCount,
      );

      // State & Incident rendering integration
      const mockState = {
        hiddenRewards: [],
        setHiddenRewards(rewards) {
          this.hiddenRewards.length = 0;
          if (Array.isArray(rewards)) this.hiddenRewards.push(...rewards);
        },
      };
      let renderedIncidents = false;
      const mockHelper = {
        fShowIncidents() {
          renderedIncidents = true;
        },
      };
      let callbackTriggered = false;
      service.setState(mockState);
      service.setHelper(mockHelper);
      service.onOverview((rewards, incidents) => {
        callbackTriggered = true;
        assert.equal(rewards.length, fixture.hiddenRewards.length);
        assert.equal(incidents.length, fixture.hiddenRewards.length);
      });

      service.getOverview(msg);
      assert.equal(
        mockState.hiddenRewards.length,
        fixture.hiddenRewards.length,
      );
      assert.equal(renderedIncidents, true);
      assert.equal(callbackTriggered, true);

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchRes.succeeded, 1);
    },
  );

  // Test 2: CastleSystemService (Castle System)
  await t.test(
    'CastleSystemService: parses castle level, streaks, and daily rewards',
    async () => {
      const playerFixture = loadFixture(
        'CastleSystemService.getCastleSystemPlayer.json',
      );
      const overviewFixture = loadFixture(
        'CastleSystemService.getOverview.json',
      );
      const service = new CastleSystemService();

      const playerMsg = {
        __class__: 'ServerRequest',
        requestClass: 'CastleSystemService',
        requestMethod: 'getCastleSystemPlayer',
        responseData: playerFixture,
      };

      const overviewMsg = {
        __class__: 'ServerRequest',
        requestClass: 'CastleSystemService',
        requestMethod: 'getOverview',
        responseData: overviewFixture,
      };

      const playerRes = service.getCastleSystemPlayer(playerMsg);
      assert.equal(playerRes.success, true);
      assert.equal(service.level, 15);
      assert.equal(playerRes.level, 15);
      assert.equal(service.nextCastlePoints.castlePointsWinBattle, 30);
      assert.equal(
        service.nextCastlePoints.castlePointsItemShopTradeCoinsDivisor,
        300,
      );

      const overviewRes = service.getOverview(overviewMsg);
      assert.equal(overviewRes.success, true);
      assert.equal(
        service.dailyPointsCollectionAvailableAt,
        overviewFixture.dailyPointsCollectionAvailableAt,
      );
      assert.equal(
        service.dailyBonusPointsCollectionAvailableAt,
        overviewFixture.dailyBonusPointsCollectionAvailableAt,
      );
      assert.equal(
        service.dailyRewardCollectionAvailableAt,
        overviewFixture.dailyRewardCollectionAvailableAt,
      );

      // Timestamps and availability helpers
      const pastTime = overviewFixture.dailyRewardCollectionAvailableAt - 1;
      const futureTime = overviewFixture.dailyRewardCollectionAvailableAt + 1;
      assert.equal(service.isDailyRewardAvailable(pastTime), false);
      assert.equal(service.isDailyRewardAvailable(futureTime), true);
      assert.equal(
        service.isDailyBonusPointsAvailable(
          overviewFixture.dailyBonusPointsCollectionAvailableAt + 1,
        ),
        true,
      );

      // Visual stage combat boost mapping
      assert.deepEqual(service.getBoostsForStage(0), {
        attackerAtt: 0,
        attackerDef: 0,
        defenderAtt: 0,
        defenderDef: 0,
      });
      assert.deepEqual(service.getBoostsForStage(4), {
        attackerAtt: 30,
        attackerDef: 30,
        defenderAtt: 30,
        defenderDef: 30,
      });
      assert.deepEqual(service.getBoostsForStage(7), {
        attackerAtt: 60,
        attackerDef: 60,
        defenderAtt: 60,
        defenderDef: 60,
      });
      assert.equal(service.getBoostsForStage(99), null);

      assert.deepEqual(
        service.getBoostsForEntity({
          cityentity_id: 'V_AllAge_CastleSystem4',
        }),
        { attackerAtt: 30, attackerDef: 30, defenderAtt: 30, defenderDef: 30 },
      );
      assert.deepEqual(
        service.getBoostsForEntity({
          cityentity_id: 'V_AllAge_CastleSystem6',
        }),
        { attackerAtt: 45, attackerDef: 45, defenderAtt: 45, defenderDef: 45 },
      );
      assert.equal(
        service.getBoostsForEntity({ cityentity_id: 'W_MultiAge_Tower1' }),
        null,
      );

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([
        playerMsg,
        overviewMsg,
      ]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 3: BoostService (Boost Matrices with BigNumber precision)
  await t.test(
    'BoostService: aggregates military and town boosts with BigNumber precision',
    async () => {
      const allBoostsFixture = loadFixture('BoostService.getAllBoosts.json');
      const service = new BoostService();

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'BoostService',
        requestMethod: 'getAllBoosts',
        responseData: allBoostsFixture,
      };

      const res = service.getAllBoosts(msg);
      assert.equal(res.success, true);
      assert.equal(res.totalEntries, allBoostsFixture.length);

      // Aggregated feature matrices
      const stats = service.getAggregatedBoosts();

      // Universal 'all' boosts
      assert.ok(BigNumber.isBigNumber(stats.all.attackingAttack));
      assert.equal(stats.all.attackingAttack.toString(), '22485');
      assert.equal(stats.all.attackingDefense.toString(), '22115');
      assert.equal(stats.all.defendingAttack.toString(), '21945');
      assert.equal(stats.all.defendingDefense.toString(), '23032');

      // Feature-specific addon boosts
      assert.equal(stats.battleground.attackingAttack.toString(), '16265');
      assert.equal(stats.battleground.attackingDefense.toString(), '16529');
      assert.equal(stats.guild_expedition.attackingAttack.toString(), '9528');
      assert.equal(stats.guild_expedition.attackingDefense.toString(), '11936');
      assert.equal(stats.guild_raids.attackingAttack.toString(), '773');
      assert.equal(stats.guild_raids.attackingDefense.toString(), '537');

      // Total combined boosts (all + feature)
      const gbgTotal = service.getTotalBoost('battleground', 'attackingAttack');
      assert.ok(BigNumber.isBigNumber(gbgTotal));
      assert.equal(gbgTotal.toString(), '38750'); // 22485 + 16265

      const geDefTotal = service.getTotalBoost(
        'guild_expedition',
        'attackingDefense',
      );
      assert.equal(geDefTotal.toString(), '34051'); // 22115 + 11936

      // Production boost aggregations
      assert.equal(stats.production.coin.toString(), '100');
      assert.equal(stats.production.supply.toString(), '100');
      assert.equal(stats.production.forgePoints.toString(), '69');

      // Timer boost handling
      const timerMsg = {
        __class__: 'ServerRequest',
        requestClass: 'BoostService',
        requestMethod: 'getTimerBoost',
        responseData: [
          {
            type: 'att_boost_attacker',
            value: 20,
            expireTime: Math.floor(Date.now() / 1000) + 86400,
          },
        ],
      };
      const timerRes = service.getTimerBoost(timerMsg);
      assert.equal(timerRes.success, true);
      assert.equal(service.timerBoosts.length, 1);
      assert.equal(
        service.getTimerBoostSum('att_boost_attacker').toString(),
        '20',
      );

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([msg, timerMsg]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 4: AllyService (Historical Allies)
  await t.test(
    'AllyService: parses assigned allies, levels, and boost hints',
    async () => {
      const fixture = loadFixture('AllyService.getAssignedAllies.json');
      const service = new AllyService();

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'AllyService',
        requestMethod: 'getAssignedAllies',
        responseData: fixture,
      };

      const res = service.getAssignedAllies(msg);
      assert.equal(res.success, true);
      assert.equal(service.assignedAllies.length, 4);

      const morgan = service.getAllyById(68088);
      assert.ok(morgan);
      assert.equal(morgan.allyId, 'morgan_le_fay');
      assert.equal(morgan.level, 100);
      assert.equal(morgan.rarity, 'epic');
      assert.equal(morgan.mapEntityId, 35422);
      assert.equal(morgan.boosts.length, 3);
      assert.equal(morgan.boosts[0].type, 'att_boost_attacker');
      assert.equal(morgan.boosts[0].value, 105);
      assert.equal(morgan.boosts[0].targetedFeature, 'all');

      // Spartan soldiers lookup
      const spartans = service.getAlliesByAllyId('spartan_soldier');
      assert.equal(spartans.length, 3);
      assert.equal(spartans[0].level, 100);

      // Boost aggregation across allies
      const allyBoosts = service.getTotalAllyBoosts();
      assert.ok(BigNumber.isBigNumber(allyBoosts.all.attackingAttack));
      // Morgan has 105 att_boost_attacker (all). Let's verify sum
      assert.ok(allyBoosts.all.attackingAttack.isGreaterThan(0));

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchRes.succeeded, 1);
    },
  );

  // Test 5: InventoryService (Inventory items & Great Buildings)
  await t.test(
    'InventoryService: categorizes items, kits, fragments, and calculates FP & blueprints',
    async () => {
      const itemsFixture = loadFixture('InventoryService.getItems.json');
      const gbFixture = loadFixture('InventoryService.getGreatBuildings.json');
      const service = new InventoryService();

      const itemsMsg = {
        __class__: 'ServerRequest',
        requestClass: 'InventoryService',
        requestMethod: 'getItems',
        responseData: itemsFixture,
      };

      const gbMsg = {
        __class__: 'ServerRequest',
        requestClass: 'InventoryService',
        requestMethod: 'getGreatBuildings',
        responseData: gbFixture,
      };

      const itemsRes = service.getItems(itemsMsg);
      assert.equal(itemsRes.success, true);
      assert.equal(itemsRes.total, itemsFixture.length);
      assert.ok(BigNumber.isBigNumber(itemsRes.totalForgePoints));
      assert.equal(itemsRes.totalForgePoints.toString(), '340560');

      const kits = service.getKits();
      assert.ok(kits.length > 0);
      assert.ok(kits.every((k) => k.isKit()));

      const fragments = service.getFragments();
      assert.ok(fragments.length > 0);

      const gbRes = service.getGreatBuildings(gbMsg);
      assert.equal(gbRes.success, true);
      assert.equal(gbRes.total, gbFixture.length);

      const aiCore = service.getGreatBuildingById(
        'X_SpaceAgeJupiterMoon_Landmark1',
      );
      assert.ok(aiCore);
      assert.equal(aiCore.name, 'A.I. Core');
      assert.ok(aiCore.getTotalBlueprints().isGreaterThan(0));

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([itemsMsg, gbMsg]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 6: OutpostService (Cultural settlements and Era outposts)
  await t.test(
    'OutpostService: tracks cultural settlements and active era outposts',
    async () => {
      const allFixture = loadFixture('OutpostService.getAll.json');
      const eraFixture = loadFixture('OutpostService.startEraOutpost.json');
      const service = new OutpostService();

      const allMsg = {
        __class__: 'ServerRequest',
        requestClass: 'OutpostService',
        requestMethod: 'getAll',
        responseData: allFixture,
      };

      const eraMsg = {
        __class__: 'ServerRequest',
        requestClass: 'OutpostService',
        requestMethod: 'startEraOutpost',
        responseData: eraFixture,
      };

      const allRes = service.getAll(allMsg);
      assert.equal(allRes.success, true);
      assert.equal(allRes.total, 7);

      const pirates = service.getSettlementByContent('pirates');
      assert.ok(pirates);
      assert.equal(pirates.name, 'Pirates Settlement');
      assert.equal(pirates.minEra, 'ColonialAge');

      const eraRes = service.startEraOutpost(eraMsg);
      assert.equal(eraRes.success, true);
      assert.ok(service.getActiveEraOutpost());
      assert.equal(service.getActiveEraOutpost().content, 'space_hub');

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([allMsg, eraMsg]);
      assert.equal(dispatchRes.succeeded, 2);

      // Advancement handling and remaining costs
      const advMsg = {
        __class__: 'ServerRequest',
        requestClass: 'AdvancementService',
        requestMethod: 'getAll',
        responseData: [
          {
            id: 'axe_smith',
            name: 'Axe Smith',
            isUnlocked: true,
            requirements: { resources: { copper_coins: 500 } },
          },
          {
            id: 'mead_brewery',
            name: 'Mead Brewery',
            isUnlocked: false,
            requirements: { resources: { axes: 25, copper_coins: 1000 } },
          },
          {
            id: 'shrine',
            name: 'Shrine',
            isUnlocked: false,
            requirements: { resources: { axes: 15, mead: 20 } },
          },
        ],
      };

      const advRes = service.handleAdvancements(advMsg);
      assert.equal(advRes.success, true);
      assert.equal(advRes.total, 3);
      assert.equal(advRes.unlocked, 1);
      assert.equal(advRes.remainingCosts.axes, 40);
      assert.equal(advRes.remainingCosts.mead, 20);
      assert.equal(advRes.remainingCosts.copper_coins, 1000);

      // Unlock next advancement
      const unlockRes = service.handleUnlockAdvancement({
        responseData: { __class__: 'Success' },
      });
      assert.equal(unlockRes.success, true);
      assert.equal(service.getRemainingCosts().axes, 15);
      assert.equal(service.getRemainingCosts().copper_coins ?? 0, 0);

      const advDispatch = await dispatcher.dispatchBatch([advMsg]);
      assert.equal(advDispatch.succeeded, 1);
    },
  );
});
