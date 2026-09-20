import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GuildRaidsService,
  guildRaidsService,
} from '../../src/js/msg/GuildRaidsService.js';
import { registerAllServices } from '../../src/js/msg/registerServices.js';
import {
  getCurrentView,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

test('GuildRaidsService Registration & Context Switching', async (t) => {
  await t.test('exposes module singleton instance', () => {
    assert.ok(guildRaidsService instanceof GuildRaidsService);
    assert.equal(typeof guildRaidsService.register, 'function');
  });

  await t.test('register wires all 4 expected QI RPC routes', () => {
    const registered = [];
    const dispatcher = {
      register(requestClass, method, handler) {
        registered.push([requestClass, method, handler]);
        return dispatcher;
      },
    };

    const service = new GuildRaidsService();
    const result = service.register(dispatcher);

    assert.strictEqual(result, service);
    assert.deepEqual(
      registered.map(([cls, method]) => [cls, method]),
      [
        ['GuildRaidsService', 'getMemberActivityOverview'],
        ['RankingService', 'searchRanking'],
        ['GuildRaidsMapService', 'getOverview'],
        ['GuildRaidsService', 'getState'],
      ],
    );
  });

  await t.test(
    'registered handlers switch view to QI and delegate to service',
    () => {
      const handlers = new Map();
      const dispatcher = {
        register(requestClass, method, handler) {
          handlers.set(`${requestClass}.${method}`, handler);
          return dispatcher;
        },
      };

      const service = new GuildRaidsService();
      service.register(dispatcher);

      // Reset view to something other than QI
      setCurrentView('OWN_CITY');
      assert.equal(getCurrentView(), 'OWN_CITY');

      // Test GuildRaidsMapService.getOverview switches to QI
      const overviewHandler = handlers.get('GuildRaidsMapService.getOverview');
      assert.ok(overviewHandler);
      const overviewRes = overviewHandler({ responseData: { map: true } });
      assert.equal(getCurrentView(), 'QI');
      assert.equal(overviewRes.success, true);

      // Test GuildRaidsService.getState switches to QI
      setCurrentView('GBG');
      const stateHandler = handlers.get('GuildRaidsService.getState');
      assert.ok(stateHandler);
      const stateRes = stateHandler({ responseData: { state: 'active' } });
      assert.equal(getCurrentView(), 'QI');
      assert.equal(stateRes.success, true);

      // Test RankingService.searchRanking switches to QI and handles payload
      setCurrentView('GE');
      const rankingHandler = handlers.get('RankingService.searchRanking');
      assert.ok(rankingHandler);
      const rankingRes = rankingHandler({
        requestData: [{ value: 'guild_raids' }],
        responseData: {
          rankings: [
            {
              rank: 1,
              clan: { id: 10, name: 'Top Guild', membersNum: 50 },
              points: 9999,
              championshipsWon: 5,
            },
          ],
        },
      });
      assert.equal(getCurrentView(), 'QI');
      assert.equal(rankingRes.success, true);
      assert.equal(service.getLeaderboard().length, 1);
      assert.equal(service.getLeaderboard()[0].clanName, 'Top Guild');

      // Test GuildRaidsService.getMemberActivityOverview switches to QI
      setCurrentView('OTHER_PLAYER');
      const activityHandler = handlers.get(
        'GuildRaidsService.getMemberActivityOverview',
      );
      assert.ok(activityHandler);
      const activityRes = activityHandler({
        responseData: {
          rows: [
            {
              player_id: 1,
              name: 'Player1',
              progress: 10,
              action_points: 5,
            },
          ],
        },
      });
      assert.equal(getCurrentView(), 'QI');
      assert.equal(activityRes.success, true);
    },
  );

  await t.test(
    'register handles null or invalid dispatcher defensively',
    () => {
      const service = new GuildRaidsService();
      assert.strictEqual(service.register(null), service);
      assert.strictEqual(service.register({}), service);
      assert.strictEqual(service.register(undefined), service);
    },
  );

  await t.test(
    'registerAllServices wires guildRaidsService into central registry',
    () => {
      const registeredKeys = new Set();
      const dispatcher = {
        register(requestClass, method) {
          registeredKeys.add(`${requestClass}.${method}`);
          return dispatcher;
        },
      };

      registerAllServices(dispatcher);

      assert.ok(
        registeredKeys.has('GuildRaidsService.getMemberActivityOverview'),
      );
      assert.ok(registeredKeys.has('RankingService.searchRanking'));
      assert.ok(registeredKeys.has('GuildRaidsMapService.getOverview'));
      assert.ok(registeredKeys.has('GuildRaidsService.getState'));
    },
  );
});
