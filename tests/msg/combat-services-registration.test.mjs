import assert from 'node:assert/strict';
import test from 'node:test';
import {
  armyUnitManagementService,
  ArmyUnitManagementService,
} from '../../src/js/msg/ArmyUnitManagementService.js';
import {
  guildBattlegroundService,
  GuildBattlegroundService,
} from '../../src/js/msg/GuildBattlegroundService.js';
import {
  guildExpeditionService,
  GuildExpeditionService,
} from '../../src/js/msg/GuildExpeditionService.js';
import { registerAllServices } from '../../src/js/msg/registerServices.js';
import {
  getCurrentView,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

test('Combat Services Registration Suite', async (t) => {
  await t.test('Combat services expose register API', () => {
    assert.equal(typeof guildBattlegroundService.register, 'function');
    assert.equal(typeof GuildBattlegroundService.register, 'function');
    assert.equal(typeof guildExpeditionService.register, 'function');
    assert.equal(typeof GuildExpeditionService.register, 'function');
    assert.equal(typeof armyUnitManagementService.register, 'function');
    assert.equal(typeof ArmyUnitManagementService.register, 'function');
  });

  await t.test(
    'GuildBattlegroundService.register wires all expected routes',
    () => {
      const registered = [];
      const mockDispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return mockDispatcher;
        },
      };

      guildBattlegroundService.register(mockDispatcher);

      const routeKeys = registered.map(([cls, m]) => `${cls}.${m}`);
      const expected = [
        'GuildBattlegroundService.getPlayerLeaderboard',
        'GuildBattlegroundService.getLeaderboard',
        'GuildBattlegroundService.getState',
        'GuildBattlegroundStateService.getState',
        'GuildBattlegroundService.getBattleground',
        'GuildBattlegroundService.getBuildings',
        'GuildBattlegroundBuildingService.getBuildings',
        'GuildBattlegroundService.getUpdatedProvinces',
        'GuildBattlegroundService.getProvinces',
        'GuildBattlegroundService.setSignal',
        'GuildBattlegroundSignalsService.setSignal',
        'GuildBattlegroundService.removeSignal',
        'GuildBattlegroundSignalsService.removeSignal',
        'GuildBattlegroundService.getAction',
        'GuildBattlegroundSignalsService.updateSignal',
        'GuildBattlegroundService.updateSignal',
      ];

      for (const exp of expected) {
        assert.ok(
          routeKeys.includes(exp),
          `Expected route ${exp} to be registered`,
        );
      }
    },
  );

  await t.test(
    'GuildExpeditionService.register wires all expected routes',
    () => {
      const registered = [];
      const mockDispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return mockDispatcher;
        },
      };

      guildExpeditionService.register(mockDispatcher);

      const routeKeys = registered.map(([cls, m]) => `${cls}.${m}`);
      const expected = [
        'ChampionshipService.getOverview',
        'GuildExpeditionService.getOverview',
        'GuildExpeditionService.getChestOverview',
        'GuildExpeditionService.getContributionList',
      ];

      for (const exp of expected) {
        assert.ok(
          routeKeys.includes(exp),
          `Expected route ${exp} to be registered`,
        );
      }
    },
  );

  await t.test(
    'ArmyUnitManagementService.register wires all expected routes',
    () => {
      const registered = [];
      const mockDispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return mockDispatcher;
        },
      };

      armyUnitManagementService.register(mockDispatcher);

      const routeKeys = registered.map(([cls, m]) => `${cls}.${m}`);
      const expected = [
        'ArmyUnitManagementService.getArmyInfo',
        'ArmyUnitManagementService.getArmyOverview',
        'ArmyUnitManagementService.getArmyArtillery',
      ];

      for (const exp of expected) {
        assert.ok(
          routeKeys.includes(exp),
          `Expected route ${exp} to be registered`,
        );
      }
    },
  );

  await t.test(
    'GuildBattlegroundService switches context to GBG on state and battleground',
    () => {
      const routes = new Map();
      const mockDispatcher = {
        register(cls, method, handler) {
          routes.set(`${cls}.${method}`, handler);
          return mockDispatcher;
        },
      };

      let stateCalled = false;
      let bgCalled = false;

      guildBattlegroundService.register(mockDispatcher, {
        setCurrentView,
        getState: () => {
          stateCalled = true;
        },
        getBattleground: () => {
          bgCalled = true;
        },
      });

      setCurrentView('OWN_CITY');
      routes.get('GuildBattlegroundService.getState')({});
      assert.equal(stateCalled, true);
      assert.equal(getCurrentView(), 'GBG');

      setCurrentView('OWN_CITY');
      routes.get('GuildBattlegroundStateService.getState')({});
      assert.equal(getCurrentView(), 'GBG');

      setCurrentView('OWN_CITY');
      routes.get('GuildBattlegroundService.getBattleground')({});
      assert.equal(bgCalled, true);
      assert.equal(getCurrentView(), 'GBG');
    },
  );

  await t.test(
    'GuildExpeditionService switches context to GE on overview',
    () => {
      const routes = new Map();
      const mockDispatcher = {
        register(cls, method, handler) {
          routes.set(`${cls}.${method}`, handler);
          return mockDispatcher;
        },
      };

      let geCalled = false;
      let champCalled = false;

      guildExpeditionService.register(mockDispatcher, {
        setCurrentView,
        guildExpeditionService: () => {
          geCalled = true;
        },
        championshipService: () => {
          champCalled = true;
        },
      });

      setCurrentView('OWN_CITY');
      routes.get('GuildExpeditionService.getOverview')({});
      assert.equal(geCalled, true);
      assert.equal(getCurrentView(), 'GE');

      setCurrentView('OWN_CITY');
      routes.get('ChampionshipService.getOverview')({});
      assert.equal(champCalled, true);
      assert.equal(getCurrentView(), 'GE');
    },
  );

  await t.test('Signals and conquest action route correctly', () => {
    const routes = new Map();
    const mockDispatcher = {
      register(cls, method, handler) {
        routes.set(`${cls}.${method}`, handler);
        return mockDispatcher;
      },
    };

    let lastSet = null;
    let lastRemove = null;

    guildBattlegroundService.register(mockDispatcher, {
      setSignal: (_msg, payload) => {
        lastSet = payload;
      },
      removeSignal: (_msg, payload) => {
        lastRemove = payload;
      },
    });

    // setSignal
    routes.get('GuildBattlegroundService.setSignal')(
      { requestData: [10, 'focus'] },
      null,
    );
    assert.deepEqual(lastSet, [10, 'focus']);

    // removeSignal
    routes.get('GuildBattlegroundService.removeSignal')(
      { requestData: [10] },
      null,
    );
    assert.deepEqual(lastRemove, [10]);

    // getAction with province_conquered
    routes.get('GuildBattlegroundService.getAction')(
      {
        responseData: { action: 'province_conquered' },
        requestData: [25],
      },
      null,
    );
    assert.deepEqual(lastRemove, [25]);

    // updateSignal with focus
    routes.get('GuildBattlegroundSignalsService.updateSignal')(
      { requestData: [30, 'focus'] },
      null,
    );
    assert.deepEqual(lastSet, [30, 'focus']);

    // updateSignal with clear
    routes.get('GuildBattlegroundSignalsService.updateSignal')(
      { requestData: [30, 'clear'] },
      null,
    );
    assert.deepEqual(lastRemove, [30, 'clear']);
  });

  await t.test('registerAllServices registers combat domain routes', () => {
    const registered = new Set();
    const testDispatcher = {
      register(cls, method) {
        registered.add(`${cls}.${method}`);
        return testDispatcher;
      },
    };

    registerAllServices(testDispatcher, { setCurrentView });

    assert.ok(
      registered.has('GuildBattlegroundService.getBattleground'),
      'GuildBattlegroundService routes must be registered by registerAllServices',
    );
    assert.ok(
      registered.has('GuildExpeditionService.getOverview'),
      'GuildExpeditionService routes must be registered by registerAllServices',
    );
    assert.ok(
      registered.has('ArmyUnitManagementService.getArmyInfo'),
      'ArmyUnitManagementService routes must be registered by registerAllServices',
    );
  });
});
