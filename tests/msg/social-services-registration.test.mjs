import assert from 'node:assert/strict';
import test from 'node:test';
import {
  conversationService,
  ConversationService,
} from '../../src/js/msg/ConversationService.js';
import {
  otherPlayerService,
  OtherPlayerService,
} from '../../src/js/msg/OtherPlayerService.js';
import { registerAllServices } from '../../src/js/msg/registerServices.js';
import {
  getCurrentView,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

test('OtherPlayerService & ConversationService Registration Suite', async (t) => {
  await t.test(
    'OtherPlayerService and ConversationService expose register API',
    () => {
      assert.equal(typeof otherPlayerService.register, 'function');
      assert.equal(typeof OtherPlayerService.register, 'function');
      assert.equal(typeof conversationService.register, 'function');
      assert.equal(typeof ConversationService.register, 'function');
    },
  );

  await t.test('OtherPlayerService.register wires all expected routes', () => {
    const registered = [];
    const mockDispatcher = {
      register(requestClass, method, handler) {
        registered.push([requestClass, method, handler]);
        return mockDispatcher;
      },
    };

    otherPlayerService.register(mockDispatcher);

    const routeKeys = registered.map(([cls, m]) => `${cls}.${m}`);
    const expected = [
      'OtherPlayerService.getEventsList',
      'OtherPlayerService.visitPlayer',
      'OtherPlayerService.updatePlayerActions',
      'OtherPlayerService.getSocialList',
      'OtherPlayerService.getFriendsList',
      'OtherPlayerService.getClanMemberList',
      'OtherPlayerService.getNeighborList',
      'OtherPlayerService.getNeighbourList',
      'OtherPlayerService.getOtherPlayerOverview',
      'ClanMemberService.getMemberList',
      'ClanService.getMembers',
      'ClanService.getOverview',
      'ClanService.getOwnClanData',
      'ClanService.getClanData',
      'GreatBuildingsService.getOtherPlayerOverview',
      'IgnorePlayerService.getIgnoreList',
      'OtherPlayerService.getOtherPlayerCityMapEntity',
    ];

    for (const exp of expected) {
      assert.ok(
        routeKeys.includes(exp),
        `Expected route ${exp} to be registered`,
      );
    }
  });

  await t.test('ConversationService.register wires all expected routes', () => {
    const registered = [];
    const mockDispatcher = {
      register(requestClass, method, handler) {
        registered.push([requestClass, method, handler]);
        return mockDispatcher;
      },
    };

    conversationService.register(mockDispatcher);

    const routeKeys = registered.map(([cls, m]) => `${cls}.${m}`);
    const expected = [
      'ConversationService.getTeasers',
      'ConversationService.getCategory',
      'ConversationService.getOverviewForCategory',
      'ConversationService.getOverview',
      'ConversationService.getNewMessage',
      'ConversationService.getConversation',
    ];

    for (const exp of expected) {
      assert.ok(
        routeKeys.includes(exp),
        `Expected route ${exp} to be registered`,
      );
    }
  });

  await t.test(
    'OtherPlayerService.visitPlayer switches view and registers GBs',
    () => {
      let registeredGbs = null;
      let registeredPid = null;
      let visitCalled = false;
      let clearCalled = false;

      const mockRegistry = {
        registerGreatBuildings(gbs, pid) {
          registeredGbs = gbs;
          registeredPid = pid;
        },
      };

      const handlers = {};
      const mockDispatcher = {
        register(cls, method, handler) {
          handlers[`${cls}.${method}`] = handler;
          return mockDispatcher;
        },
      };

      otherPlayerService.register(mockDispatcher, {
        gbRegistry: mockRegistry,
        showOptions: { showVisit: true },
        clearVisitPlayer: () => {
          clearCalled = true;
        },
        otherPlayerService: () => {
          visitCalled = true;
        },
        setCurrentView,
      });

      const handler = handlers['OtherPlayerService.visitPlayer'];
      assert.ok(handler);

      setCurrentView('OWN_CITY');
      handler(
        {
          responseData: {
            other_player: { player_id: 12345 },
            city_map: {
              entities: [{ id: 1, cityentity_id: 'X_AllAge_Expedition' }],
            },
          },
        },
        {},
      );

      assert.equal(getCurrentView(), 'OTHER_PLAYER');
      assert.equal(registeredPid, 12345);
      assert.equal(registeredGbs.length, 1);
      assert.equal(clearCalled, true);
      assert.equal(visitCalled, true);
    },
  );

  await t.test(
    'OtherPlayerService.getOtherPlayerCityMapEntity registers and syncs target',
    () => {
      let registeredGb = null;
      let registeredPid = null;
      const mockRegistry = {
        registerGreatBuilding(entity, pid) {
          registeredGb = entity;
          registeredPid = pid;
          return entity;
        },
      };

      const handlers = {};
      const mockDispatcher = {
        register(cls, method, handler) {
          handlers[`${cls}.${method}`] = handler;
          return mockDispatcher;
        },
      };

      const gbSelected = {};
      otherPlayerService.register(mockDispatcher, {
        gbRegistry: mockRegistry,
        GBselected: gbSelected,
        playerNameCache: { 999: 'CacheName' },
      });

      const handler =
        handlers['OtherPlayerService.getOtherPlayerCityMapEntity'];
      assert.ok(handler);

      handler({
        responseData: {
          player_id: 999,
          player_name: 'DirectName',
          cityentity_id: 'X_AllAge_Expedition',
        },
      });

      assert.equal(registeredPid, 999);
      assert.equal(registeredGb.cityentity_id, 'X_AllAge_Expedition');
      assert.equal(gbSelected.player, 999);
      assert.equal(gbSelected.player_name, 'CacheName');
    },
  );

  await t.test(
    'GreatBuildingsService.getOtherPlayerOverview registers GBs and updates actions',
    () => {
      const gbs = [];
      let updatedActions = null;

      const mockRegistry = {
        registerGreatBuilding(entity, pid) {
          gbs.push({ entity, pid });
        },
      };

      const handlers = {};
      const mockDispatcher = {
        register(cls, method, handler) {
          handlers[`${cls}.${method}`] = handler;
          return mockDispatcher;
        },
      };

      otherPlayerService.register(mockDispatcher, {
        gbRegistry: mockRegistry,
        otherPlayerServiceUpdateActions: (data) => {
          updatedActions = data;
        },
      });

      const handler = handlers['GreatBuildingsService.getOtherPlayerOverview'];
      assert.ok(handler);

      const payload = [
        { player_id: 111, cityentity_id: 'GB1' },
        { player_id: 222, cityentity_id: 'GB2' },
      ];

      handler({ responseData: payload });

      assert.equal(gbs.length, 2);
      assert.equal(gbs[0].pid, 111);
      assert.equal(gbs[1].pid, 222);
      assert.deepEqual(updatedActions, payload);
    },
  );

  await t.test('ClanService routes trigger guild update actions', () => {
    let guildRendered = null;
    let actionsUpdated = null;
    let autoExpand = false;

    const handlers = {};
    const mockDispatcher = {
      register(cls, method, handler) {
        handlers[`${cls}.${method}`] = handler;
        return mockDispatcher;
      },
    };

    otherPlayerService.register(mockDispatcher, {
      renderGuildPanel: (data) => {
        guildRendered = data;
      },
      otherPlayerServiceUpdateActions: (data, opts) => {
        actionsUpdated = data;
        autoExpand = opts?.autoExpandGuild;
      },
    });

    const clanHandler = handlers['ClanService.getOverview'];
    assert.ok(clanHandler);

    clanHandler({ responseData: { clan_id: 42, name: 'Top Guild' } });

    assert.deepEqual(guildRendered, { clan_id: 42, name: 'Top Guild' });
    assert.deepEqual(actionsUpdated, { clan_id: 42, name: 'Top Guild' });
    assert.equal(autoExpand, true);
  });

  await t.test('ConversationService routes invoke handlers properly', () => {
    const invocations = {};
    const handlers = {};
    const mockDispatcher = {
      register(cls, method, handler) {
        handlers[`${cls}.${method}`] = handler;
        return mockDispatcher;
      },
    };

    conversationService.register(mockDispatcher, {
      conversationService: (msg) => {
        invocations[msg.requestMethod] = true;
      },
      getConversation: (_msg) => {
        invocations.getConversation = true;
      },
      getNewMessage: (_msg) => {
        invocations.getNewMessage = true;
      },
    });

    handlers['ConversationService.getTeasers']({
      requestMethod: 'getTeasers',
    });
    handlers['ConversationService.getConversation']({
      requestMethod: 'getConversation',
    });
    handlers['ConversationService.getNewMessage']({
      requestMethod: 'getNewMessage',
    });

    assert.equal(invocations.getTeasers, true);
    assert.equal(invocations.getConversation, true);
    assert.equal(invocations.getNewMessage, true);
  });

  await t.test(
    'registerAllServices integrates social and conversations',
    () => {
      const registered = [];
      const mockDispatcher = {
        register(cls, method, _handler) {
          registered.push(`${cls}.${method}`);
          return mockDispatcher;
        },
      };

      registerAllServices(mockDispatcher);

      assert.ok(registered.includes('OtherPlayerService.visitPlayer'));
      assert.ok(registered.includes('ConversationService.getConversation'));
      assert.ok(registered.includes('ClanService.getOverview'));
      assert.ok(registered.includes('IgnorePlayerService.getIgnoreList'));
    },
  );
});
