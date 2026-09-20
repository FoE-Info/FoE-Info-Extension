import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  ALL_15_PANEL_IDS,
  applyCardVisibility,
  CONTEXT_ALLOWED_PANELS,
  GAME_CONTEXTS,
  getAllowedPanelsForView,
  getCurrentView,
  onViewChange,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

const ALL_KNOWN_PANELS = [
  ...ALL_15_PANEL_IDS,
  'citystats',
  'cityrewards',
  'bonus',
  'galaxy',
  'invested',
  'greatbuilding',
  'donation',
  'donation2',
  'donation2DIV',
  'donationDIV2',
  'guild',
  'treasuryLog',
  'goods',
  'targets',
  'battleground',
  'geInternationalSection',
  'geContributionSection',
  'quantumContributions',
  'quantumLeaderboard',
  'cultural',
  'visit',
  'friends',
  'hood',
  'overview',
  'info',
  'buildings',
  'leaderboard',
];

const DISALLOWED_BY_CONTEXT = {
  OWN_CITY: [
    'gbgTargetGenerator',
    'targets',
    'battlegrounds',
    'battleground',
    'gbgLeaderboard',
    'cultural',
    'visit',
    'geContributions',
  ],
  GBG: [
    'incidents',
    'gbDonation',
    'gbInfo',
    'gbContributors',
    'geChampionship',
    'geContributions',
    'goodsInventory',
    'guildOverview',
    'treasury',
    'cultural',
    'visit',
  ],
  GE: [
    'incidents',
    'gbgTargetGenerator',
    'targets',
    'battlegrounds',
    'battleground',
    'gbgLeaderboard',
    'quantumContributions',
    'quantumLeaderboard',
    'cultural',
    'visit',
    'friends',
  ],
  QI: [
    'incidents',
    'gbDonation',
    'gbgTargetGenerator',
    'battlegrounds',
    'gbgLeaderboard',
    'geChampionship',
    'geContributions',
    'cultural',
    'visit',
  ],
  SETTLEMENT: [
    'army',
    'rewards',
    'cityrewards',
    'gbDonation',
    'gbgTargetGenerator',
    'battlegrounds',
    'gbgLeaderboard',
    'bonus',
    'visit',
  ],
  OTHER_PLAYER: [
    'incidents',
    'army',
    'rewards',
    'bonus',
    'galaxy',
    'cultural',
    'gbgLeaderboard',
    'quantumContributions',
  ],
};

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      id: '',
      innerHTML: '',
      style: { display: '' },
      parentNode: null,
      children: [],
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
    };
  }

  const doc = {
    createElement,
    body: createElement('body'),
    getElementById(id) {
      if (!elementsById.has(id)) {
        const el = createElement('div');
        el.id = id;
        elementsById.set(id, el);
      }
      return elementsById.get(id);
    },
    querySelectorAll(selector) {
      const results = [];
      if (selector === '.debug-stub') {
        for (const el of elementsById.values()) {
          if (el.innerHTML && el.innerHTML.includes('debug-stub')) {
            const stub = createElement('div');
            stub.className = 'debug-stub';
            stub.parentNode = el;
            results.push(stub);
          }
        }
      }
      return results;
    },
  };

  globalThis.document = doc;
  globalThis.window = { addEventListener: () => {} };

  for (const id of ALL_KNOWN_PANELS) {
    doc.getElementById(id).innerHTML = `<span>Content for ${id}</span>`;
  }

  return { doc, elementsById };
}

function createMockDispatcher() {
  const handlers = new Map();
  return {
    handlers,
    register(requestClass, requestMethod, handlerFn) {
      handlers.set(`${requestClass}.${requestMethod}`, handlerFn);
      return this;
    },
    registerDirectMetadata() {
      return this;
    },
    setDirectMetadataHandler() {
      return this;
    },
    invoke(requestClass, requestMethod, msg = {}, ctx = {}) {
      const fn = handlers.get(`${requestClass}.${requestMethod}`);
      assert.ok(
        fn,
        `expected a registered handler for ${requestClass}.${requestMethod}`,
      );
      return fn(msg, ctx);
    },
  };
}

