import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import rateParserPkg from '../../src/js/fn/rateParser.js';
import autoAidPkg from '../../src/js/msg/AutoAidService.js';
import tavernPkg from '../../src/js/msg/FriendsTavernService.js';
import exchangePkg from '../../src/js/msg/ItemExchangeService.js';
import questPkg from '../../src/js/msg/QuestService.js';
import timePkg from '../../src/js/msg/TimeService.js';
import treasuryPkg from '../../src/js/msg/TreasuryService.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { extractRateFromTitle } = rateParserPkg;
const { MessageDispatcher } = dispatcherPkg;
const { AutoAidService } = autoAidPkg;
const { FriendsTavernService } = tavernPkg;
const { TreasuryService } = treasuryPkg;
const { QuestService } = questPkg;
const { ItemExchangeService } = exchangePkg;
const { TimeService } = timePkg;

function loadFixture(filename) {
  const filePath = new URL(
    `../../tests/fixtures/rpc/${filename}`,
    import.meta.url,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('Domain Services Protocol & Parsing - Social & Economy Suite', async (t) => {
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

  // Test 13: ConversationService rate parser
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
});
