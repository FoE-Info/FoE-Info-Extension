import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import eraMappingPkg from '../../src/js/calc/eraMapping.js';

const {
  numAges,
  fLevelfromAge,
  fAgefromLevel,
  fGVGagesname,
  fEraAbbreviation,
} = eraMappingPkg.default || eraMappingPkg;

describe('eraMapping Suite', () => {
  it('exposes the 23 known ages', () => {
    assert.equal(numAges, 23);
  });

  describe('fLevelfromAge', () => {
    it('maps representative eras to their level', () => {
      assert.equal(fLevelfromAge('BronzeAge'), 1);
      assert.equal(fLevelfromAge('FutureEra'), 13);
      assert.equal(fLevelfromAge('SpaceAgeSpaceHub'), 22);
      assert.equal(fLevelfromAge('StellarAgeDiscovery'), 23);
      assert.equal(fLevelfromAge('SpaceAgeDiscovery'), 23);
    });

    it('returns -1 for unknown or non-string ages', () => {
      assert.equal(fLevelfromAge('AllAge'), -1);
      assert.equal(fLevelfromAge('Unknown'), -1);
      assert.equal(fLevelfromAge(undefined), -1);
    });
  });

  describe('fAgefromLevel', () => {
    it('maps representative levels to their era', () => {
      assert.equal(fAgefromLevel(1), 'BronzeAge');
      assert.equal(fAgefromLevel(13), 'FutureEra');
      assert.equal(fAgefromLevel(22), 'SpaceAgeSpaceHub');
      assert.equal(fAgefromLevel(23), 'StellarAgeDiscovery');
    });

    it('returns -1 for unknown or non-numeric levels', () => {
      assert.equal(fAgefromLevel(0), -1);
      assert.equal(fAgefromLevel(24), -1);
      assert.equal(fAgefromLevel(undefined), -1);
    });

    it('coerces numeric strings like the legacy loose comparison', () => {
      assert.equal(fAgefromLevel('13'), 'FutureEra');
      assert.equal(fAgefromLevel('23'), 'StellarAgeDiscovery');
    });

    it('round-trips every known era level', () => {
      for (let level = 1; level <= numAges; level++) {
        const era = fAgefromLevel(level);
        assert.equal(
          fLevelfromAge(era),
          level,
          `round-trip failed for level ${level}`,
        );
      }
    });

    it('round-trips representative named eras', () => {
      assert.equal(fAgefromLevel(fLevelfromAge('FutureEra')), 'FutureEra');
      assert.equal(
        fAgefromLevel(fLevelfromAge('SpaceAgeSpaceHub')),
        'SpaceAgeSpaceHub',
      );
    });
  });

  describe('fGVGagesname', () => {
    it('maps key eras to their short codes', () => {
      const expected = {
        BronzeAge: 'BA',
        FutureEra: 'FE',
        SpaceAgeMars: 'SAM',
        SpaceAgeTitan: 'SAT',
        SpaceAgeSpaceHub: 'SASH',
        StellarAgeDiscovery: 'SAD',
        SpaceAgeDiscovery: 'SAD',
        AllAge: 'AA',
      };
      for (const [era, code] of Object.entries(expected)) {
        assert.equal(fGVGagesname(era), code, `${era} -> ${code}`);
      }
    });

    it('returns the input unchanged for unknown eras', () => {
      assert.equal(fGVGagesname('Unknown'), 'Unknown');
    });

    it('is the same function as fEraAbbreviation', () => {
      assert.equal(fGVGagesname, fEraAbbreviation);
    });
  });
});
