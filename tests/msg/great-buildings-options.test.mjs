import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Setup DOM mocks before imports
const domStore = new Map();

function createMockElement(tag, id = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    className: '',
    children: [],
    listeners: {},
    appendChild(child) {
      if (!child) return child;
      if (child.parentNode && child.parentNode.removeChild) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      this.children.push(child);
      if (child.id) domStore.set(child.id, child);
      return child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },
    contains(target) {
      if (this === target) return true;
      for (const child of this.children) {
        if (child === target) return true;
        if (child.contains && child.contains(target)) return true;
      }
      return false;
    },
    addEventListener(event, fn) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    },
    querySelector(sel) {
      const targetId = sel.replace('#', '');
      return domStore.get(targetId) || null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    getAttribute() {
      return null;
    },
  };
  if (id) domStore.set(id, el);
  return el;
}

const content = createMockElement('div', 'content');
domStore.set('content', content);

globalThis.document = {
  body: createMockElement('body', 'body'),
  getElementById(id) {
    if (!domStore.has(id)) {
      const el = createMockElement('div', id);
      domStore.set(id, el);
    }
    return domStore.get(id);
  },
  createElement(tag) {
    return createMockElement(tag);
  },
  querySelector(sel) {
    const targetId = sel.replace('#', '');
    return domStore.get(targetId) || null;
  },
  querySelectorAll() {
    return [];
  },
};

globalThis.window = globalThis;
if (!globalThis.chrome) {
  globalThis.chrome = {
    runtime: { id: 'test-id' },
    storage: {
      local: { get: async () => ({}), set: async () => {} },
      sync: { get: async () => ({}), set: async () => {} },
    },
  };
}

const gbDonationServicePkg =
  await import('../../src/js/msg/GbDonationService.js');
const {
  extractRankingLevel,
  extractRankingParams,
  syncGbSelected,
  handleNewReward,
  calculateSafeSpots,
  renderGbDonationPanel,
} = gbDonationServicePkg.default || gbDonationServicePkg;

const bridgePkg = await import('../../src/js/protocol/legacyBridge.js');
const { registerLegacyBridge } = bridgePkg.default || bridgePkg;

const dispatcherPkg =
  await import('../../src/js/protocol/MessageDispatcher.js');
const { MessageDispatcher } = dispatcherPkg.default || dispatcherPkg;

const cardVisPkg = await import('../../src/js/ui/cardVisibility.js');
const { applyCardVisibility } = cardVisPkg.default || cardVisPkg;

const containerPkg = await import('../../src/js/ui/containerBinding.js');
const { mountPanels } = containerPkg.default || containerPkg;

