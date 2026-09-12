import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import statePkg from '../../src/js/state/ExpeditionState.js';
import '../../src/js/ui/expeditionRenderBinding.js';
import {
  guildExpeditionService,
  resetExpeditionCache,
} from '../../src/js/msg/GuildExpeditionService.js';
import { buildExpeditionContentHtml } from '../../src/js/ui/expeditionTables.js';

const { expeditionState } = statePkg;

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      children: [],
      childNodes: [],
      parentNode: null,
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode && child.parentNode.removeChild) {
          child.parentNode.removeChild(child);
        }
        child.parentNode = this;
        this.children.push(child);
        this.childNodes.push(child);
        if (child.id) {
          elementsById.set(child.id, child);
        }
        return child;
      },
      removeChild(child) {
        this.children = this.children.filter((c) => c !== child);
        this.childNodes = this.childNodes.filter((c) => c !== child);
        child.parentNode = null;
        return child;
      },
      contains(descendant) {
        let cur = descendant;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentNode;
        }
        return false;
      },
    };
    return el;
  }

  const document = {
    createElement,
    getElementById(id) {
      if (elementsById.has(id)) return elementsById.get(id);
      const el = createElement('div');
      el.id = id;
      elementsById.set(id, el);
      return el;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    body: createElement('body'),
  };

  return { document, elementsById };
}