describe('6-Context Panel Visibility Engine', () => {
  beforeEach(() => {
    createMockDOM();
    setCurrentView(null);
  });

  it('exposes exactly the six canonical game contexts', () => {
    assert.deepEqual(GAME_CONTEXTS, [
      'OWN_CITY',
      'GBG',
      'GE',
      'QI',
      'SETTLEMENT',
      'OTHER_PLAYER',
    ]);

    for (const context of GAME_CONTEXTS) {
      assert.ok(
        Array.isArray(CONTEXT_ALLOWED_PANELS[context]),
        `CONTEXT_ALLOWED_PANELS.${context} must be an array`,
      );
      assert.ok(CONTEXT_ALLOWED_PANELS[context].includes('header'));
      assert.ok(CONTEXT_ALLOWED_PANELS[context].includes('citystats'));
    }

    assert.ok(CONTEXT_ALLOWED_PANELS.GBG.includes('gbgTargetGenerator'));
    assert.ok(CONTEXT_ALLOWED_PANELS.GE.includes('geChampionship'));
    assert.ok(CONTEXT_ALLOWED_PANELS.QI.includes('quantumContributions'));
    assert.ok(CONTEXT_ALLOWED_PANELS.SETTLEMENT.includes('cultural'));
    assert.ok(CONTEXT_ALLOWED_PANELS.OTHER_PLAYER.includes('visit'));
  });

  it('transitions across all six contexts and ignores duplicate transitions', () => {
    const transitions = [];
    const unsubscribe = onViewChange((view) => transitions.push(view));

    setCurrentView('GBG');
    setCurrentView('GE');
    setCurrentView('QI');
    setCurrentView('SETTLEMENT');
    setCurrentView('OTHER_PLAYER');
    setCurrentView('OWN_CITY');
    setCurrentView('OWN_CITY');

    assert.deepEqual(transitions, [
      'GBG',
      'GE',
      'QI',
      'SETTLEMENT',
      'OTHER_PLAYER',
      'OWN_CITY',
    ]);
    unsubscribe();
  });

  it('GE allowed panels expand to include the hidden donationDIV2 wrapper', () => {
    const allowed = getAllowedPanelsForView('GE');
    assert.ok(allowed.has('geChampionship'));
    assert.ok(allowed.has('donationDIV2'));
    assert.ok(allowed.has('geContributionSection'));
    assert.ok(allowed.has('geInternationalSection'));
  });

  it('normalizes legacy CITY/MAIN aliases to OWN_CITY', () => {
    setCurrentView('CITY');
    assert.equal(getCurrentView(), 'OWN_CITY');

    setCurrentView('MAIN');
    assert.equal(getCurrentView(), 'OWN_CITY');
  });

  for (const context of [
    'OWN_CITY',
    'GBG',
    'GE',
    'QI',
    'SETTLEMENT',
    'OTHER_PLAYER',
  ]) {
    it(`${context}: reveals allowed panels and hides disallowed panels`, () => {
      setCurrentView(context);
      assert.equal(getCurrentView(), context);

      for (const allowedId of CONTEXT_ALLOWED_PANELS[context]) {
        const el = document.getElementById(allowedId);
        assert.equal(
          el.style.display,
          '',
          `Allowed panel #${allowedId} must be visible in ${context}`,
        );
      }

      for (const blockedId of DISALLOWED_BY_CONTEXT[context]) {
        const el = document.getElementById(blockedId);
        assert.equal(
          el.style.display,
          'none',
          `Disallowed panel #${blockedId} must be hidden in ${context}`,
        );
      }
    });
  }

  it('debug mode respects context visibility without injecting stubs into panels', () => {
    setCurrentView('GBG');
    applyCardVisibility(null, true, 'GBG');

    const visible = [
      'header',
      'army',
      'rewards',
      'gbgTargetGenerator',
      'battlegrounds',
      'gbgLeaderboard',
    ];
    for (const id of visible) {
      const el = document.getElementById(id);
      assert.equal(el.style.display, '', `Panel #${id} must be visible`);
      assert.ok(
        !el.innerHTML.includes('[DEBUG STUB]'),
        `Visible panel #${id} must not contain a debug stub`,
      );
      assert.ok(
        el.innerHTML.includes(`Content for ${id}`),
        `Panel #${id} must retain its raw content`,
      );
    }

    for (const id of [
      'geContributions',
      'gbContributors',
      'gbDonation',
      'goodsInventory',
      'treasury',
      'incidents',
    ]) {
      const el = document.getElementById(id);
      assert.equal(
        el.style.display,
        'none',
        `Panel #${id} must stay hidden in GBG debug mode`,
      );
      assert.ok(
        !el.innerHTML.includes('[DEBUG STUB]'),
        `Hidden panel #${id} must not be stubbed`,
      );
    }
  });

  it('debug mode preserves QI contribution and leaderboard panels without stubs', () => {
    setCurrentView('QI');
    applyCardVisibility(null, true, 'QI');

    for (const id of ['quantumContributions', 'quantumLeaderboard']) {
      const el = document.getElementById(id);
      assert.equal(el.style.display, '', `Panel #${id} must be visible`);
      assert.ok(
        !el.innerHTML.includes('[DEBUG STUB]'),
        `Panel #${id} must not contain a debug stub`,
      );
      assert.ok(
        el.innerHTML.includes(`Content for ${id}`),
        `Panel #${id} must retain its content`,
      );
    }
  });
});