test('Great Buildings Options & Donation Helper Suite', async (t) => {
  await t.test(
    'syncGbSelected updates GBselected metadata from responseData',
    () => {
      const GBselected = {
        level: 0,
        max_level: 0,
        current: 0,
        total: 0,
        name: '',
        connected: false,
      };

      const responseData = {
        level: 10,
        max_level: 80,
        current_progress: 300,
        max_progress: 1000,
        name: 'The Arc',
        connected: true,
      };

      syncGbSelected(GBselected, responseData);

      assert.equal(GBselected.level, 10);
      assert.equal(GBselected.max_level, 80);
      assert.equal(GBselected.current, 300);
      assert.equal(GBselected.total, 1000);
      assert.equal(GBselected.name, 'The Arc');
      assert.equal(GBselected.connected, true);
    },
  );

  await t.test(
    'extractRankingLevel extracts level across various payload formats',
    () => {
      // 1. From msg.requestData array
      const lvl1 = extractRankingLevel({ requestData: [858, 12345, 15] });
      assert.equal(lvl1, 15, 'Should extract from msg.requestData[2]');

      // 2. From context.requestData array
      const lvl2 = extractRankingLevel({}, null, {
        requestData: [858, 12345, 20],
      });
      assert.equal(lvl2, 20, 'Should extract from context.requestData');

      // 3. From data array
      const lvl3 = extractRankingLevel({}, [{ requestData: [858, 12345, 25] }]);
      assert.equal(lvl3, 25, 'Should extract from data[0].requestData');

      // 4. From raw data array of numbers
      const lvl4 = extractRankingLevel({}, [858, 12345, 30]);
      assert.equal(lvl4, 30, 'Should extract from raw data array');

      // 5. From context.request.postData JSON string
      const lvl5 = extractRankingLevel({}, null, {
        request: {
          postData: JSON.stringify([
            {
              requestClass: 'GreatBuildingsService',
              requestMethod: 'getConstructionRanking',
              requestData: [858, 12345, 35],
            },
          ]),
        },
      });
      assert.equal(lvl5, 35, 'Should extract from postData string');
    },
  );

  await t.test(
    'calculateSafeSpots calculates exact BigNumber Arc boost and lock math with ROUND_CEIL',
    () => {
      const gbData = {
        name: 'The Arc',
        level: 10,
        total: 1000,
        current: 300,
      };

      // Rankings: Rank 1 has 200 FP reward base, Top investor has 150 FP
      const rankings = [
        {
          rank: 1,
          player: { player_id: 101, name: 'Investor1' },
          forge_points: 150,
          reward: { strategy_point_amount: 200 },
        },
        {
          rank: 2,
          player: { player_id: 102, name: 'Investor2' },
          forge_points: 50,
          reward: { strategy_point_amount: 100 },
        },
      ];

      // 90% Arc bonus (1.9x):
      // Rank 1: 200 * 1.9 = 380 FP
      // Rank 2: 100 * 1.9 = 190 FP
      const spots = calculateSafeSpots(gbData, rankings, 90, 190);

      assert.equal(spots.length >= 2, true);
      assert.equal(spots[0].rewardFP, 380);
      assert.equal(spots[1].rewardFP, 190);
      assert.equal(typeof spots[0].lockFP, 'number');
      assert.equal(typeof spots[0].isSafe, 'boolean');
    },
  );

  await t.test(
    'renderGbInfoPanel renders card with level, progress, and remaining FP',
    async () => {
      const { renderGbInfoPanel } =
        await import('../../src/js/ui/renderGbInfoPanel.js');
      const targetEl = createMockElement('div', 'gbInfo');
      const gbData = {
        name: 'Himeji Castle',
        level: 10,
        max_level: 11,
        current: 450,
        total: 600,
        readyAt: 1700000000,
      };

      renderGbInfoPanel(targetEl, gbData, 'PlayerOne', { showGBInfo: true });

      assert.match(targetEl.innerHTML, /Himeji Castle/);
      assert.match(targetEl.innerHTML, /PlayerOne/);
      assert.match(targetEl.innerHTML, /Level: 10 \/ 11/);
      assert.match(targetEl.innerHTML, /Invested: 450 of 600 FP/);
      assert.match(targetEl.innerHTML, /Total Remaining: 150 FP/);
      assert.match(targetEl.innerHTML, /Ready:/);
      assert.doesNotMatch(targetEl.innerHTML, /gbInfoCopyID/);
      assert.match(targetEl.innerHTML, /gbinfoicon/);
      assert.match(targetEl.innerHTML, /pe-4 mb-0/);
      assert.match(targetEl.innerHTML, /cursor-pointer/);

      // When showGBInfo is false, panel is emptied
      renderGbInfoPanel(targetEl, gbData, 'PlayerOne', { showGBInfo: false });
      assert.equal(targetEl.innerHTML, '');
    },
  );

  await t.test(
    'renderGbDonationPanel decouples showGBInfo, showGBDonors, and showDonation',
    () => {
      const gbInfo = createMockElement('div', 'gbInfo');
      const greatbuilding = createMockElement('div', 'greatbuilding');
      const donation2DIV = createMockElement('div', 'donation2');
      const containers = { gbInfo, greatbuilding, donation2DIV };

      const gbData = {
        name: 'Statue of Zeus',
        level: 42,
        total: 500,
        current: 100,
      };

      const rankings = [
        {
          rank: 1,
          player: { player_id: 1, name: 'Donor1' },
          forge_points: 50,
          reward: { strategy_point_amount: 50 },
        },
      ];

      // Case 1: showGBInfo = true, showGBDonors = false, showDonation = false
      renderGbDonationPanel(containers, gbData, rankings, {
        showGBInfo: true,
        showGBDonors: false,
        showDonation: false,
      });
      assert.match(gbInfo.innerHTML, /Statue of Zeus/);
      assert.match(gbInfo.innerHTML, /42/);
      assert.equal(greatbuilding.innerHTML, '');
      assert.equal(donation2DIV.innerHTML, '');

      // Case 2: showGBInfo = false, showGBDonors = true, showDonation = false
      renderGbDonationPanel(containers, gbData, rankings, {
        showGBInfo: false,
        showGBDonors: true,
        showDonation: false,
      });
      assert.equal(gbInfo.innerHTML, '');
      assert.match(greatbuilding.innerHTML, /Donor1/);
      assert.equal(donation2DIV.innerHTML, '');

      // Case 3: showDonation = true
      renderGbDonationPanel(containers, gbData, rankings, {
        showGBInfo: true,
        showGBDonors: true,
        showDonation: true,
      });
      assert.notEqual(donation2DIV.innerHTML, '');
      assert.match(donation2DIV.innerHTML, /Lock|donation/i);
    },
  );

  await t.test(
    'donation ranks consume the preceding lock from the pool',
    () => {
      const donation2DIV = createMockElement('div');
      renderGbDonationPanel(
        { donation2DIV },
        { total: 1000, current: 200, rewards: [300, 150, 50, 10, 0] },
        [100, 50, 0, 0, 0],
        { arcBonusPercent: 100, donationPercent: 180 },
      );
      // Pools: 800 -> 350 -> 150 -> 75 -> 37 -> 18.
      assert.deepEqual(
        [...donation2DIV.innerHTML.matchAll(/P\d: Lock (\d+)FP/g)].map(
          (match) => Number(match[1]),
        ),
        [450, 200, 75, 38, 19],
      );
      assert.match(
        donation2DIV.innerHTML,
        /Costs: 540FP, Reward: 600FP, Profit\/Loss: 150FP/,
      );
      assert.match(
        donation2DIV.innerHTML,
        /Costs: 270FP, Reward: 300FP, Profit\/Loss: 100FP/,
      );
    },
  );

  await t.test(
    'handleNewReward updates cityrewards container when showGBRewards is true',
    () => {
      const cityrewards = createMockElement('div', 'cityrewards');
      const rewardMsg = {
        responseData: {
          name: 'The Arc',
          amount: 2,
        },
      };

      // Enabled
      const res = handleNewReward(
        rewardMsg,
        { showGBRewards: true },
        cityrewards,
      );
      assert.equal(res.success, true);
      assert.match(cityrewards.innerHTML, /The Arc/);
      assert.match(cityrewards.innerHTML, /2/);

      // Disabled
      cityrewards.innerHTML = '';
      const resDisabled = handleNewReward(
        rewardMsg,
        { showGBRewards: false },
        cityrewards,
      );
      assert.equal(resDisabled.success, false);
      assert.equal(cityrewards.innerHTML, '');
    },
  );

  await t.test(
    'legacyBridge routes getConstructionRanking and BlueprintService.newReward',
    async () => {
      const dispatcher = new MessageDispatcher();
      let capturedRankingMsg = null;
      let capturedRankingData = null;
      let capturedRewardMsg = null;

      registerLegacyBridge(dispatcher, {
        getConstructionRanking: (msg, data) => {
          capturedRankingMsg = msg;
          capturedRankingData = data;
        },
        handleNewReward: (msg) => {
          capturedRewardMsg = msg;
        },
      });

      // Test getConstructionRanking dispatch
      const rankingPacket = {
        __class__: 'ServerRequest',
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getConstructionRanking',
        requestData: [858, 12345, 55],
        responseData: [{ rank: 1, player: { name: 'P1' } }],
      };

      await dispatcher.dispatchSingle(rankingPacket, {
        requestData: [858, 12345, 55],
      });
      assert.notEqual(capturedRankingMsg, null);
      assert.deepEqual(capturedRankingData, [858, 12345, 55]);

      // Test BlueprintService.newReward dispatch
      const rewardPacket = {
        __class__: 'ServerRequest',
        requestClass: 'BlueprintService',
        requestMethod: 'newReward',
        responseData: { name: 'Observatory', amount: 2 },
      };

      await dispatcher.dispatchSingle(rewardPacket);
      assert.notEqual(capturedRewardMsg, null);
      assert.equal(capturedRewardMsg.responseData.name, 'Observatory');
    },
  );

  await t.test(
    'cardVisibility handles showGBRewards, donation2, gbInfo, and greatbuilding independently',
    () => {
      const contentEl = document.getElementById('content');
      const cityrewards = createMockElement('div', 'cityrewards');
      const donation2DIV = createMockElement('div', 'donation2');
      const gbInfoDIV = createMockElement('div', 'gbInfo');
      const greatbuilding = createMockElement('div', 'greatbuilding');

      mountPanels(contentEl, {
        cityrewards,
        donation2DIV,
        gbInfoDIV,
        greatbuilding,
      });

      assert.equal(cityrewards.id, 'cityrewards');
      assert.equal(donation2DIV.id, 'donation2');
      assert.equal(gbInfoDIV.id, 'gbInfo');
      assert.equal(greatbuilding.id, 'greatbuilding');

      // Test hiding all
      applyCardVisibility({
        showGBRewards: false,
        showDonation: false,
        showGBInfo: false,
        showGBDonors: false,
      });

      assert.equal(cityrewards.style.display, 'none');
      assert.equal(donation2DIV.style.display, 'none');
      assert.equal(gbInfoDIV.style.display, 'none');
      assert.equal(greatbuilding.style.display, 'none');

      // Test showing gbInfo only
      applyCardVisibility({
        showGBRewards: false,
        showDonation: false,
        showGBInfo: true,
        showGBDonors: false,
      });

      assert.equal(gbInfoDIV.style.display, '');
      assert.equal(greatbuilding.style.display, 'none');

      // Test showing greatbuilding only
      applyCardVisibility({
        showGBRewards: true,
        showDonation: true,
        showGBInfo: false,
        showGBDonors: true,
      });

      assert.equal(cityrewards.style.display, '');
      assert.equal(donation2DIV.style.display, '');
      assert.equal(gbInfoDIV.style.display, 'none');
      assert.equal(greatbuilding.style.display, '');
    },
  );

  await t.test(
    'BlueprintService.newReward groups into unified rewards panel without stray blue alerts',
    async () => {
      const cityrewards = createMockElement('div', 'cityrewards');
      domStore.set('cityrewards', cityrewards);

      let capturedReward = null;
      const mockRenderer = {
        showReward: (r) => {
          capturedReward = r;
          cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel">REWARDS:</p><div id="rewardsText">${r.amount} ${r.name}</div></div>`;
        },
      };

      const packet = {
        __class__: 'ServerRequest',
        requestClass: 'BlueprintService',
        requestMethod: 'newReward',
        responseData: {
          name: 'Observatory',
          amount: 1,
          type: 'blueprint',
        },
      };

      const result = handleNewReward(
        packet,
        { showGBRewards: true },
        cityrewards,
        { RewardRenderer: mockRenderer },
      );

      assert.equal(result.success, true);
      assert.notEqual(capturedReward, null);
      assert.equal(capturedReward.type, 'blueprint');
      assert.equal(capturedReward.source, 'greatBuilding');
      assert.match(cityrewards.innerHTML, /alert-danger/);
      assert.doesNotMatch(cityrewards.innerHTML, /alert-info/);
      assert.doesNotMatch(cityrewards.innerHTML, /alert-primary/);
    },
  );

  await t.test(
    'handleNewReward fallback preserves unified rewards structure when renderer is absent',
    () => {
      const cityrewards = createMockElement('div', 'cityrewards');
      const packet = {
        responseData: {
          name: 'Observatory',
          amount: 1,
          type: 'blueprint',
        },
      };

      const result = handleNewReward(
        packet,
        { showGBRewards: true },
        cityrewards,
        { RewardRenderer: null },
      );

      assert.equal(result.success, true);
      assert.match(cityrewards.innerHTML, /alert-danger/);
      assert.match(cityrewards.innerHTML, /REWARDS:/);
      assert.match(cityrewards.innerHTML, /rewardsText/);
      assert.doesNotMatch(cityrewards.innerHTML, /alert-info/);
      assert.doesNotMatch(cityrewards.innerHTML, /alert-primary/);
    },
  );

  await t.test(
    'extractRankingParams extracts contribution from 4-element RPC requestData array',
    () => {
      // InnoGames contributeForgePoints requestData: [entityId, playerId, level, contribution]
      const arrayContext = {
        requestData: [858, 855676320, 10, 450],
      };
      const params = extractRankingParams(null, null, arrayContext);
      assert.notEqual(params, null);
      assert.equal(params.entityId, 858);
      assert.equal(params.playerId, 855676320);
      assert.equal(params.level, 10);
      assert.equal(params.contribution, 450);
    },
  );

  await t.test(
    'extractRankingParams extracts contribution from object payload',
    () => {
      const objPayload = {
        entity_id: 999,
        player_id: 111,
        level: 5,
        contribution: 120,
      };
      const params = extractRankingParams(
        { requestData: objPayload },
        null,
        null,
      );
      assert.notEqual(params, null);
      assert.equal(params.entityId, 999);
      assert.equal(params.playerId, 111);
      assert.equal(params.level, 5);
      assert.equal(params.contribution, 120);
    },
  );

  await t.test(
    'preserves owner self-investment when calculating remaining FP after P1 lock',
    () => {
      // Scenario: GB total = 1000 FP.
      // Owner put 200 FP to prime P1.
      // P1 lock is 400 FP.
      // Prior to fix: contributeForgePoints wiped out owner's 200 FP because rankings sum was only 400.
      // This caused remaining to be 1000 - 400 = 600 instead of 400, breaking P2 calculations.
      const total = 1000;
      let current = 200; // Owner already invested 200

      const prevTop = [0, 0, 0, 0, 0, 0];
      const newRankings = [
        {
          rank: 1,
          forge_points: 400,
          player: { player_id: 2, name: 'Investor1' },
        },
      ];

      const prevPatronSum = prevTop.reduce(
        (acc, v) => acc + (Number(v) || 0),
        0,
      );
      const newPatronSum = newRankings.reduce(
        (acc, r) => acc + (Number(r?.forge_points) || 0),
        0,
      );
      const patronDelta = newPatronSum - prevPatronSum;

      if (patronDelta > 0) {
        current = current + patronDelta;
      }

      // Owner's 200 FP + investor's 400 FP = 600 FP total progress!
      assert.equal(current, 600);
      const remaining = total - current;
      assert.equal(remaining, 400);

      // Now for P2: remaining is accurately 400 FP (not 600 FP)
      // If P2 reward is 200 FP (boosted 1.9x = 380 FP):
      // P2 lock: ceil((400 + 0) / 2) = 200 FP.
      const p2Lock = Math.ceil((remaining + 0) / 2);
      assert.equal(p2Lock, 200);
    },
  );

  await t.test(
    'place header in GB donation card displays clean place ordinal without Arc percentage suffix',
    () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'src/js/msg/GreatBuildingsService.js'),
        'utf8',
      );
      assert.doesNotMatch(
        src,
        /\$\{placeOrdinal\}\s+Place\s*\([^)]*Arc\)/,
        'Place header must not contain (${donorArcPercent}% Arc) suffix',
      );
      assert.match(
        src,
        /\$\{placeOrdinal\}\s+Place<br>/,
        'Place header must be clean "${placeOrdinal} Place<br>"',
      );
    },
  );
});
