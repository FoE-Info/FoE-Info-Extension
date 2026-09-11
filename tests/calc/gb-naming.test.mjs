import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import gbNamingPkg from '../../src/js/calc/gbNaming.js';

const { fArcname, fCFname, fGBsname, fGBname } =
  gbNamingPkg.default || gbNamingPkg;

describe('gbNaming Suite', () => {
  describe('fGBsname', () => {
    it('returns abbreviation for known Great Buildings', () => {
      assert.equal(fGBsname('Castel del Monte'), 'CdM');
      assert.equal(fGBsname('Innovation Tower'), 'Inno');
      assert.equal(fGBsname('Alcatraz'), 'Traz');
      assert.equal(fGBsname('The Arc'), 'Arc');
    });

    it('returns sliced name (first 10 chars) for unknown buildings', () => {
      assert.equal(fGBsname('Unregistered Building'), 'Unregister');
    });

    it('returns empty string for falsy input', () => {
      assert.equal(fGBsname(''), '');
      assert.equal(fGBsname(null), '');
      assert.equal(fGBsname(undefined), '');
    });
  });

  describe('fGBname', () => {
    it('resolves name from CityEntityDefs when present', () => {
      const defs = {
        X_BronzeAge_Landmark1: { name: 'Tower of Babel Def' },
      };
      assert.equal(
        fGBname('X_BronzeAge_Landmark1', false, defs),
        'Tower of Babel Def',
      );
    });

    it('falls back to GB_FALLBACK_NAMES when not in defs', () => {
      assert.equal(fGBname('X_FutureEra_Landmark1', false, {}), 'The Arc');
      assert.equal(
        fGBname('X_ProgressiveEra_Landmark1', false, {}),
        'Alcatraz',
      );
    });

    it('returns raw id if unknown and not in fallback map', () => {
      assert.equal(
        fGBname('Unknown_Entity_XYZ', false, {}),
        'Unknown_Entity_XYZ',
      );
    });

    it('reports lookup to metadataStore when requested', () => {
      let reported = null;
      const mockStore = {
        reportEntityLookup: (id, result) => {
          reported = { id, result };
        },
      };
      fGBname('X_FutureEra_Landmark1', true, {}, mockStore);
      assert.equal(reported.id, 'X_FutureEra_Landmark1');
      assert.equal(reported.result, true);
    });

    it('returns empty string for falsy input', () => {
      assert.equal(fGBname(''), '');
      assert.equal(fGBname(null), '');
    });
  });

  describe('fCFname', () => {
    it('returns "Château" when helper returns "Château Frontenac"', () => {
      const mockHelper = {
        fGBname: (id) =>
          id === 'X_ProgressiveEra_Landmark2' ? 'Château Frontenac' : '',
      };
      assert.equal(fCFname(mockHelper), 'Château');
    });

    it('returns "Chateau" when helper returns "Chateau Frontenac"', () => {
      const mockHelper = {
        fGBname: (id) =>
          id === 'X_ProgressiveEra_Landmark2' ? 'Chateau Frontenac' : '',
      };
      assert.equal(fCFname(mockHelper), 'Chateau');
    });

    it('returns "Frontenac" when second token is "Frontenac"', () => {
      const mockHelper = {
        fGBname: (id) =>
          id === 'X_ProgressiveEra_Landmark2' ? 'Le Frontenac' : '',
      };
      assert.equal(fCFname(mockHelper), 'Frontenac');
    });

    it('returns the raw name when neither token matches Chateau/Château/Frontenac', () => {
      const mockHelper = {
        fGBname: (id) =>
          id === 'X_ProgressiveEra_Landmark2' ? 'Custom CF Landmark' : '',
      };
      assert.equal(fCFname(mockHelper), 'Custom CF Landmark');
    });

    it('returns "Chateau" default when helper returns empty or null', () => {
      const mockHelper = {
        fGBname: () => '',
      };
      assert.equal(fCFname(mockHelper), 'Chateau');
      assert.equal(fCFname({}), 'Chateau');
    });
  });

  describe('fArcname', () => {
    it('returns "Arc" when helper returns "The Arc"', () => {
      const mockHelper = {
        fGBname: (id) => (id === 'X_FutureEra_Landmark1' ? 'The Arc' : ''),
      };
      assert.equal(fArcname(mockHelper), 'Arc');
    });

    it('returns the localized name when helper returns something other than "The Arc"', () => {
      const mockHelper = {
        fGBname: (id) => (id === 'X_FutureEra_Landmark1' ? 'Arche' : ''),
      };
      assert.equal(fArcname(mockHelper), 'Arche');
    });

    it('returns "Arc" when helper returns "Arc"', () => {
      const mockHelper = {
        fGBname: (id) => (id === 'X_FutureEra_Landmark1' ? 'Arc' : ''),
      };
      assert.equal(fArcname(mockHelper), 'Arc');
    });

    it('returns "Arc" default when helper returns empty or null', () => {
      const mockHelper = {
        fGBname: () => '',
      };
      assert.equal(fArcname(mockHelper), 'Arc');
      assert.equal(fArcname({}), 'Arc');
    });
  });
});
