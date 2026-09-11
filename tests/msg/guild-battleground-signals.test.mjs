import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// Setup browser extension and DOM mocks before importing dependent modules
if (!globalThis.chrome || !globalThis.chrome.runtime) {
  globalThis.chrome = {
    runtime: { id: 'test-extension-id' },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
      },
    },
  };
}

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
      this.children.push(child);
      if (child.id) domStore.set(child.id, child);
      return child;
    },
    addEventListener(event, fn) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    },
    querySelector(sel) {
      const targetId = sel.replace('#', '');
      if (this.innerHTML.includes(targetId)) {
        return createMockElement('div', targetId);
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
  if (id) domStore.set(id, el);
  return el;
}

globalThis.document = {
  getElementById(id) {
    if (!domStore.has(id)) {
      domStore.set(id, createMockElement('div', id));
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

// Dynamic imports to ensure DOM & chrome runtime mocks are initialized first
const { registerLegacyBridge } =
  await import('../../src/js/protocol/legacyBridge.js');
const dispatcherPkg =
  await import('../../src/js/protocol/MessageDispatcher.js');
const { MessageDispatcher } = dispatcherPkg;

const gbgSignalPkg = await import('../../src/js/msg/GbgSignalService.js');
const {
  setSignal,
  removeSignal,
  getSignals,
  clearSignals,
  generateTargetList,
  onProvinceConquered,
  timeGBG,
  getServerMarket,
} = gbgSignalPkg;

test('GuildBattleground Signals and Target Generation Suite', async (t) => {
  t.beforeEach(() => {
    domStore.clear();
    clearSignals();
  });

  await t.test(
    'setSignal and removeSignal update signals list without throwing TypeErrors',
    () => {
      assert.doesNotThrow(() => {
        setSignal(null, [10, 'focus']);
      }, 'setSignal must not throw TypeError on signals array operations');

      const currentSignals = getSignals();
      assert.ok(Array.isArray(currentSignals), 'signals must be an array');
      assert.equal(currentSignals.length, 1);

      const sig = currentSignals[0];
      assert.equal(sig.id ?? sig.provinceId, 10);
      assert.equal(sig.type ?? sig.signal, 'focus');

      assert.doesNotThrow(() => {
        removeSignal(null, [10]);
      }, 'removeSignal must not throw TypeError');

      const afterRemove = getSignals();
      assert.equal(afterRemove.length, 0);
    },
  );

  await t.test(
    'Setting an ignore signal removes the province from focus targets',
    () => {
      setSignal(null, [5, 'focus']);
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 5);

      // Setting 'ignore' signal removes sector 5 from targets
      setSignal(null, [5, 'ignore']);
      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'Setting an ignore signal must remove province from attack targets',
      );

      // Add second signal for province 8
      setSignal(null, [8, 'focus']);
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 8);
    },
  );

  await t.test(
    'PostData extraction routes setSignal and removeSignal via request postData.text',
    async () => {
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {
        setSignal,
        removeSignal,
      });

      // 1. Dispatch setSignal via raw network entry with postData.text
      const setRpcResponse = [
        {
          __class__: 'ServerRequest',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'setSignal',
          requestId: 101,
          responseData: {},
        },
      ];
      const setNetworkRequest = {
        request: {
          postData: {
            text: JSON.stringify([
              {
                __class__: 'ServerRequest',
                requestClass: 'GuildBattlegroundSignalsService',
                requestMethod: 'setSignal',
                requestId: 101,
                requestData: [15, 'focus'],
              },
            ]),
          },
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=1',
        JSON.stringify(setRpcResponse),
        '',
        [],
        setNetworkRequest,
      );

      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 15);
      assert.equal(currentSignals[0].type ?? currentSignals[0].signal, 'focus');

      // 2. Dispatch removeSignal via raw network entry with postData.text
      const removeRpcResponse = [
        {
          __class__: 'ServerRequest',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'removeSignal',
          requestId: 102,
          responseData: {},
        },
      ];
      const removeNetworkRequest = {
        request: {
          postData: {
            text: JSON.stringify([
              {
                __class__: 'ServerRequest',
                requestClass: 'GuildBattlegroundSignalsService',
                requestMethod: 'removeSignal',
                requestId: 102,
                requestData: [15],
              },
            ]),
          },
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=2',
        JSON.stringify(removeRpcResponse),
        '',
        [],
        removeNetworkRequest,
      );

      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'removeSignal via postData must remove sector from signals',
      );
    },
  );

  await t.test(
    'Switching back to Target Generator from a pre-existing GBG Targets chat panel when setting a signal',
    () => {
      const targetsGBG = document.getElementById('targetsGBG');

      // Step 1: Pre-existing chat thread panel is active
      targetsGBG.innerHTML = `
        <div id="alert-chat" class="alert alert-info show">
          <button id="targetPostID">Post</button>
          <p id="targetLabel"><strong>GBG Targets</strong> today at 10:00</p>
          <p id="targetText">Attack A1S</p>
        </div>
      `;
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'Initial state must show GBG Targets chat panel',
      );
      assert.ok(
        targetsGBG.querySelector('#targetPostID'),
        'Post button must be present in chat panel',
      );

      // Step 2: Signal placed on map
      setSignal(null, [0, 'focus']);
      const volcanoDefs = [
        { id: 0, name: 'A1S Central', connections: [], totalBuildingSlots: 1 },
      ];
      const targetList = generateTargetList({
        map: [{ id: 0, lockedUntil: 0, totalBuildingSlots: 1 }],
        activeSignals: getSignals(),
        volcanoDefs,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      // Target generator updates #targetsGBG (matching checkProvinces behavior)
      if (targetList.textProvinceUnlocked) {
        targetsGBG.innerHTML = `
          <div class="alert alert-info">
            <button id="targetCopyID">Copy</button>
            <p id="targetGenLabel"><strong>GBG Target Generator:</strong></p>
            <div id="targetGenCollapse"><p id="targetGenText">${targetList.textProvinceUnlocked}</p></div>
          </div>
        `;
      }

      // Step 3: Assert it switched back to GBG Target Generator
      assert.ok(
        targetsGBG.innerHTML.includes('GBG Target Generator:'),
        'Must switch back to Target Generator panel',
      );
      assert.equal(
        targetsGBG.querySelector('#targetPostID'),
        null,
        'Chat thread Post button must no longer be present',
      );
      assert.ok(
        targetsGBG.querySelector('#targetCopyID'),
        'Target Generator copy button must be present',
      );
    },
  );

  await t.test(
    'ConversationService renders targets thread when opened and setSignal switches back to Target Generator',
    async () => {
      const { conversationService } =
        await import('../../src/js/msg/ConversationService.js');
      const targetsGBG =
        document.getElementById('targetsGBG') ||
        createMockElement('div', 'targetsGBG');
      targetsGBG.innerHTML = `
        <div class="alert alert-info">
          <button id="targetCopyID">Copy</button>
          <p id="targetGenLabel"><strong>GBG Target Generator:</strong></p>
          <div id="targetGenCollapse"><p id="targetGenText">D4A (20%) @ 08:06</p></div>
        </div>
      `;

      // Opening Message Center updates targetsGBG with the thread view
      conversationService({
        requestMethod: 'getOverviewForCategory',
        responseData: {
          category: {
            teasers: [
              {
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'Attack B1S now!',
                  sender: { name: 'Commander' },
                  date: 'today at 10:00',
                },
              },
            ],
          },
        },
      });

      assert.ok(
        targetsGBG.innerHTML.includes('GBG Targets'),
        'ConversationService must display Message Center Targets card when opened',
      );
      assert.ok(
        targetsGBG.innerHTML.includes('Attack B1S now!'),
        'Chat thread text must be present in Message Center card',
      );
    },
  );

  await t.test(
    'UC camps formatting: (20%) when ready, (40% UC) when under construction, and (80% / 20% UC) when partially ready',
    () => {
      const volcanoDefs = [
        { id: 0, name: 'A1S Sector', connections: [1], totalBuildingSlots: 2 },
        {
          id: 1,
          name: 'B1T Neighbor',
          connections: [0],
          totalBuildingSlots: 2,
        },
      ];
      const currentEpochSec = 1700000000;

      // Scenario A: 80% camps ready (readyAt in past)
      setSignal(null, [0, 'focus']);
      const resultReadyOnly = generateTargetList({
        map: [
          { id: 0, lockedUntil: 0 },
          {
            id: 1,
            ownerId: 999,
            placedBuildings: [
              {
                id: 'advanced_guild_fortress_1', // 80% attrition reduction
                readyAt: (currentEpochSec - 3600) * 1000,
              },
            ],
          },
        ],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 999,
        epocTime: currentEpochSec,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.match(
        resultReadyOnly.textProvinceUnlocked,
        /\(20%\)/,
        '80% ready camps must show (20%) attrition chance',
      );

      // Scenario B: 60% camps under construction (readyAt in future)
      const resultUcOnly = generateTargetList({
        map: [
          { id: 0, lockedUntil: 0 },
          {
            id: 1,
            ownerId: 999,
            placedBuildings: [
              {
                id: 'guild_command_post_fortified', // 60% attrition reduction
                readyAt: (currentEpochSec + 3600) * 1000,
              },
            ],
          },
        ],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 999,
        epocTime: currentEpochSec,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.match(
        resultUcOnly.textProvinceUnlocked,
        /\(40% UC\)/,
        '60% UC camps must show (40% UC) expected attrition chance',
      );

      // Scenario C: Partially ready (20% ready, 60% UC)
      const resultPartial = generateTargetList({
        map: [
          { id: 0, lockedUntil: 0 },
          {
            id: 1,
            ownerId: 999,
            placedBuildings: [
              {
                id: 'guild_command_post_improvised', // 20% ready
                readyAt: (currentEpochSec - 3600) * 1000,
              },
              {
                id: 'guild_command_post_fortified', // 60% UC
                readyAt: (currentEpochSec + 3600) * 1000,
              },
            ],
          },
        ],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 999,
        epocTime: currentEpochSec,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.match(
        resultPartial.textProvinceUnlocked,
        /\(80% \/ 20% UC\)/,
        '20% ready + 60% UC camps must format as (80% / 20% UC)',
      );
    },
  );

  await t.test(
    'generateTargetList generates targets without Discord webhook for Volcano and Waterfall maps',
    () => {
      // Populate Volcano sector definitions
      const volcanoDefs = [
        { id: 0, name: 'A1S Central', connections: [1], totalBuildingSlots: 3 },
        { id: 1, name: 'B1T Border', connections: [0], totalBuildingSlots: 2 },
      ];

      // Add focus signal on sector 0
      setSignal(null, [0, 'focus']);

      // Execute target list generation for Volcano archipelago
      const volcanoResult = generateTargetList({
        map: [
          { id: 0, lockedUntil: 0, totalBuildingSlots: 3 },
          { id: 1, lockedUntil: 0, totalBuildingSlots: 2 },
        ],
        activeSignals: getSignals(),
        volcanoDefs,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      assert.ok(volcanoResult.targets.length > 0, 'Target must be generated');
      assert.equal(volcanoResult.targets[0].provinceId, 0);
      assert.equal(volcanoResult.targets[0].tag, 'A1C');
      assert.match(
        volcanoResult.textProvinceUnlocked,
        /A1C/,
        'Volcano province sector abbreviation A1C must be present in targets',
      );

      // Verify Waterfall map target generation
      clearSignals();
      setSignal(null, [1, 'focus']);

      const waterfallDefs = [
        { id: 1, name: 'A1 Waterfall', connections: [], totalBuildingSlots: 1 },
      ];

      const waterfallResult = generateTargetList({
        map: [{ id: 1, lockedUntil: 0, totalBuildingSlots: 1 }],
        activeSignals: getSignals(),
        waterfallDefs,
        mapName: 'waterfall',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      assert.ok(
        waterfallResult.targets.length > 0,
        'Waterfall target must be generated',
      );
      assert.equal(waterfallResult.targets[0].provinceId, 1);
      assert.equal(waterfallResult.targets[0].tag, 'A1');
      assert.match(
        waterfallResult.textProvinceUnlocked,
        /A1/,
        'Waterfall province target must be present in targets without webhook',
      );
    },
  );

  await t.test(
    'getServerMarket extracts correct market code and handles defaults',
    () => {
      assert.equal(getServerMarket('https://en7.forgeofempires.com'), 'en');
      assert.equal(getServerMarket('https://us12.forgeofempires.com'), 'us');
      assert.equal(getServerMarket('https://de3.forgeofempires.com'), 'de');
      assert.equal(getServerMarket('https://zz1.forgeofempires.com'), 'zz');
      assert.equal(getServerMarket('en7'), 'en');
      assert.equal(getServerMarket('us12'), 'us');
      assert.equal(getServerMarket(''), 'en');
      assert.equal(getServerMarket(null), 'en');
    },
  );

  await t.test(
    'timeGBG formats true server time (24-hour for Europe/International, 12-hour AM/PM for US)',
    () => {
      // Fixed timestamp: 2026-09-07T12:00:00Z
      const testUtcDate = new Date(Date.UTC(2026, 8, 7, 12, 0, 0));

      // 1. en (London, BST UTC+1 in September): 13:00 (24-hour, no AM/PM)
      const enTime = timeGBG(testUtcDate, 'https://en7.forgeofempires.com');
      assert.equal(
        enTime,
        '@ 13:00',
        'en server time must be 13:00 BST without AM/PM',
      );
      assert.ok(
        !enTime.includes('AM') && !enTime.includes('PM'),
        'en must not contain AM/PM',
      );

      // 2. zz (Beta, London BST UTC+1 in September): 13:00 (24-hour, no AM/PM)
      const zzTime = timeGBG(testUtcDate, 'https://zz1.forgeofempires.com');
      assert.equal(
        zzTime,
        '@ 13:00',
        'zz beta time must be 13:00 BST without AM/PM',
      );

      // 3. us (New York, EDT UTC-4 in September): 08:00 AM (12-hour with AM/PM)
      const usTime = timeGBG(testUtcDate, 'https://us12.forgeofempires.com');
      assert.equal(usTime, '@ 08:00 AM', 'us server time must be 08:00 AM EDT');
      assert.match(usTime, /AM|PM/, 'us server time must include AM/PM');

      // 4. de (Berlin, CEST UTC+2 in September): 14:00 (24-hour)
      const deTime = timeGBG(testUtcDate, 'https://de3.forgeofempires.com');
      assert.equal(deTime, '@ 14:00', 'de server time must be 14:00 CEST');

      // 5. Evening timestamp: 2026-09-07T20:00:00Z -> US EDT is 04:00 PM
      const eveningUtcDate = new Date(Date.UTC(2026, 8, 7, 20, 0, 0));
      const usEvening = timeGBG(
        eveningUtcDate,
        'https://us12.forgeofempires.com',
      );
      assert.equal(usEvening, '@ 04:00 PM');

      const enEvening = timeGBG(
        eveningUtcDate,
        'https://en7.forgeofempires.com',
      );
      assert.equal(
        enEvening,
        '@ 21:00',
        'en evening time must remain 24-hour clock',
      );
    },
  );

  await t.test(
    'timeGBG formats local browser time when GBGtimeMode is local',
    async () => {
      const testDate = new Date(2026, 8, 7, 15, 42, 0);
      const localResult = timeGBG(testDate, 'https://en7.forgeofempires.com', {
        GBGtimeMode: 'local',
      });
      const expectedHours = String(testDate.getHours()).padStart(2, '0');
      const expectedMinutes = String(testDate.getMinutes()).padStart(2, '0');
      assert.equal(localResult, `@ ${expectedHours}:${expectedMinutes}`);

      // When options passed as second arg
      const localResult2 = timeGBG(testDate, { GBGtimeMode: 'local' });
      assert.equal(localResult2, `@ ${expectedHours}:${expectedMinutes}`);

      // When 12-hour format is configured in options
      const { setTimeFormattingConfig } =
        await import('../../src/js/utils/date.js');
      setTimeFormattingConfig({ timeFormat: 'hh:mm:ss A' });
      try {
        const local12hResult = timeGBG(testDate, { GBGtimeMode: 'local' });
        assert.equal(local12hResult, '@ 03:42 PM');
      } finally {
        setTimeFormattingConfig({ timeFormat: 'HH:mm:ss' });
      }
    },
  );

  await t.test(
    'generateTargetList with GBGtimeMode local formats locked province time using local browser time',
    () => {
      const volcanoDefs = [
        { id: 0, name: 'A1S Central', connections: [], totalBuildingSlots: 1 },
      ];
      setSignal(null, [0, 'focus']);

      const testDate = new Date(2026, 8, 7, 16, 30, 0);
      const lockSeconds = Math.floor(testDate.getTime() / 1000);
      const expectedHours = String(testDate.getHours()).padStart(2, '0');
      const expectedMinutes = String(testDate.getMinutes()).padStart(2, '0');

      const result = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://us12.forgeofempires.com',
        options: {
          GBGshowSC: true,
          GBGprovinceTime: true,
          GBGtimeMode: 'local',
        },
      });

      assert.match(
        result.textProvinceLocked,
        new RegExp(`@ ${expectedHours}:${expectedMinutes}`),
        'Locked sector should display local time formatted as @ HH:mm',
      );
      assert.ok(
        !result.textProvinceLocked.includes('AM') &&
          !result.textProvinceLocked.includes('PM'),
        'Local time format must be 24h clock without AM/PM',
      );
    },
  );

  await t.test(
    'generateTargetList with lockedUntil formats sector unlock time with @ matching server time',
    () => {
      const volcanoDefs = [
        { id: 0, name: 'A1S Central', connections: [], totalBuildingSlots: 1 },
      ];
      setSignal(null, [0, 'focus']);

      // 12:00:00 UTC
      const lockSeconds = Math.floor(Date.UTC(2026, 8, 7, 12, 0, 0) / 1000);

      // en server target list
      const enResult = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://en7.forgeofempires.com',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.match(
        enResult.textProvinceLocked,
        /@ 13:00/,
        'Locked sector on en server must display @ 13:00 BST',
      );
      assert.ok(
        !enResult.textProvinceLocked.includes('AM'),
        'en server target list must not contain AM/PM',
      );

      // us server target list
      const usResult = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://us12.forgeofempires.com',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.match(
        usResult.textProvinceLocked,
        /@ 08:00 AM/,
        'Locked sector on us server must display @ 08:00 AM EDT',
      );
    },
  );

  await t.test(
    'target token ordering strictly adheres to [sectorTag] [targetText] [campsText] [timeText]',
    () => {
      const volcanoDefs = [
        { id: 0, name: 'D4 Highlands', connections: [], totalBuildingSlots: 2 },
      ];
      setSignal(null, [0, 'focus']);
      const lockSeconds = Math.floor(Date.UTC(2026, 8, 7, 12, 0, 0) / 1000);

      // Case 1: Locked with camps, no custom text -> D4H (20%) @ 13:00
      const res1 = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds, gainAttritionChance: 20 }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://en7.forgeofempires.com',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.equal(res1.targets[0].text, 'D4H (20%) @ 13:00');
      assert.match(res1.textProvinceLocked, /D4H \(20%\) @ 13:00/);

      // Case 2: Locked with custom text & camps -> D4H HOLD (20%) @ 13:00
      const res2 = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds, gainAttritionChance: 20 }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://en7.forgeofempires.com',
        targetText: 'HOLD',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.equal(res2.targets[0].text, 'D4H HOLD (20%) @ 13:00');
      assert.match(res2.textProvinceLocked, /D4H HOLD \(20%\) @ 13:00/);

      // Case 3: Unlocked with custom text & camps -> D4H HOLD (20%)
      const res3 = generateTargetList({
        map: [{ id: 0, lockedUntil: 0, gainAttritionChance: 20 }],
        activeSignals: getSignals(),
        volcanoDefs,
        targetText: 'HOLD',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.equal(res3.targets[0].text, 'D4H HOLD (20%)');
      assert.match(res3.textProvinceUnlocked, /D4H HOLD \(20%\)/);

      // Case 4: Locked with custom text, no camps -> D4H HOLD @ 13:00
      const res4 = generateTargetList({
        map: [{ id: 0, lockedUntil: lockSeconds }],
        activeSignals: getSignals(),
        volcanoDefs,
        origin: 'https://en7.forgeofempires.com',
        targetText: 'HOLD',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.equal(res4.targets[0].text, 'D4H HOLD @ 13:00');
      assert.match(res4.textProvinceLocked, /D4H HOLD @ 13:00/);

      // Case 5: Unlocked with custom text, no camps -> D4H HOLD
      const res5 = generateTargetList({
        map: [{ id: 0, lockedUntil: 0 }],
        activeSignals: getSignals(),
        volcanoDefs,
        targetText: 'HOLD',
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });
      assert.equal(res5.targets[0].text, 'D4H HOLD');
      assert.match(res5.textProvinceUnlocked, /D4H HOLD/);
    },
  );

  await t.test(
    'custom targetText and targetsTopic state setter synchronization',
    () => {
      const stateSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/state/state.js'),
        'utf8',
      );
      assert.match(
        stateSource,
        /export\s+function\s+setTargetText\s*\(\s*val\s*\)\s*\{/,
        'state.js must export setTargetText',
      );
      assert.match(
        stateSource,
        /export\s+function\s+setTargetsTopic\s*\(\s*val\s*\)\s*\{/,
        'state.js must export setTargetsTopic',
      );

      const indexSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/index.js'),
        'utf8',
      );
      assert.ok(
        !indexSource.includes("export var targetText = '';"),
        'index.js must not shadow targetText declaration',
      );
      assert.ok(
        !indexSource.includes("export var targetsTopic = 'targets';"),
        'index.js must not shadow targetsTopic declaration',
      );
      const bindingsSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/indexUiBindings.js'),
        'utf8',
      );
      assert.match(
        bindingsSource,
        /setTargetText:\s*\(val\)\s*=>\s*state\?\.setTargetText\?\.\(val\)/,
        'indexUiBindings.js must call setTargetText on storage updates',
      );
      assert.match(
        bindingsSource,
        /setTargetsTopic:\s*\(val\)\s*=>\s*state\?\.setTargetsTopic\?\.\(val\)/,
        'indexUiBindings.js must call setTargetsTopic on storage updates',
      );
    },
  );

  await t.test(
    'fshowBattleground and getLeaderboard render to dedicated containers with null guards',
    () => {
      const rendererSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/renderBattlegroundsPanel.js'),
        'utf8',
      );
      const gbgServiceSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/msg/GuildBattlegroundService.js'),
        'utf8',
      );
      const resultCardSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/ui/renderBattlegroundResultCard.js'),
        'utf8',
      );

      // Verify the battleground renderer imports battlegroundDIV and renders to it
      assert.match(
        rendererSource,
        /battlegroundDIV/,
        'renderBattlegroundsPanel.js must import battlegroundDIV from state',
      );
      assert.match(
        rendererSource,
        /document\.getElementById\(['"]battleground['"]\)[\s\S]*?battlegroundDIV/,
        'renderBattlegroundsPanel.js fshowBattleground must target dedicated battleground container',
      );
      assert.match(
        rendererSource,
        /const\s+copyEl\s*=\s*document\.getElementById\(['"]battlegroundCopyID['"]\);[\s\S]*?if\s*\(\s*copyEl\s*\)/,
        'renderBattlegroundsPanel.js fshowBattleground must null-guard battlegroundCopyID click listener',
      );
      assert.match(
        rendererSource,
        /const\s+iconEl\s*=\s*document\.getElementById\(['"]battlegroundicon['"]\);[\s\S]*?if\s*\(\s*iconEl\s*\)/,
        'renderBattlegroundsPanel.js fshowBattleground must null-guard battlegroundicon click listener',
      );

      // Verify GuildBattlegroundService.js imports and renders to dedicated containers
      assert.match(
        gbgServiceSource,
        /battlegroundDIV/,
        'GuildBattlegroundService.js must import battlegroundDIV',
      );
      assert.match(
        gbgServiceSource,
        /gbgLeaderboardDIV/,
        'GuildBattlegroundService.js must import gbgLeaderboardDIV',
      );
      assert.match(
        gbgServiceSource,
        /document\.getElementById\(['"]gbgLeaderboard['"]\)[\s\S]*?gbgLeaderboardDIV/,
        'GuildBattlegroundService.js getLeaderboard must target dedicated gbgLeaderboard container',
      );
      assert.match(
        gbgServiceSource,
        /document\.getElementById\(['"]battleground['"]\)[\s\S]*?battlegroundDIV/,
        'GuildBattlegroundService.js getState must target dedicated battleground container',
      );
      assert.match(
        resultCardSource,
        /document\.getElementById\(['"]battlegroundCopyID['"]\)[\s\S]*?BattlegroundCopy/,
        'renderBattlegroundResultCard must null-guard and wire battlegroundCopyID listener',
      );
    },
  );

  await t.test(
    'renderBattlegroundResultCard renders GBG table with centered rank, member start, centered negs/fights/attrition, and clickable title',
    () => {
      const resultCardSource = fs.readFileSync(
        path.resolve('src/js/ui/renderBattlegroundResultCard.js'),
        'utf8',
      );
      assert.match(
        resultCardSource,
        /<th class="text-center">Rank<\/th><th class="text-start">Member<\/th><th class="text-center">Negs<\/th><th class="text-center">Fights<\/th><th class="text-center">Attrition<\/th>/,
        'GBG table must render centered headers with capitalized Attrition',
      );
      assert.match(
        resultCardSource,
        /<td class="text-center">\$\{row\.rank\}<\/td><td class="text-start">\$\{safePlayerName\}<\/td><td class="text-center">\$\{row\.negotiations\}<\/td><td class="text-center">\$\{row\.fights\}<\/td><td class="text-center">\$\{row\.attrition\}<\/td>/,
        'GBG table rows must have centered rank, negotiations, battles, attrition, and left-aligned name',
      );
      assert.match(
        resultCardSource,
        /id="battlegroundResultTextLabel"\s+class="cursor-pointer"/,
        'GBG result text label must have cursor-pointer class',
      );
      assert.match(
        resultCardSource,
        /document\.getElementById\(['"]battlegroundResultTextLabel['"]\)/,
        'GBG result text label must have collapse event listener bound',
      );
    },
  );

  await t.test(
    'getUpdatedProvinces updates provinces and preserves existing buildings',
    () => {
      const gbgServiceSource = fs.readFileSync(
        path.resolve('src/js/msg/GuildBattlegroundService.js'),
        'utf8',
      );
      assert.match(
        gbgServiceSource,
        /export function getUpdatedProvinces\(msg\)/,
        'GuildBattlegroundService must export getUpdatedProvinces function',
      );
      assert.match(
        gbgServiceSource,
        /Object\.assign\(existing,\s*updated\)/,
        'getUpdatedProvinces must merge updated province properties into existing map entry',
      );
    },
  );

  await t.test(
    'removeSignal resolves provinceId from context.requestPayload when responseData is empty',
    async () => {
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {
        setSignal,
        removeSignal,
      });

      // 1. Dispatch setSignal
      setSignal(null, [14, 'focus']);
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);

      // 2. Dispatch ServerResponse with empty responseData and matching requestId in requestPayload
      const removeRpcResponse = [
        {
          __class__: 'ServerResponse',
          requestId: 26,
          responseData: [],
        },
      ];
      const networkRequest = {
        postData: {
          text: JSON.stringify([
            {
              __class__: 'ServerRequest',
              requestClass: 'GuildBattlegroundSignalsService',
              requestMethod: 'removeSignal',
              requestId: 26,
              requestData: [14],
            },
          ]),
        },
      };

      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=3',
        JSON.stringify(removeRpcResponse),
        '',
        [],
        networkRequest,
      );

      currentSignals = getSignals();
      assert.equal(
        currentSignals.length,
        0,
        'removeSignal with empty responseData must resolve province from requestPayload and remove signal',
      );
    },
  );

  await t.test(
    'Object payload format support for setSignal and removeSignal',
    async () => {
      // 1. Direct object call
      setSignal(null, { provinceId: 21, type: 'focus' });
      let currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 21);

      removeSignal(null, { provinceId: 21 });
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 0);

      // 2. Dispatcher call with responseData as object
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {
        setSignal,
        removeSignal,
      });

      const setResp = [
        {
          __class__: 'ServerResponse',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'setSignal',
          responseData: { provinceId: 33, type: 'focus' },
        },
      ];
      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=obj_test1',
        JSON.stringify(setResp),
      );
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 1);
      assert.equal(currentSignals[0].id ?? currentSignals[0].provinceId, 33);

      const removeResp = [
        {
          __class__: 'ServerResponse',
          requestClass: 'GuildBattlegroundSignalsService',
          requestMethod: 'removeSignal',
          responseData: { provinceId: 33 },
        },
      ];
      await dispatcher.dispatchRaw(
        'https://en1.forgeofempires.com/game/json?h=obj_test2',
        JSON.stringify(removeResp),
      );
      currentSignals = getSignals();
      assert.equal(currentSignals.length, 0);
    },
  );

  await t.test(
    'Conquest of sector by any guild prunes signals and drops it from target list',
    () => {
      // Province 42 marked for attack
      setSignal(null, [42, 'focus']);
      assert.equal(getSignals().length, 1);

      const volcanoDefs = [
        { id: 42, name: 'D4 B', connections: [], totalBuildingSlots: 1 },
      ];

      // Before conquest: open sector (lockedUntil = 0) with another guild's ownership
      let result = generateTargetList({
        map: [{ id: 42, ownerId: 5, lockedUntil: 0 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(result.targets.length, 1);
      assert.ok(result.textProvinceUnlocked.includes('D4B'));

      // Case 1: Another guild conquers D4B before us -> onProvinceConquered prunes signal
      onProvinceConquered(42);
      assert.equal(getSignals().length, 0);

      result = generateTargetList({
        map: [{ id: 42, ownerId: 8, lockedUntil: 1789120000 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(result.targets.length, 0);
      assert.equal(result.textProvinceUnlocked, '');
      assert.equal(result.textProvinceLocked, '');

      // Case 2: If our own guild owns it, generateTargetList must exclude it even if focus signal exists
      setSignal(null, [42, 'focus']);
      result = generateTargetList({
        map: [{ id: 42, ownerId: 1, lockedUntil: 0 }],
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        options: { GBGprovinceTime: true },
      });
      assert.equal(
        result.targets.length,
        0,
        'Must not target sectors owned by our own guild',
      );
    },
  );

  await t.test(
    'target generator updates from (60%) to (60% / 20% UC) when adjacent guild buildings load',
    () => {
      clearSignals();
      const currentEpochSec = 1789110000;
      const volcanoDefs = [
        {
          id: 10,
          name: 'B3B Border',
          connections: [11],
          totalBuildingSlots: 3,
        },
        {
          id: 11,
          name: 'B3A Adjacent',
          connections: [10],
          totalBuildingSlots: 3,
        },
      ];

      // Step 1: Initial map open state (adjacent guild province has no placedBuildings loaded yet)
      const mapState = [
        { id: 10, ownerId: 5, lockedUntil: 0, gainAttritionChance: 60 },
        { id: 11, ownerId: 1, lockedUntil: 0 }, // no placedBuildings yet
      ];
      setSignal(null, [10, 'focus']);

      const initialResult = generateTargetList({
        map: mapState,
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        epocTime: currentEpochSec,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      // Initially shows (60%) from gainAttritionChance
      assert.match(
        initialResult.textProvinceUnlocked,
        /B3B.*\(60%\)/,
        'Initial state without buildings must show (60%) attrition',
      );

      // Step 2: Buildings load for adjacent guild province (40% ready, 40% under construction)
      mapState[1].placedBuildings = [
        {
          id: 'guild_command_post_forward', // 40% ready
          readyAt: (currentEpochSec - 100) * 1000,
        },
        {
          id: 'guild_command_post_forward', // 40% UC (will result in 20% total attrition when done)
          readyAt: (currentEpochSec + 3600) * 1000,
        },
      ];

      const updatedResult = generateTargetList({
        map: mapState,
        activeSignals: getSignals(),
        volcanoDefs,
        currentParticipantId: 1,
        epocTime: currentEpochSec,
        options: { GBGshowSC: true, GBGprovinceTime: true },
      });

      assert.match(
        updatedResult.textProvinceUnlocked,
        /B3B.*\(60% \/ 20% UC\)/,
        'After adjacent buildings load, must update to (60% / 20% UC)',
      );
    },
  );
});
