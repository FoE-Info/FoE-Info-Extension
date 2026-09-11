import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import rateParserPkg from '../../src/js/fn/rateParser.js';
import allyPkg from '../../src/js/msg/AllyService.js';
import armyPkg from '../../src/js/msg/ArmyUnitManagementService.js';
import autoAidPkg from '../../src/js/msg/AutoAidService.js';
import boostPkg from '../../src/js/msg/BoostService.js';
import castlePkg from '../../src/js/msg/CastleSystemService.js';
import tavernPkg from '../../src/js/msg/FriendsTavernService.js';
import hiddenPkg from '../../src/js/msg/HiddenRewardService.js';
import inventoryPkg from '../../src/js/msg/InventoryService.js';
import exchangePkg from '../../src/js/msg/ItemExchangeService.js';
import metadataPkg from '../../src/js/msg/MetadataService.js';
import outpostPkg from '../../src/js/msg/OutpostService.js';
import questPkg from '../../src/js/msg/QuestService.js';
import registryPkg from '../../src/js/msg/registerServices.js';
import resourcePkg from '../../src/js/msg/ResourceService.js';
import timePkg from '../../src/js/msg/TimeService.js';
import treasuryPkg from '../../src/js/msg/TreasuryService.js';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';
import storePkg from '../../src/js/state/MetadataStore.js';

const { extractRateFromTitle } = rateParserPkg;
const { MessageDispatcher, messageDispatcher } = dispatcherPkg;
const { metadataStore } = storePkg;
const { armyUnitManagementService, clearArmyUnits } = armyPkg;
const { HiddenRewardService, hiddenRewardService } = hiddenPkg;
const { CastleSystemService, castleSystemService } = castlePkg;
const { BoostService, boostService } = boostPkg;
const { AllyService, allyService } = allyPkg;
const { InventoryService, inventoryService } = inventoryPkg;
const { OutpostService, outpostService } = outpostPkg;
const { AutoAidService, autoAidService } = autoAidPkg;
const { FriendsTavernService, friendsTavernService } = tavernPkg;
const { TreasuryService, treasuryService } = treasuryPkg;
const { QuestService, questService } = questPkg;
const { ItemExchangeService, itemExchangeService } = exchangePkg;
const { TimeService, timeService } = timePkg;