describe('GuildExpeditionService with Trial Levels', () => {
  beforeEach(() => {
    expeditionState.reset();
    const mock = createMockDOM();
    global.window = {
      location: { origin: 'https://en16.forgeofempires.com' },
      addEventListener: () => {},
    };
    global.document = mock.document;
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('renders Member, Trial, Points, and Encounters columns in GE scoreboard', async () => {
    const donationDIV2 = document.getElementById('donationDIV2');

    assert.ok(donationDIV2, 'donationDIV2 should exist');

    const sampleContributionList = {
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getContributionList',
      responseData: [
        {
          player: { player_id: 101, name: 'AlphaPlayer' },
          currentTrial: 4,
          expeditionPoints: 64200,
          solvedEncounters: 48,
        },
        {
          player: { player_id: 102, name: 'BetaPlayer' },
          trial: 5,
          expeditionPoints: 120500,
          solvedEncounters: 64,
        },
        {
          player: { player_id: 103, name: 'GammaPlayer' },
          expeditionPoints: 1500,
          solvedEncounters: 4,
        },
      ],
    };

    guildExpeditionService(sampleContributionList);

    const html = donationDIV2.innerHTML;
    assert.ok(html.includes('Trial'), 'HTML should include Trial header');
    assert.ok(html.includes('AlphaPlayer'), 'HTML should include AlphaPlayer');
    assert.ok(html.includes('4</td>'), 'AlphaPlayer should show Trial 4');
    assert.ok(html.includes('BetaPlayer'), 'HTML should include BetaPlayer');
    assert.ok(html.includes('5</td>'), 'BetaPlayer should show Trial 5');
    assert.ok(html.includes('GammaPlayer'), 'HTML should include GammaPlayer');
    assert.ok(html.includes('1</td>'), 'GammaPlayer default trial should be 1');

    // Text alignment checks: Member left-aligned, Trial/Points/Encounters centered
    assert.ok(
      html.includes('class="text-start"') && html.includes('text-align: left'),
      'Member column should be aligned to the left',
    );
    assert.ok(
      html.includes('class="text-center"') &&
        html.includes('text-align: center'),
      'Trial, Points, and Encounters should be centered',
    );
    assert.ok(
      html.includes('background-color: transparent'),
      'Table and cells should be transparent',
    );
  });

  it('renders International Guild Expedition leaderboard when Trophy button data arrives', async () => {
    resetExpeditionCache();
    const donationDIV2 = document.getElementById('donationDIV2');

    const sampleChampionshipPayload = {
      requestClass: 'ChampionshipService',
      requestMethod: 'getOverview',
      responseData: {
        ranking: [
          { participantId: 10, rank: 1, points: 116 },
          { participantId: 20, rank: 2, points: 34.9 },
          { participantId: 30, rank: 3, points: 11.8 },
        ],
        participants: [
          { id: 20, name: 'Aussie Battler', worldName: 'Houndsmoor' },
          { id: 10, name: 'Lords of War', worldName: 'Greifental' },
          { id: 30, name: 'Just4Fun', worldName: 'Mount Killmore' },
        ],
      },
    };

    guildExpeditionService(sampleChampionshipPayload);

    const html = donationDIV2.innerHTML;
    assert.ok(
      html.includes('Lords of War'),
      'HTML should include 1st place guild',
    );
    assert.ok(
      html.includes('Greifental'),
      'HTML should include 1st place world',
    );
    assert.ok(
      html.includes('116%'),
      'HTML should format 1st place progress with %',
    );
    assert.ok(
      html.includes('Aussie Battler'),
      'HTML should include 2nd place guild',
    );
    assert.ok(
      html.includes('Houndsmoor'),
      'HTML should include 2nd place world',
    );
    assert.ok(
      html.includes('34.9%'),
      'HTML should format 2nd place progress with %',
    );
    assert.ok(html.includes('Just4Fun'), 'HTML should include 3rd place guild');
    assert.ok(html.includes('Server'), 'HTML should include Server header');
    assert.ok(html.includes('Progress'), 'HTML should include Progress header');
    assert.ok(
      html.includes('background-color: transparent'),
      'International table should be transparent',
    );
  });

  it('allows both International and Member Contribution sub-panels to co-exist at the same time', async () => {
    resetExpeditionCache();
    const donationDIV2 = document.getElementById('donationDIV2');

    // 1. Trophy button clicked -> International section arrives
    guildExpeditionService({
      requestClass: 'ChampionshipService',
      requestMethod: 'getOverview',
      responseData: {
        ranking: [{ participantId: 10, rank: 1, points: 116 }],
        participants: [
          { id: 10, name: 'Lords of War', worldName: 'Greifental' },
        ],
      },
    });

    let html = donationDIV2.innerHTML;
    assert.ok(
      html.includes('geInternationalSection'),
      'International section should exist',
    );
    assert.ok(
      !html.includes('geContributionSection'),
      'Contribution section should not exist yet',
    );

    // 2. Progress bar clicked -> Contribution section arrives
    guildExpeditionService({
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getContributionList',
      responseData: [
        {
          player: { player_id: 1, name: 'Picard359' },
          currentTrial: 55,
          expeditionPoints: 5520892,
          solvedEncounters: 80,
        },
      ],
    });

    html = donationDIV2.innerHTML;
    assert.ok(
      html.includes('geInternationalSection'),
      'International section should still exist',
    );
    assert.ok(
      html.includes('data-i18n="ge_championship">GE Championship</span>'),
      'Championship subpanel should render with data-i18n="ge_championship" and default title GE Championship',
    );
    assert.ok(
      html.includes('geContributionSection'),
      'Contribution section should now also exist',
    );
    assert.ok(
      html.includes(
        'data-i18n="ge_member_contributions">GE Leaderboard</span>',
      ),
      'Member Contributions subpanel should render with data-i18n="ge_member_contributions" and default title GE Leaderboard',
    );
    assert.ok(
      html.includes('Lords of War') && html.includes('Picard359'),
      'Both guild progress and player leaderboard should co-exist',
    );

    const intIndex = html.indexOf('geInternationalSection');
    const contribIndex = html.indexOf('geContributionSection');
    assert.ok(
      intIndex < contribIndex,
      'International section should be above Contribution section',
    );
  });

  it('preserves existing table when empty or status-only payload arrives', async () => {
    resetExpeditionCache();
    const donationDIV2 = document.getElementById('donationDIV2');

    // First render contribution list
    guildExpeditionService({
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getContributionList',
      responseData: [
        {
          player: { player_id: 1, name: 'ActivePlayer' },
          currentTrial: 2,
          expeditionPoints: 5000,
          solvedEncounters: 12,
        },
      ],
    });

    const beforeHtml = donationDIV2.innerHTML;
    assert.ok(beforeHtml.includes('ActivePlayer'));

    // Status payload with no members (e.g. getOverview state message)
    guildExpeditionService({
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getOverview',
      responseData: { state: 'active', nextStateTime: 1725890000 },
    });

    assert.equal(
      donationDIV2.innerHTML,
      beforeHtml,
      'Status payload should not wipe out existing table',
    );
  });

  it('routes ChampionshipService.getOverview and getContributionList in legacyBridge', async () => {
    const { registerLegacyBridge } = await import(
      `../../src/js/protocol/legacyBridge.js?t=${Date.now()}`
    );
    const { MessageDispatcher } =
      await import('../../src/js/protocol/MessageDispatcher.js');

    const dispatcher = new MessageDispatcher();
    const routedMethods = [];
    const mockGeHandler = (msg) => {
      routedMethods.push(`${msg.requestClass}.${msg.requestMethod}`);
      return { success: true };
    };

    registerLegacyBridge(dispatcher, {
      guildExpeditionService: mockGeHandler,
    });

    await dispatcher.dispatchSingle({
      requestClass: 'ChampionshipService',
      requestMethod: 'getOverview',
      responseData: {},
    });

    await dispatcher.dispatchSingle({
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getContributionList',
      responseData: [],
    });

    assert.ok(
      routedMethods.includes('ChampionshipService.getOverview'),
      'ChampionshipService.getOverview should route to handler',
    );
    assert.ok(
      routedMethods.includes('GuildExpeditionService.getContributionList'),
      'getContributionList should route to handler',
    );
  });

  it('respects showInternationalExpedition and showExpedition options toggles', async () => {
    resetExpeditionCache();

    // Ingest both
    guildExpeditionService({
      requestClass: 'ChampionshipService',
      requestMethod: 'getOverview',
      responseData: {
        ranking: [{ participantId: 10, rank: 1, points: 116 }],
        participants: [
          { id: 10, name: 'Lords of War', worldName: 'Greifental' },
        ],
      },
    });
    guildExpeditionService({
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getContributionList',
      responseData: [
        {
          player: { player_id: 1, name: 'Picard359' },
          currentTrial: 55,
          expeditionPoints: 5520892,
          solvedEncounters: 80,
        },
      ],
    });

    const internationalEntries = expeditionState.getInternationalEntries();
    const contributionEntries = expeditionState.getContributionEntries();

    // Both visible with default options
    const htmlAll = buildExpeditionContentHtml(
      internationalEntries,
      contributionEntries,
      {
        showInternationalExpedition: true,
        showExpedition: true,
      },
    );
    assert.ok(htmlAll.includes('geInternationalSection'));
    assert.ok(htmlAll.includes('geContributionSection'));

    // Turn off International
    const htmlNoInt = buildExpeditionContentHtml(
      internationalEntries,
      contributionEntries,
      {
        showInternationalExpedition: false,
        showExpedition: true,
      },
    );
    assert.ok(!htmlNoInt.includes('geInternationalSection'));
    assert.ok(htmlNoInt.includes('geContributionSection'));

    // Turn off Contribution
    const htmlNoContrib = buildExpeditionContentHtml(
      internationalEntries,
      contributionEntries,
      {
        showInternationalExpedition: true,
        showExpedition: false,
      },
    );
    assert.ok(htmlNoContrib.includes('geInternationalSection'));
    assert.ok(!htmlNoContrib.includes('geContributionSection'));

    // Turn off both -> empty string
    const htmlNone = buildExpeditionContentHtml(
      internationalEntries,
      contributionEntries,
      {
        showInternationalExpedition: false,
        showExpedition: false,
      },
    );
    assert.strictEqual(htmlNone, '');
  });
});
