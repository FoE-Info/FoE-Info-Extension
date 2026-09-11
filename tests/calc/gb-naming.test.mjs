import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import gbNamingPkg from '../../src/js/calc/gbNaming.js';

const { fArcname, fCFname } = gbNamingPkg.default || gbNamingPkg;

describe('gbNaming Suite', () => {
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