function loadFixture(filename) {
  const filePath = new URL(
    `../../tests/fixtures/rpc/${filename}`,
    import.meta.url,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('Domain Services Protocol & Parsing Suite', async (t) => {
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

  // Test 7: AutoAidService (Auto-aid peer states and cooldowns)
  await t.test(
    'AutoAidService: parses aid targets across neighbors, guild, friends',
    async () => {
      const fixture = loadFixture('AutoAidService.getStates.json');
      const service = new AutoAidService();

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'AutoAidService',
        requestMethod: 'getStates',
        responseData: fixture,
      };

      const res = service.getStates(msg);
      assert.equal(res.success, true);
      assert.equal(res.total, fixture.length);
      assert.equal(
        res.totalAvailable,
        fixture.reduce((acc, s) => acc + s.availablePeers, 0),
      );

      const neighbor = service.getState('neighbor');
      assert.ok(neighbor);
      const neighborRaw = fixture.find((s) => s.id === 'neighbor');
      assert.equal(neighbor.availablePeers, neighborRaw.availablePeers);
      assert.equal(neighbor.totalPeers, neighborRaw.totalPeers);
      assert.equal(neighbor.isIdle(), true);
      assert.equal(service.canAid('neighbor'), true);

      const guild = service.getState('guild');
      assert.ok(guild);
      assert.equal(
        guild.availablePeers,
        fixture.find((s) => s.id === 'guild').availablePeers,
      );

      const friend = service.getState('friend');
      assert.ok(friend);
      assert.equal(
        friend.availablePeers,
        fixture.find((s) => s.id === 'friend').availablePeers,
      );

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchRes.succeeded, 1);
    },
  );

  // Test 8: FriendsTavernService (Tavern states and sitting count)
  await t.test(
    'FriendsTavernService: parses chair states and sitting players',
    async () => {
      const statesFixture = loadFixture(
        'FriendsTavernService.getOtherTavernStates.json',
      );
      const countFixture = loadFixture(
        'FriendsTavernService.getSittingPlayersCount.json',
      );
      const service = new FriendsTavernService();

      const statesMsg = {
        __class__: 'ServerRequest',
        requestClass: 'FriendsTavernService',
        requestMethod: 'getOtherTavernStates',
        responseData: statesFixture,
      };

      const countMsg = {
        __class__: 'ServerRequest',
        requestClass: 'FriendsTavernService',
        requestMethod: 'getSittingPlayersCount',
        responseData: countFixture,
      };

      const statesRes = service.getOtherTavernStates(statesMsg);
      assert.equal(statesRes.success, true);
      assert.equal(statesRes.total, statesFixture.length);

      const breakdown = service.getStateBreakdown();
      assert.ok(Object.keys(breakdown).length > 0);

      const countRes = service.getSittingPlayersCount(countMsg);
      assert.equal(countRes.success, true);
      assert.equal(countRes.count, countFixture.length);
      assert.equal(service.getSittingCount(), countFixture.length);
      assert.deepEqual(service.getSittingPlayers(), countFixture);

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([statesMsg, countMsg]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 9: TreasuryService (Guild treasury logs & reserves with BigNumber)
  await t.test(
    'TreasuryService: tracks reserves and logs with BigNumber precision',
    async () => {
      const service = new TreasuryService();

      const logsMsg = {
        __class__: 'ServerRequest',
        requestClass: 'ClanService',
        requestMethod: 'getTreasuryLogs',
        responseData: {
          logs: [
            {
              action: 'guild treasury donation',
              resource: 'medals',
              amount: 5000,
              player: { id: 1, name: 'KingArthur' },
              date: 1788500000,
            },
            {
              action: 'guild continent: slot unlocked',
              resource: 'medals',
              amount: 2000,
              player: { id: 1, name: 'KingArthur' },
              date: 1788510000,
            },
            {
              action: 'guild treasury donation',
              resource: 'iron',
              amount: 100,
              player: { id: 2, name: 'Lancelot' },
              date: 1788520000,
            },
          ],
        },
      };

      const bagMsg = {
        __class__: 'ServerRequest',
        requestClass: 'ResourceService',
        requestMethod: 'getTreasuryBag',
        responseData: [
          {
            type: { value: 'ClanMain' },
            resources: { iron: 15000, cloth: 20000, medals: 500000 },
          },
        ],
      };

      const bagRes = service.getTreasuryBag(bagMsg);
      assert.equal(bagRes.success, true);
      assert.equal(bagRes.totalReserves, 3);
      assert.ok(BigNumber.isBigNumber(service.getReserve('iron')));
      assert.equal(service.getReserve('iron').toString(), '15000');
      assert.equal(service.getReserve('medals').toString(), '500000');

      const logsRes = service.getTreasuryLogs(logsMsg);
      assert.equal(logsRes.success, true);
      assert.equal(logsRes.totalLogs, 3);
      assert.ok(BigNumber.isBigNumber(service.getTotalMedalsDonated()));
      assert.equal(service.getTotalMedalsDonated().toString(), '5000');
      assert.equal(service.getTotalMedalsSpent().toString(), '2000');
      assert.equal(service.getTotalGoodsDonated().toString(), '100');

      const arthur = service.getDonationsByPlayer('KingArthur');
      assert.equal(arthur.medalsDonated.toString(), '5000');
      assert.equal(arthur.medalsSpent.toString(), '2000');

      // ClanService.getTreasury test
      const getTreasuryMsg = {
        __class__: 'ServerRequest',
        requestClass: 'ClanService',
        requestMethod: 'getTreasury',
        responseData: {
          resources: { iron: 18000, cloth: 22000, medals: 600000 },
        },
      };
      const getRes = service.getTreasury(getTreasuryMsg);
      assert.equal(getRes.success, true);
      assert.equal(getRes.totalReserves, 3);
      assert.equal(service.getReserve('iron').toString(), '18000');

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([
        bagMsg,
        logsMsg,
        getTreasuryMsg,
      ]);
      assert.equal(dispatchRes.succeeded, 3);
    },
  );

  // Test 10: QuestService (Quests, periods, and category timers)
  await t.test(
    'QuestService: parses active quests, periods, and category times',
    async () => {
      const updatesFixture = loadFixture('QuestService.getUpdates.json');
      const periodsFixture = loadFixture('QuestService.getQuestPeriods.json');
      const categoryFixture = loadFixture(
        'QuestService.getQuestCategoryTimes.json',
      );
      const service = new QuestService();

      const updatesMsg = {
        __class__: 'ServerRequest',
        requestClass: 'QuestService',
        requestMethod: 'getUpdates',
        responseData: updatesFixture,
      };

      const periodsMsg = {
        __class__: 'ServerRequest',
        requestClass: 'QuestService',
        requestMethod: 'getQuestPeriods',
        responseData: periodsFixture,
      };

      const categoryMsg = {
        __class__: 'ServerRequest',
        requestClass: 'QuestService',
        requestMethod: 'getQuestCategoryTimes',
        responseData: categoryFixture,
      };

      const updatesRes = service.getUpdates(updatesMsg);
      assert.equal(updatesRes.success, true);
      assert.equal(updatesRes.total, updatesFixture.length);
      assert.ok(service.getActiveQuests().length > 0);

      const storyQuest = service.getQuestById(17600);
      assert.ok(storyQuest);
      assert.equal(storyQuest.title, 'A New World');
      assert.equal(storyQuest.type, 'story');
      assert.equal(storyQuest.isActive(), true);

      const periodsRes = service.getQuestPeriods(periodsMsg);
      assert.equal(periodsRes.success, true);
      assert.equal(periodsRes.total, periodsFixture.length);

      const categoryRes = service.getQuestCategoryTimes(categoryMsg);
      assert.equal(categoryRes.success, true);
      assert.equal(
        categoryRes.categoryTimes.nextUpdateTime,
        categoryFixture.nextUpdateTime,
      );

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([
        updatesMsg,
        periodsMsg,
        categoryMsg,
      ]);
      assert.equal(dispatchRes.succeeded, 3);
    },
  );

  // Test 11: ItemExchangeService (Antiques dealer configuration & slot unlocks)
  await t.test(
    'ItemExchangeService: parses exchange times, boosts, and slot unlocks',
    async () => {
      const fixture = loadFixture('ItemExchangeService.getConfig.json');
      const service = new ItemExchangeService();

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'ItemExchangeService',
        requestMethod: 'getConfig',
        responseData: fixture,
      };

      const res = service.getConfig(msg);
      assert.equal(res.success, true);
      assert.equal(res.exchangeTimesCount, 3);
      assert.equal(res.slotsCount, 5);

      const times = service.getExchangeTimes();
      assert.equal(times.length, 3);
      assert.equal(times[0].exchangeTime, 7200);
      assert.equal(times[0].outputModifier, 1);
      assert.equal(times[1].exchangeTime, 28800);
      assert.equal(times[1].outputModifier, 1.25);
      assert.equal(times[2].exchangeTime, 86400);
      assert.equal(times[2].outputModifier, 1.5);

      assert.equal(service.getRequiredExchangesForSlot(0), 0);
      assert.equal(service.getRequiredExchangesForSlot(1), 10);
      assert.equal(service.getOutputModifierForDuration(86400), 1.5);

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchRes.succeeded, 1);
    },
  );

  // Test 12: TimeService (Server clock synchronization and time formatting)
  await t.test(
    'TimeService: synchronizes server time and computes delta',
    async () => {
      const fixture = loadFixture('TimeService.updateTime.json');
      const service = new TimeService();

      const updateMsg = {
        __class__: 'ServerRequest',
        requestClass: 'TimeService',
        requestMethod: 'updateTime',
        responseData: fixture,
      };

      const getMsg = {
        __class__: 'ServerRequest',
        requestClass: 'TimeService',
        requestMethod: 'getTime',
        responseData: 1788561576,
      };

      const updateRes = service.updateTime(updateMsg);
      assert.equal(updateRes.success, true);
      assert.equal(service.getServerTime(), fixture.time);
      assert.ok(typeof service.getTimeDelta() === 'number');

      const mockClientNowMs = fixture.time * 1000 - 60000;
      assert.equal(
        service.getSyncedServerTime(mockClientNowMs),
        Math.floor(mockClientNowMs / 1000) + service.getTimeDelta(),
      );
      assert.ok(service.formatServerTime().includes('T'));

      // State & Time sync integration
      const mockState = {
        EpocTime: 0,
        setEpocTime(time) {
          this.EpocTime = Number(time);
        },
      };
      let renderedFromTime = false;
      const mockHelper = {
        fShowIncidents() {
          renderedFromTime = true;
        },
      };
      let timeCallbackTriggered = false;
      service.setState(mockState);
      service.setHelper(mockHelper);
      service.onUpdateTime((time) => {
        timeCallbackTriggered = true;
        assert.equal(time, fixture.time);
      });

      service.updateTime(updateMsg);
      assert.equal(mockState.EpocTime, fixture.time);
      assert.equal(renderedFromTime, true);
      assert.equal(timeCallbackTriggered, true);

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([updateMsg, getMsg]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 13: Global singletons registered by the central registry
  await t.test(
    'Singletons are instantiated and registered on messageDispatcher',
    async () => {
      assert.ok(hiddenRewardService instanceof HiddenRewardService);
      assert.ok(castleSystemService instanceof CastleSystemService);
      assert.ok(boostService instanceof BoostService);
      assert.ok(allyService instanceof AllyService);
      assert.ok(inventoryService instanceof InventoryService);
      assert.ok(outpostService instanceof OutpostService);
      assert.ok(autoAidService instanceof AutoAidService);
      assert.ok(friendsTavernService instanceof FriendsTavernService);
      assert.ok(treasuryService instanceof TreasuryService);
      assert.ok(questService instanceof QuestService);
      assert.ok(itemExchangeService instanceof ItemExchangeService);
      assert.ok(timeService instanceof TimeService);

      // Test routing via default messageDispatcher singleton across services
      registryPkg.registerAllServices(messageDispatcher);
      const hiddenFixture = loadFixture('HiddenRewardService.getOverview.json');
      const timeFixture = loadFixture('TimeService.updateTime.json');
      const batchRes = await messageDispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'HiddenRewardService',
          requestMethod: 'getOverview',
          responseData: hiddenFixture,
        },
        {
          __class__: 'ServerRequest',
          requestClass: 'TimeService',
          requestMethod: 'updateTime',
          responseData: timeFixture,
        },
      ]);
      assert.equal(batchRes.succeeded, 2);
      assert.deepEqual(
        batchRes.results.map(({ result }) => result.success),
        [true, true],
      );
    },
  );

  // Test 14: ResourceService (Player Resource Bag & Goods Inventory)
  await t.test(
    'ResourceService: parses playerResourceBag and extracts FP and goods',
    async () => {
      const { getPlayerResourceBag, getPlayerResources } = resourcePkg;
      const fixture = loadFixture('ResourceService.getPlayerResourceBag.json');

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'ResourceService',
        requestMethod: 'getPlayerResourceBag',
        responseData: fixture,
      };

      const res = getPlayerResourceBag(msg);
      assert.ok(res);
      assert.equal(res.strategy_points, 37732);
      assert.equal(res.advanced_dna_data, 49993);
      assert.equal(res.asteroid_ice, 27237);
      assert.equal(res.mars_ore, 23241);
      assert.equal(res.promethium, 70576);
      assert.equal(res.orichalcum, 67845);
      assert.equal(res.money, 52493792449);
      assert.equal(res.supplies, 22037079714);

      // Assert Resources export and availableFP updated
      assert.equal(resourcePkg.Resources.strategy_points, 37732);
      assert.equal(resourcePkg.availableFP, 37732);

      // Test direct payload format
      const directRes = getPlayerResources(fixture);
      assert.equal(directRes.strategy_points, 37732);
      assert.equal(directRes.mars_ore, 23241);

      // Dispatcher integration via legacy bridge and ResourceService.register
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, { getPlayerResources });
      if (resourcePkg.register) resourcePkg.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([
        msg,
        {
          __class__: 'ServerRequest',
          requestClass: 'TradeService',
          requestMethod: 'getTradeOffers',
          responseData: [],
        },
        {
          __class__: 'ServerRequest',
          requestClass: 'InventoryService',
          requestMethod: 'getItems',
          responseData: [],
        },
      ]);
      assert.equal(dispatchRes.succeeded, 3);
    },
  );

  // Test 15: ArmyUnitManagementService (Unit Counts & Rogue Calculations)
  await t.test(
    'ArmyUnitManagementService: parses armyInfo, calculates rogues and unit breakdown',
    async () => {
      clearArmyUnits();
      const fixture = {
        counts: [
          { unitTypeId: 'rogue', unattached: 50, attached: 10 },
          { unitTypeId: 'champion', unattached: 20, attached: 5 },
        ],
      };

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'ArmyUnitManagementService',
        requestMethod: 'getArmyInfo',
        responseData: fixture,
      };

      const res = armyUnitManagementService(msg);
      assert.ok(res);
      assert.equal(res.success, true);
      assert.equal(res.rogues, 60);
      assert.equal(res.allUnits, 25);
      assert.equal(res.totalUnits, 85);
      assert.equal(res.armyUnits['rogue'], 60);
      assert.equal(res.armyUnits['champion'], 25);

      // Direct array payload format
      const directRes = armyUnitManagementService({
        responseData: fixture.counts,
      });
      assert.ok(directRes);
      assert.equal(directRes.rogues, 60);
      assert.equal(directRes.allUnits, 25);

      // Dispatcher integration via legacy bridge
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, { armyUnitManagementService });

      const dispatchInfoRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchInfoRes.succeeded, 1);
      assert.equal(dispatchInfoRes.results[0].result.rogues, 60);

      const dispatchOverviewRes = await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ArmyUnitManagementService',
          requestMethod: 'getArmyOverview',
          responseData: fixture,
        },
      ]);
      assert.equal(dispatchOverviewRes.succeeded, 1);
      assert.equal(dispatchOverviewRes.results[0].result.rogues, 60);

      // Multi-era and Stellar Age Discovery (SAD) unit resolution
      metadataStore.registerUnits([
        {
          unitTypeId: 'StellarAgeDiscovery_heavy_melee',
          name: 'FGX-102 Anvil',
          era: 'StellarAgeDiscovery',
        },
        {
          unitTypeId: 'galactic_juggernaut',
          name: 'Galactic Juggernaut',
          era: 'SpaceAgeSpaceHub',
        },
        { unitTypeId: 'rifleman', name: 'Rifleman', era: 'IndustrialAge' },
      ]);

      const sadFixture = {
        counts: [
          { unitTypeId: 'StellarAgeDiscovery_heavy_melee', count: 500 },
          { unitTypeId: 'galactic_juggernaut', count: 141799 },
          { unitTypeId: 'rifleman', count: 674 },
        ],
      };
      const sadRes = armyUnitManagementService({
        responseData: sadFixture,
      });
      assert.ok(sadRes);
      assert.equal(sadRes.allUnits, 500 + 141799 + 674);
      assert.ok(
        sadRes.unitsPerEra.some((u) => u.text.startsWith('SAD: Anvil 500')),
        'Expected SAD unit Anvil with SAD prefix',
      );
      assert.ok(
        sadRes.unitsPerEra.some((u) =>
          u.text.startsWith('SASH: Galactic Juggernaut 141799'),
        ),
        'Expected SASH unit Galactic Juggernaut with SASH prefix',
      );
      assert.ok(
        sadRes.unitsPerEra.some((u) => u.text.startsWith('InA: Rifleman 674')),
        'Expected InA unit Rifleman with InA prefix',
      );
    },
  );

  // Test 16: ConversationService rate parser
  await t.test(
    'ConversationService: extracts donation rate from titles declaratively',
    () => {
      assert.equal(extractRateFromTitle('GB 1.9 Boost Thread'), 190);
      assert.equal(extractRateFromTitle('Arc 1.85 Thread'), 185);
      assert.equal(extractRateFromTitle('1.92 fast level'), 192);
      assert.equal(extractRateFromTitle('1,94 boost'), 194);
      assert.equal(extractRateFromTitle('2.0 level up'), 200);
      assert.equal(extractRateFromTitle('[secure @ 1.92]'), 192);
      assert.equal(extractRateFromTitle('190% donation'), 190);
      assert.equal(extractRateFromTitle('195% group'), 195);
      assert.equal(extractRateFromTitle('⚔️ GBG Leadership Team ⚔️'), 0);
      assert.equal(extractRateFromTitle('Just general chat'), 0);
      assert.equal(extractRateFromTitle('🛡️SSF & RE 1.9 thread 🛡️'), 190);
      assert.equal(extractRateFromTitle('Free 1.9 group'), 190);
      assert.equal(extractRateFromTitle('⚔️GbG Commanders⚔️ 59:25'), 0);
      assert.equal(
        extractRateFromTitle('======*1.94 The Original*======'),
        194,
      );
      assert.equal(extractRateFromTitle('😎lv100 Arc Thread 1.92😎'), 192);
      assert.equal(extractRateFromTitle('lvl 80 arc thread'), 0);
      assert.equal(extractRateFromTitle('lvl 180 arc thread'), 0);
      assert.equal(extractRateFromTitle('Arc Lv.180'), 0);
      assert.equal(extractRateFromTitle('Lv180 Arc Owners'), 0);
      assert.equal(extractRateFromTitle('Arc 90% lvl 80'), 0);
      assert.equal(extractRateFromTitle('lv180 1.92 secure'), 192);
      assert.equal(extractRateFromTitle('Arc lvl180 200%'), 200);
    },
  );

  // Test 17: Shared RPC keys are owned by modern services, not the bridge
  await t.test(
    'legacyBridge: defers BoostService.getAllBoosts to the modern service',
    async () => {
      const dispatcher = new MessageDispatcher();
      let captured = null;
      registerLegacyBridge(dispatcher, {
        boostServiceAllBoosts: (msg) => {
          captured = msg;
        },
      });

      const res = await dispatcher.dispatchSingle({
        __class__: 'ServerRequest',
        requestClass: 'BoostService',
        requestMethod: 'getAllBoosts',
        responseData: [],
      });

      assert.equal(captured, null);
      assert.deepEqual(res, {
        unhandled: true,
        requestClass: 'BoostService',
        requestMethod: 'getAllBoosts',
      });
    },
  );

  await t.test(
    'MetadataService: ResearchTechnology & AllyMetadata route to store without throwing',
    async () => {
      metadataStore.reset();
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {});
      const processEntry = metadataPkg.processMetadataEntry;

      processEntry({
        __class__: 'ResearchTechnology',
        id: 'tech_arc_extended',
        name: 'Extended Tests of the Arc',
        era: 'ProgressiveEra',
      });
      processEntry({
        __class__: 'AllyMetadata',
        id: 'ally_greek_warrior',
        name: 'Greek Warrior',
        era: 'IronAge',
      });

      assert.equal(metadataStore.technologies.size, 1);
      assert.equal(
        metadataStore.technologies.get('tech_arc_extended').name,
        'Extended Tests of the Arc',
      );
      assert.equal(metadataStore.allies.size, 1);
      assert.equal(
        metadataStore.allies.get('ally_greek_warrior').name,
        'Greek Warrior',
      );
    },
  );

  await t.test(
    'ResourceService: singular getResourceDefinition merges without wiping catalogue',
    async () => {
      resourcePkg.getResourceDefinitions({
        responseData: [
          { id: 'strategy_points', name: 'Forge Points', era: 'NoAge' },
          { id: 'goods_0', name: 'Current Era Goods', era: 'ContemporaryEra' },
        ],
      });
      const before = resourcePkg.ResourceDefs.length;

      resourcePkg.getResourceDefinition({
        responseData: { id: 'guild_power', name: 'Guild Power', era: 'NoAge' },
      });
      assert.equal(resourcePkg.ResourceDefs.length, before + 1);
      assert.equal(resourcePkg.ResourceNames.guild_power, 'Guild Power');

      resourcePkg.getResourceDefinition({
        responseData: {
          id: 'strategy_points',
          name: 'Forge Points (updated)',
          era: 'NoAge',
        },
      });
      assert.equal(
        resourcePkg.ResourceDefs.length,
        before + 1,
        'updated entry must not duplicate',
      );
      assert.equal(
        resourcePkg.ResourceNames.strategy_points,
        'Forge Points (updated)',
      );
    },
  );
});
