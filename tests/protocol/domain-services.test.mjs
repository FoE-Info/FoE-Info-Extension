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
import outpostPkg from '../../src/js/msg/OutpostService.js';
import questPkg from '../../src/js/msg/QuestService.js';
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
    `../../metadata-store/rpc/${filename}`,
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
      assert.equal(service.incidents.length, 15);

      const first = service.incidents[0];
      assert.equal(first.hiddenRewardId, 330345162);
      assert.equal(first.type, 'incident_pothole_1x1');
      assert.equal(first.rarity, 'common');
      assert.equal(first.formattedRarity, 'Common');
      assert.equal(first.positionContext, 'cityRoadSmall');
      assert.equal(first.startTime, 1788513585);
      assert.equal(first.expireTime, 1788599985);
      assert.equal(first.durationSeconds, 86400);

      // Assert expiration calculations
      const nowBeforeExpire = 1788520000;
      assert.equal(first.isExpired(nowBeforeExpire), false);
      assert.equal(
        first.remainingSeconds(nowBeforeExpire),
        1788599985 - 1788520000,
      );

      const nowAfterExpire = 1788600000;
      assert.equal(first.isExpired(nowAfterExpire), true);
      assert.equal(first.remainingSeconds(nowAfterExpire), 0);

      // Breakdown assertions
      const rarities = service.getRarityBreakdown();
      assert.ok(rarities.common > 0);
      assert.ok(rarities.uncommon > 0);
      assert.ok(rarities.rare > 0);
      assert.equal(rarities.common + rarities.uncommon + rarities.rare, 15);

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
        assert.equal(rewards.length, 15);
        assert.equal(incidents.length, 15);
      });

      service.getOverview(msg);
      assert.equal(mockState.hiddenRewards.length, 15);
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
      assert.equal(service.dailyPointsCollectionAvailableAt, 1788562800);
      assert.equal(service.dailyBonusPointsCollectionAvailableAt, 1788476400);
      assert.equal(service.dailyRewardCollectionAvailableAt, 1788562800);

      // Timestamps and availability helpers
      const pastTime = 1788400000;
      const futureTime = 1788600000;
      assert.equal(service.isDailyRewardAvailable(pastTime), false);
      assert.equal(service.isDailyRewardAvailable(futureTime), true);
      assert.equal(service.isDailyBonusPointsAvailable(1788476500), true);

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
      assert.equal(res.totalEntries, 1013);

      // Aggregated feature matrices
      const stats = service.getAggregatedBoosts();

      // Universal 'all' boosts
      assert.ok(BigNumber.isBigNumber(stats.all.attackingAttack));
      assert.equal(stats.all.attackingAttack.toString(), '22580');
      assert.equal(stats.all.attackingDefense.toString(), '22210');
      assert.equal(stats.all.defendingAttack.toString(), '22040');
      assert.equal(stats.all.defendingDefense.toString(), '23127');

      // Feature-specific addon boosts
      assert.equal(stats.battleground.attackingAttack.toString(), '16415');
      assert.equal(stats.battleground.attackingDefense.toString(), '16679');
      assert.equal(stats.guild_expedition.attackingAttack.toString(), '9528');
      assert.equal(stats.guild_expedition.attackingDefense.toString(), '11936');
      assert.equal(stats.guild_raids.attackingAttack.toString(), '923');
      assert.equal(stats.guild_raids.attackingDefense.toString(), '687');

      // Total combined boosts (all + feature)
      const gbgTotal = service.getTotalBoost('battleground', 'attackingAttack');
      assert.ok(BigNumber.isBigNumber(gbgTotal));
      assert.equal(gbgTotal.toString(), '38995'); // 22580 + 16415

      const geDefTotal = service.getTotalBoost(
        'guild_expedition',
        'attackingDefense',
      );
      assert.equal(geDefTotal.toString(), '34146'); // 22210 + 11936

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
      assert.equal(itemsRes.total, 365);
      assert.ok(BigNumber.isBigNumber(itemsRes.totalForgePoints));
      assert.equal(itemsRes.totalForgePoints.toString(), '291980');

      const kits = service.getKits();
      assert.ok(kits.length > 0);
      assert.ok(kits.every((k) => k.isKit()));

      const fragments = service.getFragments();
      assert.ok(fragments.length > 0);

      const gbRes = service.getGreatBuildings(gbMsg);
      assert.equal(gbRes.success, true);
      assert.equal(gbRes.total, 49);

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
      assert.equal(res.total, 3);
      assert.equal(res.totalAvailable, 76 + 73 + 126);

      const neighbor = service.getState('neighbor');
      assert.ok(neighbor);
      assert.equal(neighbor.availablePeers, 76);
      assert.equal(neighbor.totalPeers, 76);
      assert.equal(neighbor.isIdle(), true);
      assert.equal(service.canAid('neighbor'), true);

      const guild = service.getState('guild');
      assert.ok(guild);
      assert.equal(guild.availablePeers, 73);

      const friend = service.getState('friend');
      assert.ok(friend);
      assert.equal(friend.availablePeers, 126);

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
      assert.equal(statesRes.total, 126);

      const breakdown = service.getStateBreakdown();
      assert.ok(Object.keys(breakdown).length > 0);

      const countRes = service.getSittingPlayersCount(countMsg);
      assert.equal(countRes.success, true);
      assert.equal(countRes.count, 3);
      assert.equal(service.getSittingCount(), 3);
      assert.deepEqual(service.getSittingPlayers(), [7560963, 16, 16]);

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

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([bagMsg, logsMsg]);
      assert.equal(dispatchRes.succeeded, 2);
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
      assert.equal(updatesRes.total, 14);
      assert.ok(service.getActiveQuests().length > 0);

      const storyQuest = service.getQuestById(17600);
      assert.ok(storyQuest);
      assert.equal(storyQuest.title, 'A New World');
      assert.equal(storyQuest.type, 'story');
      assert.equal(storyQuest.isActive(), true);

      const periodsRes = service.getQuestPeriods(periodsMsg);
      assert.equal(periodsRes.success, true);
      assert.equal(periodsRes.total, 1);

      const categoryRes = service.getQuestCategoryTimes(categoryMsg);
      assert.equal(categoryRes.success, true);
      assert.equal(categoryRes.categoryTimes.nextUpdateTime, 1789887600);

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
      assert.equal(service.getServerTime(), 1788561576);
      assert.ok(typeof service.getTimeDelta() === 'number');

      const mockClientNowMs = 1788561500000;
      assert.equal(
        service.getSyncedServerTime(mockClientNowMs),
        1788561500 + service.getTimeDelta(),
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
        assert.equal(time, 1788561576);
      });

      service.updateTime(updateMsg);
      assert.equal(mockState.EpocTime, 1788561576);
      assert.equal(renderedFromTime, true);
      assert.equal(timeCallbackTriggered, true);

      // Dispatcher integration
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([updateMsg, getMsg]);
      assert.equal(dispatchRes.succeeded, 2);
    },
  );

  // Test 13: Global singletons auto-registered with default messageDispatcher
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
      assert.equal(res.strategy_points, 1524);
      assert.equal(res.advanced_dna_data, 49993);
      assert.equal(res.asteroid_ice, 27227);
      assert.equal(res.mars_ore, 23231);
      assert.equal(res.promethium, 70506);
      assert.equal(res.orichalcum, 67762);
      assert.equal(res.money, 52323151472);
      assert.equal(res.supplies, 22010949234);

      // Assert Resources export and availableFP updated
      assert.equal(resourcePkg.Resources.strategy_points, 1524);
      assert.equal(resourcePkg.availableFP, 1524);

      // Test direct payload format
      const directRes = getPlayerResources(fixture);
      assert.equal(directRes.strategy_points, 1524);
      assert.equal(directRes.mars_ore, 23231);

      // Dispatcher integration via legacy bridge
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, { getPlayerResources });
      const dispatchRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchRes.succeeded, 1);
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
        sadRes.unitsPerEra.some((u) =>
          u.text.startsWith('SAD: FGX-102 Anvil 500'),
        ),
        'Expected SAD unit FGX-102 Anvil with SAD prefix',
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
      assert.equal(extractRateFromTitle('190% donation'), 190);
      assert.equal(extractRateFromTitle('195% group'), 195);
      assert.equal(extractRateFromTitle('Just general chat'), 190);
    },
  );
});
