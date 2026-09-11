import assert from 'node:assert/strict';
import test from 'node:test';
import metadataServicePkg from '../../src/js/msg/MetadataService.js';
import { metadataStore } from '../../src/js/state/MetadataStore.js';

const {
  processMetadataEntry,
  processMetadataData,
  onMetadataUpdated,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
  BuildingDefs,
} = metadataServicePkg;

test('CityEntity metadata entries notify name-resolution subscribers', async () => {
  let updates = 0;
  const unsubscribe = onMetadataUpdated(() => {
    updates += 1;
  });

  processMetadataEntry({
    __class__: 'CityEntityMetadata',
    id: 'W_MultiAge_NOTIFY_TEST',
    name: 'Notify Test Building',
  });

  await new Promise((resolve) => setTimeout(resolve, 75));
  unsubscribe();
  assert.equal(updates, 1);
});

test.beforeEach(() => {
  metadataStore.reset();
  VolcanoProvinceDefs.length = 0;
  WaterfallProvinceDefs.length = 0;
  BuildingDefs.length = 0;
  // Clear any string keys on BuildingDefs
  Object.keys(BuildingDefs).forEach((k) => {
    delete BuildingDefs[k];
  });
});

test('GuildBattlegroundMapMetadata - Populates VolcanoProvinceDefs preserving id: 0', () => {
  const volcanoMapMsg = {
    __class__: 'GuildBattlegroundMapMetadata',
    id: 'volcano_archipelago',
    provinces: [
      {
        id: 0,
        name: 'A1S Central',
        connections: [1, 2],
        totalBuildingSlots: 3,
      },
      {
        id: 1,
        name: 'B1T Outer',
        connections: [0, 2],
        totalBuildingSlots: 1,
      },
      {
        id: 2,
        name: 'C1U Border',
        connections: [0, 1],
        totalBuildingSlots: 2,
      },
    ],
  };

  processMetadataEntry(volcanoMapMsg);

  assert.equal(VolcanoProvinceDefs.length, 3);
  assert.equal(
    WaterfallProvinceDefs.length,
    0,
    'Waterfall map must not be polluted',
  );

  // Invariant verification: id: 0 must not be lost or coerced to falsy
  const prov0 = VolcanoProvinceDefs.find((p) => p.id === 0);
  assert.ok(prov0, 'Province id 0 must exist');
  assert.equal(prov0.id, 0);
  assert.equal(prov0.name, 'A1S Central');
  assert.deepEqual(prov0.connections, [1, 2]);
  assert.equal(prov0.totalBuildingSlots, 3);

  // Sector name splitting parity with GuildBattlegroundService (line 508: name.split(' '))
  const nameParts = prov0.name.split(' ');
  assert.equal(nameParts[0], 'A1S');
  assert.equal(nameParts[1], 'Central');
});

test('GuildBattlegroundMapMetadata - Populates WaterfallProvinceDefs preserving id: 0', () => {
  const waterfallMapMsg = {
    __class__: 'GuildBattlegroundMapMetadata',
    id: 'waterfall_archipelago',
    provinces: [
      {
        id: 0,
        name: 'A1 Waterfall',
        connections: [1],
        totalBuildingSlots: 2,
      },
      {
        id: 1,
        name: 'A2 Waterfall',
        connections: [0],
        totalBuildingSlots: 1,
      },
    ],
  };

  processMetadataEntry(waterfallMapMsg);

  assert.equal(WaterfallProvinceDefs.length, 2);
  assert.equal(
    VolcanoProvinceDefs.length,
    0,
    'Volcano map must not be polluted',
  );

  const prov0 = WaterfallProvinceDefs.find((p) => p.id === 0);
  assert.ok(prov0, 'Waterfall province id 0 must exist');
  assert.equal(prov0.id, 0);
  assert.equal(prov0.name, 'A1 Waterfall');
  assert.deepEqual(prov0.connections, [1]);
});

test('GuildBattlegroundBuildingMetadata - Populates BuildingDefs by key and array elements', () => {
  const buildingMsg = {
    __class__: 'GuildBattlegroundBuildingMetadata',
    buildings: [
      {
        id: 'watchtower',
        buildingId: 'watchtower',
        name: 'Watchtower',
        costs: { resources: { stone: 50 } },
      },
      {
        id: 'siege_camp',
        buildingId: 'siege_camp',
        name: 'Siege Camp',
        costs: { resources: { wood: 75 } },
      },
      {
        id: 0,
        buildingId: 0,
        name: 'HQ Outpost',
        costs: { resources: {} },
      },
    ],
  };

  processMetadataEntry(buildingMsg);

  // Key-based lookup parity with GuildBattlegroundService.js (line 670: BuildingDefs[building.buildingId].name)
  assert.ok(BuildingDefs['watchtower'], 'BuildingDefs[watchtower] must exist');
  assert.equal(BuildingDefs['watchtower'].name, 'Watchtower');
  assert.deepEqual(BuildingDefs['watchtower'].costs.resources, { stone: 50 });

  assert.ok(BuildingDefs['siege_camp'], 'BuildingDefs[siege_camp] must exist');
  assert.equal(BuildingDefs['siege_camp'].name, 'Siege Camp');

  assert.ok(BuildingDefs[0], 'Numeric BuildingDefs[0] must exist');
  assert.equal(BuildingDefs[0].id, 0);
  assert.equal(BuildingDefs[0].name, 'HQ Outpost');

  // Single building entry ingestion
  processMetadataEntry({
    __class__: 'GuildBattlegroundBuildingMetadata',
    id: 'fortress',
    buildingId: 'fortress',
    name: 'Fortress',
  });

  assert.equal(BuildingDefs['fortress']?.name, 'Fortress');
});

test('StaticDataService.getMetadata - Ingests batch envelope containing map and building metadata', () => {
  const rpcEnvelope = {
    __class__: 'ServerRequest',
    requestClass: 'StaticDataService',
    requestMethod: 'getMetadata',
    responseData: [
      {
        __class__: 'GuildBattlegroundMapMetadata',
        id: 'volcano_archipelago',
        provinces: [
          {
            id: 0,
            name: 'A1S Volcano',
            connections: [1],
            totalBuildingSlots: 1,
          },
        ],
      },
      {
        __class__: 'GuildBattlegroundBuildingMetadata',
        buildings: [
          {
            id: 'palisade',
            name: 'Palisade',
          },
        ],
      },
    ],
    requestId: 1,
  };

  processMetadataEntry(rpcEnvelope);

  assert.equal(VolcanoProvinceDefs.length, 1);
  assert.equal(VolcanoProvinceDefs[0].name, 'A1S Volcano');
  assert.equal(BuildingDefs['palisade']?.name, 'Palisade');
});
