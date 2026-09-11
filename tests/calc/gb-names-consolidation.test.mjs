import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import gbNamingPkg from '../../src/js/calc/gbNaming.js';
import gbNamesPkg from '../../src/js/calc/utils/gbNames.js';

const gbNaming = gbNamingPkg.default || gbNamingPkg;
const gbNames = gbNamesPkg.default || gbNamesPkg;

describe('GB name map consolidation (F12)', () => {
  it('exposes the canonical GB_NAME_MAP from gbNaming.js', () => {
    assert.equal(typeof gbNaming.GB_NAME_MAP, 'object');
    assert.equal(gbNaming.GB_NAME_MAP.X_FutureEra_Landmark1, 'The Arc');
    assert.equal(
      gbNaming.GB_NAME_MAP.X_OceanicFuture_Landmark3,
      'The Blue Galaxy',
    );
  });

  it('exposes getGreatBuildingName from gbNaming.js', () => {
    assert.equal(
      gbNaming.getGreatBuildingName('X_FutureEra_Landmark1'),
      'The Arc',
    );
    assert.equal(
      gbNaming.getGreatBuildingName('building_entity_X_FutureEra_Landmark1'),
      'The Arc',
    );
    assert.equal(gbNaming.getGreatBuildingName('Unknown_Id'), '');
    assert.equal(gbNaming.getGreatBuildingName(null), '');
  });

  it('re-exports the same canonical map and resolver from utils/gbNames.js', () => {
    assert.equal(gbNames.GB_NAME_MAP, gbNaming.GB_NAME_MAP);
    assert.equal(gbNames.getGreatBuildingName, gbNaming.getGreatBuildingName);
  });

  it('derives GB_FALLBACK_NAMES from the canonical map', () => {
    assert.ok(gbNaming.GB_FALLBACK_NAMES instanceof Map);
    assert.equal(
      gbNaming.GB_FALLBACK_NAMES.size,
      Object.keys(gbNaming.GB_NAME_MAP).length,
    );
    assert.equal(
      gbNaming.GB_FALLBACK_NAMES.get('X_BronzeAge_Landmark2'),
      'Statue of Zeus',
    );
  });
});
