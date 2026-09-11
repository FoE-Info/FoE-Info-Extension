import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  buildBuildingCostCardHTML,
  buildBuildingCostsTableHTML,
  buildLeaderboardHTML,
  buildProvinceTableHTML,
  renderBuildingCostCard,
} from '../../src/js/ui/gbgProvinceView.js';
import {
  buildTargetGeneratorMarkup,
  buildTargetGeneratorTargets,
  renderTargetGeneratorCard,
  renderTargetGeneratorPanel,
} from '../../src/js/ui/renderTargetGeneratorCard.js';

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    innerHTML: '',
    style: {},
    className: '',
    children: [],
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    click() {
      const handlers = listeners.get('click') || [];
      for (const h of handlers) h();
    },
    querySelector(selector) {
      if (this.innerHTML.includes(selector.replace('#', ''))) {
        return createMockElement(selector.replace('#', ''));
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    cloneNode() {
      return { ...this };
    },
  };
}

describe('gbgProvinceView Suite', () => {
  let doc;
  let domStore;

  beforeEach(() => {
    domStore = new Map();
    doc = {
      getElementById(id) {
        if (!domStore.has(id)) {
          domStore.set(id, createMockElement(id));
        }
        return domStore.get(id);
      },
      createElement(tag) {
        return createMockElement(tag);
      },
    };
    globalThis.document = doc;
    globalThis.window = {
      getSelection: () => ({
        removeAllRanges: () => {},
        addRange: () => {},
      }),
      createRange: () => ({
        selectNode: () => {},
      }),
    };
  });

  describe('buildLeaderboardHTML', () => {
    it('generates table rows from leaderboard entries with guild name, hourly VP, and total VP', () => {
      const leaderboard = [
        {
          clan: { name: 'Alpha Clan' },
          victoryPointsHourly: 120,
          victoryPointsTotal: 5400,
        },
        {
          clan: { name: 'Beta Clan' },
          victoryPointsHourly: 80,
          victoryPointsTotal: 3200,
        },
      ];
      const html = buildLeaderboardHTML(leaderboard);
      assert.ok(
        html.includes(
          '<tr><th class="text-start">Guild</th><th class="text-center">VP/hr</th><th class="text-center">Total VP</th></tr>',
        ),
      );
      assert.ok(
        html.includes(
          '<td class="text-start">Alpha Clan</td><td class="text-center tabular-nums">120</td><td class="text-center tabular-nums">5,400</td>',
        ),
      );
      assert.ok(
        html.includes(
          '<td class="text-start">Beta Clan</td><td class="text-center tabular-nums">80</td><td class="text-center tabular-nums">3,200</td>',
        ),
      );
    });
  });

  describe('buildBuildingCostsTableHTML / buildProvinceTableHTML', () => {
    it('formats Volcano archipelago sector tags (2 chars + 1 suffix) with slot counts and resource costs', () => {
      const map = [
        {
          id: 1,
          totalBuildingSlots: 2,
          availableBuildings: [
            {
              buildingId: 'siege_camp',
              costs: { resources: { wood: 50, iron: 25 } },
            },
          ],
        },
      ];
      const ProvinceDefs = [{ id: 1, name: 'A1 South Volcano' }];
      const BuildingDefs = { siege_camp: { name: 'Siege Camp' } };
      const helper = { fResourceShortName: (r) => r.toUpperCase() };

      const html = buildBuildingCostsTableHTML({
        map,
        ProvinceDefs,
        mapName: 'volcano',
        BuildingDefs,
        helper,
      });

      assert.ok(html.includes('<th>A1S [2]</th>'));
      assert.ok(html.includes('<td>Siege Camp</td>'));
      assert.ok(html.includes('<td>WOOD</td><td>50</td>'));
      assert.ok(html.includes('<td>IRON</td><td>25</td>'));
      assert.equal(buildProvinceTableHTML, buildBuildingCostsTableHTML);
    });

    it('formats Waterfall map sector tags (3 chars) properly', () => {
      const map = [
        {
          id: 2,
          totalBuildingSlots: 1,
          availableBuildings: [
            {
              buildingId: 'watchtower',
              costs: { resources: { marble: 30 } },
            },
          ],
        },
      ];
      const ProvinceDefs = [{ id: 2, name: 'B1 Waterfall Outpost' }];
      const BuildingDefs = { watchtower: { name: 'Watchtower' } };

      const html = buildBuildingCostsTableHTML({
        map,
        ProvinceDefs,
        mapName: 'waterfall',
        BuildingDefs,
      });

      assert.ok(html.includes('<th>B1 [1]</th>'));
      assert.ok(html.includes('<td>Watchtower</td>'));
      assert.ok(html.includes('<td>marble</td><td>30</td>'));
    });
  });

  describe('Target Generator Rendering', () => {
    it('buildTargetGeneratorMarkup correctly combines unlocked and locked target strings', () => {
      const markup = buildTargetGeneratorMarkup({
        targetsHTML: '<div class="alert">header</div>',
        textProvinceUnlocked: 'A1S (20%)',
        textProvinceLocked: 'B1T (40%) @ 12:00',
        collapse: { collapseTargetGen: false },
      });
      assert.ok(markup.includes('A1S (20%)<br>B1T (40%) @ 12:00'));
      assert.ok(markup.includes('class="collapse show"'));
    });

    it('renderTargetGeneratorCard mounts into container and binds click listeners', () => {
      let copyClicked = false;
      let postClicked = false;
      let collapseClicked = false;
      const targetGenerator = createMockElement('targetsGBG');

      renderTargetGeneratorCard({
        targetGenerator,
        targetsHTML:
          '<button id="targetCopyID">Copy</button><button id="targetGenPostID">Post</button><p id="targetGenLabel">GBG Target Generator:</p>',
        textProvinceUnlocked: 'A1S (20%)',
        textProvinceLocked: '',
        collapse: {
          collapseTargetGen: true,
          fCollapseTargetGen: () => {
            collapseClicked = true;
          },
        },
        targetCopy: () => {
          copyClicked = true;
        },
        targetPost: () => {
          postClicked = true;
        },
      });

      assert.ok(targetGenerator.innerHTML.includes('A1S (20%)'));
      const copyBtn = doc.getElementById('targetCopyID');
      const postBtn = doc.getElementById('targetGenPostID');
      const icon = doc.getElementById('targetGenicon');
      assert.ok(copyBtn);
      assert.ok(postBtn);
      assert.ok(icon);
      copyBtn.click();
      postBtn.click();
      icon.click();
      assert.equal(copyClicked, true);
      assert.equal(postClicked, true);
      assert.equal(collapseClicked, true);
    });

    it('renderTargetGeneratorCard does not automatically post to Discord on render', () => {
      let autoPostCount = 0;
      const targetGenerator = createMockElement('targetsGBG');

      renderTargetGeneratorCard({
        targetGenerator,
        targetsHTML: '<button id="targetCopyID">Copy</button>',
        textProvinceUnlocked: 'A1S (20%)',
        textProvinceLocked: '',
        helper: { checkGBG: () => true },
        url: { discordTargetURL: 'https://discord.test/webhook' },
        post_webstore: {
          postTargetList: () => {
            autoPostCount++;
          },
        },
      });

      assert.equal(
        autoPostCount,
        0,
        'Must not automatically post to Discord without user click',
      );
    });

    it('renderTargetGeneratorCard clears container when both unlocked and locked are empty', () => {
      const targetGenerator = createMockElement('targetsGBG');
      targetGenerator.innerHTML =
        '<p id="targetLabel">Existing Thread Card</p>';

      renderTargetGeneratorCard({
        targetGenerator,
        textProvinceUnlocked: '',
        textProvinceLocked: '',
      });

      assert.equal(targetGenerator.innerHTML, '');
    });
  });

  describe('Target Generator Panel', () => {
    it('buildTargetGeneratorTargets produces an unlocked focus token with sector tag and target text', () => {
      const { textProvinceUnlocked, textProvinceLocked } =
        buildTargetGeneratorTargets({
          map: [{ id: 1, lockedUntil: 0 }],
          signals: [{ provinceId: 1, signal: 'focus' }],
          provinceDefs: [{ id: 1, name: 'A1 South', connections: [] }],
          mapName: 'volcano',
          currentParticipantId: 0,
          epocTime: 1700000000,
          showOptions: { GBGshowSC: false, GBGprovinceTime: false },
          targetText: 'HOLD',
        });

      assert.equal(textProvinceUnlocked, 'A1S HOLD');
      assert.equal(textProvinceLocked, '');
    });

    it('buildTargetGeneratorTargets routes time-locked provinces to the locked text via formatTime', () => {
      const { textProvinceUnlocked, textProvinceLocked } =
        buildTargetGeneratorTargets({
          map: [{ id: 1, lockedUntil: 1700000000 }],
          signals: [{ provinceId: 1, signal: 'focus' }],
          provinceDefs: [{ id: 1, name: 'B1 North', connections: [] }],
          mapName: 'volcano',
          currentParticipantId: 0,
          epocTime: 1700000000,
          showOptions: { GBGshowSC: false, GBGprovinceTime: true },
          formatTime: () => '@ 12:00',
        });

      assert.equal(textProvinceUnlocked, '');
      assert.equal(textProvinceLocked, 'B1N @ 12:00');
    });

    it('buildTargetGeneratorTargets skips own provinces and non-focus signals', () => {
      const { textProvinceUnlocked, textProvinceLocked } =
        buildTargetGeneratorTargets({
          map: [
            { id: 1, ownerId: 5, lockedUntil: 0 },
            { id: 2, lockedUntil: 0 },
          ],
          signals: [
            { provinceId: 1, signal: 'focus' },
            { provinceId: 2, signal: 'ignore' },
          ],
          provinceDefs: [
            { id: 1, name: 'A1 South', connections: [] },
            { id: 2, name: 'B1 North', connections: [] },
          ],
          mapName: 'volcano',
          currentParticipantId: 5,
          epocTime: 1700000000,
          showOptions: { GBGshowSC: false, GBGprovinceTime: false },
        });

      assert.equal(textProvinceUnlocked, '');
      assert.equal(textProvinceLocked, '');
    });

    it('renderTargetGeneratorPanel mounts the card into #targetsGBG and wires copy, post, and collapse listeners', () => {
      let copyClicked = false;
      let postClicked = false;
      let collapseClicked = false;

      const element = {
        close: () => '<button id="targetClose">x</button>',
        post: () => '<button id="targetGenPostID">Post</button>',
        copy: () => '<button id="targetCopyID">Copy</button>',
        icon: () => '<span id="targetGenicon">[-]</span>',
      };

      renderTargetGeneratorPanel({
        targetsContainer: createMockElement('targets'),
        map: [{ id: 1, lockedUntil: 0 }],
        signals: [{ provinceId: 1, signal: 'focus' }],
        provinceDefs: [{ id: 1, name: 'A1 South', connections: [] }],
        mapName: 'volcano',
        currentParticipantId: 0,
        epocTime: 1700000000,
        showOptions: { GBGshowSC: false, GBGprovinceTime: false },
        gameOrigin: 'en7',
        targetText: 'HOLD',
        element,
        collapse: {
          collapseTargetGen: false,
          collapseBattleground: false,
          fCollapseTargetGen: () => {
            collapseClicked = true;
          },
        },
        helper: { checkGBG: () => true },
        url: { discordTargetURL: 'https://discord.test/webhook' },
        post_webstore: { postTargetGenToDiscord: () => {} },
        targetCopy: () => {
          copyClicked = true;
        },
        targetPost: () => {
          postClicked = true;
        },
      });

      const targetGenerator = doc.getElementById('targetsGBG');
      assert.ok(targetGenerator.innerHTML.includes('GBG Target Generator:'));
      assert.ok(targetGenerator.innerHTML.includes('A1S HOLD'));

      doc.getElementById('targetCopyID').click();
      doc.getElementById('targetGenPostID').click();
      doc.getElementById('targetGenicon').click();

      assert.equal(copyClicked, true);
      assert.equal(postClicked, true);
      assert.equal(collapseClicked, true);
    });
  });

  describe('Building Cost Card Rendering', () => {
    it('renderBuildingCostCard mounts card HTML, binds click listeners, and attaches ResizeObserver', () => {
      let costCopyClicked = false;
      let collapseCostClicked = false;
      let observed = false;
      let observedHeight = 0;

      class MockResizeObserver {
        constructor(cb) {
          this.cb = cb;
        }
        observe(el) {
          observed = true;
          this.cb([{ contentRect: { height: 180 } }]);
        }
      }

      const costsDiv = createMockElement('costs');
      const element = {
        close: () => '<span class="close">x</span>',
        icon: () => '<i class="icon"></i>',
        copy: () => '<button id="buildingCostID">Copy</button>',
      };

      renderBuildingCostCard({
        costsDiv,
        costsHTML: '<tr><td>Sample Cost</td></tr>',
        collapse: {
          collapseBuildingCost: false,
          fCollapseBuildingCost: () => {
            collapseCostClicked = true;
          },
        },
        buildingCostCopy: () => {
          costCopyClicked = true;
        },
        toolOptions: { buildingCostSize: 150 },
        setBuildingCostSize: (h) => {
          observedHeight = h;
        },
        element,
        ResizeObserverClass: MockResizeObserver,
      });

      assert.ok(costsDiv.innerHTML.includes('GBG Building Costs:'));
      assert.ok(costsDiv.innerHTML.includes('Sample Cost'));
      assert.equal(observed, true);
      assert.equal(observedHeight, 180);

      const copyBtn = doc.getElementById('buildingCostID');
      const icon = doc.getElementById('buildingCostIcon');
      assert.ok(copyBtn);
      assert.ok(icon);
      copyBtn.click();
      icon.click();
      assert.equal(costCopyClicked, true);
      assert.equal(collapseCostClicked, true);
    });
  });
});
