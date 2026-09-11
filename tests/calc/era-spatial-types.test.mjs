import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import eraMappingJs from '../../src/js/calc/eraMapping.js';
import spatialUtilsJs from '../../src/js/calc/utils/spatialUtils.js';

describe('TypeScript Mirror Parity for eraMapping & spatialUtils', () => {
  it('eraMapping exports all expected symbols', () => {
    assert.equal(typeof eraMappingJs.fLevelfromAge, 'function');
    assert.equal(typeof eraMappingJs.fAgefromLevel, 'function');
    assert.equal(typeof eraMappingJs.fEraAbbreviation, 'function');
    assert.equal(typeof eraMappingJs.numAges, 'number');
    assert.equal(eraMappingJs.numAges, 23);
    assert.equal(eraMappingJs.fLevelfromAge('BronzeAge'), 1);
    assert.equal(eraMappingJs.fEraAbbreviation('FutureEra'), 'FE');
  });

  it('spatialUtils exports all expected symbols', () => {
    assert.equal(typeof spatialUtilsJs.areBuildingsAdjacent, 'function');
    assert.equal(typeof spatialUtilsJs.computeSetAdjacencies, 'function');
    assert.equal(typeof spatialUtilsJs.computeChainLinkAdjacencies, 'function');

    const b1 = { x: 0, y: 0, width: 2, length: 2 };
    const b2 = { x: 2, y: 0, width: 2, length: 2 };
    assert.equal(spatialUtilsJs.areBuildingsAdjacent(b1, b2), true);

    const b3 = { x: 5, y: 5, width: 1, length: 1 };
    assert.equal(spatialUtilsJs.areBuildingsAdjacent(b1, b3), false);
  });
});