describe('Protocol Route Context Wiring', () => {
  beforeEach(() => {
    createMockDOM();
    setCurrentView(null);
  });

  it('CityMapService.getEntities restores OWN_CITY after leaving the city', async () => {
    setCurrentView('GBG');
    const { cityMapService } =
      await import('../../src/js/msg/CityMapService.js');

    const dispatcher = createMockDispatcher();
    cityMapService.register(dispatcher, {
      MyInfo: { id: 1, name: 'me' },
      gbRegistry: { registerGreatBuilding() {} },
    });

    dispatcher.invoke('CityMapService', 'getEntities', { responseData: [] });
    assert.equal(getCurrentView(), 'OWN_CITY');
  });

  it('CityMapService.getCityMap maps gridId to SETTLEMENT, QI and OWN_CITY', async () => {
    const { cityMapService } =
      await import('../../src/js/msg/CityMapService.js');

    const dispatcher = createMockDispatcher();
    cityMapService.register(dispatcher, {
      MyInfo: { id: 1, name: 'me' },
      gbRegistry: { registerGreatBuilding() {} },
    });

    dispatcher.invoke('CityMapService', 'getCityMap', {
      responseData: { gridId: 'cultural_outpost' },
    });
    assert.equal(getCurrentView(), 'SETTLEMENT');

    dispatcher.invoke('CityMapService', 'getCityMap', {
      responseData: { gridId: 'guild_raids' },
    });
    assert.equal(getCurrentView(), 'QI');

    dispatcher.invoke('CityMapService', 'getCityMap', {
      responseData: { gridId: 'city' },
    });
    assert.equal(getCurrentView(), 'OWN_CITY');
  });

  it('combat routes switch to GBG and GE', async () => {
    const { guildBattlegroundService } =
      await import('../../src/js/msg/GuildBattlegroundService.js');
    const { guildExpeditionService } =
      await import('../../src/js/msg/GuildExpeditionService.js');

    const dispatcher = createMockDispatcher();
    guildBattlegroundService.register(dispatcher, {
      setCurrentView,
      getBattleground: () => {},
      getState: () => {},
    });
    guildExpeditionService.register(dispatcher, {
      setCurrentView,
      guildExpeditionService: () => {},
    });

    dispatcher.invoke('GuildBattlegroundService', 'getBattleground', {});
    assert.equal(getCurrentView(), 'GBG');

    dispatcher.invoke('GuildExpeditionService', 'getOverview', {});
    assert.equal(getCurrentView(), 'GE');
  });

  it('quantum routes switch to QI', async () => {
    const { guildRaidsService } =
      await import('../../src/js/msg/GuildRaidsService.js');

    const dispatcher = createMockDispatcher();
    guildRaidsService.register(dispatcher);

    dispatcher.invoke('GuildRaidsMapService', 'getOverview', {});
    assert.equal(getCurrentView(), 'QI');
  });

  it('OtherPlayerService.visitPlayer switches to OTHER_PLAYER', async () => {
    const { otherPlayerService } =
      await import('../../src/js/msg/OtherPlayerService.js');

    const dispatcher = createMockDispatcher();
    otherPlayerService.register(dispatcher, {
      otherPlayerService: () => {},
      MyInfo: { id: 1, name: 'me' },
      gbRegistry: { registerGreatBuildings() {} },
      showOptions: { showVisit: true },
    });

    dispatcher.invoke('OtherPlayerService', 'visitPlayer', {
      responseData: {
        other_player: { player_id: 2, name: 'neighbor' },
        city_map: { entities: [] },
      },
    });
    assert.equal(getCurrentView(), 'OTHER_PLAYER');
  });
});
