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

const gbgSignalPkg = await import('../../src/js/msg/GbgSignalService.js');
const {
  setSignal,
  getSignals,
  clearSignals,
  generateTargetList,
  timeGBG,
  getServerMarket,
} = gbgSignalPkg;

test('GuildBattleground Target Generation and Timing Suite', async (t) => {
  t.beforeEach(() => {
    clearSignals();
  });

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
