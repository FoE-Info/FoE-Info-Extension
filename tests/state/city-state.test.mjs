import assert from 'node:assert/strict';
import test from 'node:test';
import cityStatePkg from '../../src/js/state/CityState.js';

const { City, createFreshCityState, getCityState, resetCityState } =
  cityStatePkg.default || cityStatePkg;

test('CityState Unit Suite', async (t) => {
  await t.test(
    'createFreshCityState initializes all expected default fields',
    () => {
      const state = createFreshCityState();
      assert.equal(state.ArcBonus, 90);
      assert.equal(state.ForgePoints, 0);
      assert.equal(state.Attack, 0);
      assert.equal(state.Defense, 0);
      assert.equal(state.GBGAttackingAttack, 0);
      assert.equal(state.GEAttackingAttack, 0);
      assert.equal(state.QIAttackingAttack, 0);
    },
  );

  await t.test('getCityState returns active City singleton', () => {
    const city = getCityState();
    assert.equal(city, City);
  });

  await t.test(
    'resetCityState cleans mutated and custom properties back to defaults',
    () => {
      City.ForgePoints = 5000;
      City.Attack = 1500;
      City.customTempField = 'temporary';

      resetCityState(City);

      assert.equal(City.ForgePoints, 0);
      assert.equal(City.Attack, 0);
      assert.equal('customTempField' in City, false);
    },
  );
});
