import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleReceiveStorage } from '../../src/js/state/storageListener.js';

describe('Metadata Loading Order & Storage Ingestion Suite', () => {
  it('populates BuildingEntityLookup before resolving missing entities', () => {
    const executionOrder = [];
    const mockBuildingLookup = {};

    const deps = {
      BuildingEntityLookup: mockBuildingLookup,
      processMetadataData: (_defs) => {
        executionOrder.push('processMetadataData');
      },
      resolveMissingCityEntitiesFromMap: (_entities) => {
        executionOrder.push('resolveMissingCityEntitiesFromMap');
        // At the moment of resolution, BuildingEntityLookup must already have the keys
        assert.ok(mockBuildingLookup['R_MultiAge_TestBuilding']);
      },
      getLastStartupMsg: () => ({
        responseData: {
          city_map: {
            entities: [{ cityentity_id: 'R_MultiAge_TestBuilding' }],
          },
        },
      }),
      renderLiveCityStats: () => {
        executionOrder.push('renderLiveCityStats');
      },
    };

    // Storage object where CityEntityDefs key appears BEFORE BuildingEntityLookup
    const storageSnapshot = {
      CityEntityDefs: {
        some_known_def: { id: 'some_known_def' },
      },
      BuildingEntityLookup: {
        R_MultiAge_TestBuilding: 'https://cdn.example.com/test.json',
      },
    };

    handleReceiveStorage(storageSnapshot, deps);

    assert.ok(
      executionOrder.includes('resolveMissingCityEntitiesFromMap'),
      'resolveMissingCityEntitiesFromMap should have been called',
    );
    assert.equal(
      mockBuildingLookup['R_MultiAge_TestBuilding'],
      'https://cdn.example.com/test.json',
    );
  });
});
