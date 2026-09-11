import assert from 'node:assert/strict';
import test from 'node:test';
import boostPkg, {
  applyBoostsToCity,
  BoostService,
  boostService,
} from '../../src/js/msg/BoostService.js';

test('BoostService City Ingestion Suite', async (t) => {
  await t.test(
    'resets all 21 boost properties to 0 on empty or missing payload',
    () => {
      const city = {
        CoinBoost: 120,
        SupplyBoost: 50,
        rawBoostAttack: 300,
        rawBoostDefense: 250,
        rawBoostCityAttack: 100,
        rawBoostCityDefense: 100,
        GEAttackingAttack: 50,
        GEAttackingDefense: 50,
        GEDefendingAttack: 20,
        GEDefendingDefense: 20,
        GBGAttackingAttack: 80,
        GBGAttackingDefense: 80,
        GBGDefendingAttack: 40,
        GBGDefendingDefense: 40,
        QIAttackingAttack: 15,
        QIAttackingDefense: 15,
        QIDefendingAttack: 10,
        QIDefendingDefense: 10,
        fpProductionBoost: 25,
        goodsProductionBoost: 10,
        guildGoodsProductionBoost: 30,
        unrelatedProp: 'preserve-me',
      };

      const res = applyBoostsToCity({}, city);
      assert.equal(res, city);
      assert.equal(city.unrelatedProp, 'preserve-me');

      const expectedZeroKeys = [
        'CoinBoost',
        'SupplyBoost',
        'rawBoostAttack',
        'rawBoostDefense',
        'rawBoostCityAttack',
        'rawBoostCityDefense',
        'GEAttackingAttack',
        'GEAttackingDefense',
        'GEDefendingAttack',
        'GEDefendingDefense',
        'GBGAttackingAttack',
        'GBGAttackingDefense',
        'GBGDefendingAttack',
        'GBGDefendingDefense',
        'QIAttackingAttack',
        'QIAttackingDefense',
        'QIDefendingAttack',
        'QIDefendingDefense',
        'fpProductionBoost',
        'goodsProductionBoost',
        'guildGoodsProductionBoost',
      ];

      for (const key of expectedZeroKeys) {
        assert.equal(city[key], 0, `Expected ${key} to be reset to 0`);
      }
    },
  );

  await t.test(
    'handles null, undefined, and malformed msg inputs safely',
    () => {
      const malformedInputs = [
        null,
        undefined,
        {},
        { responseData: null },
        { responseData: 'string' },
        { responseData: 12345 },
        { responseData: {} },
      ];

      for (const input of malformedInputs) {
        const target = {};
        const res = applyBoostsToCity(input, target);
        assert.equal(res, target);
        assert.equal(target.CoinBoost, 0);
        assert.equal(target.rawBoostAttack, 0);
        assert.equal(target.GBGAttackingAttack, 0);
      }

      // Also supports omitting cityTarget parameter
      const defaultRes = applyBoostsToCity(null);
      assert.ok(defaultRes && typeof defaultRes === 'object');
      assert.equal(defaultRes.CoinBoost, 0);
    },
  );

  await t.test('accumulates production boosts correctly', () => {
    const msg = {
      responseData: [
        { type: 'coin_production', value: 15 },
        { type: 'coin_production', value: 25 },
        { type: 'supply_production', value: 40 },
        { type: 'supplies_production', value: 35 },
        { type: 'forge_points_production', value: 12 },
        { type: 'fp_production_boost', value: 8 },
        { type: 'guild_goods_production', value: 50 },
        { type: 'goods_production', value: 100 },
      ],
    };

    const target = {};
    applyBoostsToCity(msg, target);

    assert.equal(target.CoinBoost, 40);
    assert.equal(target.SupplyBoost, 75);
    assert.equal(target.fpProductionBoost, 20);
    assert.equal(target.guildGoodsProductionBoost, 50);
    assert.equal(target.goodsProductionBoost, 100);
  });

  await t.test(
    'accumulates feature combat boosts across all, battleground, guild_expedition, and guild_raids',
    () => {
      const msg = {
        responseData: [
          // Universal 'all'
          { type: 'att_boost_attacker', targetedFeature: 'all', value: 100 },
          { type: 'def_boost_attacker', targetedFeature: 'all', value: 80 },
          { type: 'att_boost_defender', targetedFeature: 'all', value: 60 },
          { type: 'def_boost_defender', targetedFeature: 'all', value: 50 },
          // Battleground
          {
            type: 'att_boost_attacker',
            targetedFeature: 'battleground',
            value: 70,
          },
          {
            type: 'def_boost_attacker',
            targetedFeature: 'battleground',
            value: 65,
          },
          {
            type: 'att_boost_defender',
            targetedFeature: 'battleground',
            value: 30,
          },
          {
            type: 'def_boost_defender',
            targetedFeature: 'battleground',
            value: 25,
          },
          // Guild Expedition
          {
            type: 'att_boost_attacker',
            targetedFeature: 'guild_expedition',
            value: 45,
          },
          {
            type: 'def_boost_attacker',
            targetedFeature: 'guild_expedition',
            value: 40,
          },
          {
            type: 'att_boost_defender',
            targetedFeature: 'guild_expedition',
            value: 20,
          },
          {
            type: 'def_boost_defender',
            targetedFeature: 'guild_expedition',
            value: 15,
          },
          // Guild Raids (Quantum Incursions)
          {
            type: 'att_boost_attacker',
            targetedFeature: 'guild_raids',
            value: 35,
          },
          {
            type: 'def_boost_attacker',
            targetedFeature: 'guild_raids',
            value: 30,
          },
          {
            type: 'att_boost_defender',
            targetedFeature: 'guild_raids',
            value: 10,
          },
          {
            type: 'def_boost_defender',
            targetedFeature: 'guild_raids',
            value: 5,
          },
        ],
      };

      const target = {};
      applyBoostsToCity(msg, target);

      // 'all'
      assert.equal(target.rawBoostAttack, 100);
      assert.equal(target.rawBoostDefense, 80);
      assert.equal(target.rawBoostCityAttack, 60);
      assert.equal(target.rawBoostCityDefense, 50);

      // 'battleground'
      assert.equal(target.GBGAttackingAttack, 70);
      assert.equal(target.GBGAttackingDefense, 65);
      assert.equal(target.GBGDefendingAttack, 30);
      assert.equal(target.GBGDefendingDefense, 25);

      // 'guild_expedition'
      assert.equal(target.GEAttackingAttack, 45);
      assert.equal(target.GEAttackingDefense, 40);
      assert.equal(target.GEDefendingAttack, 20);
      assert.equal(target.GEDefendingDefense, 15);

      // 'guild_raids'
      assert.equal(target.QIAttackingAttack, 35);
      assert.equal(target.QIAttackingDefense, 30);
      assert.equal(target.QIDefendingAttack, 10);
      assert.equal(target.QIDefendingDefense, 5);
    },
  );

  await t.test(
    'handles combined boost types (att_def_boost_attacker, att_def_boost_defender, att_def_boost_attacker_defender)',
    () => {
      const msg = {
        responseData: [
          {
            type: 'att_def_boost_attacker',
            targetedFeature: 'battleground',
            value: 50,
          },
          {
            type: 'att_def_boost_defender',
            targetedFeature: 'guild_expedition',
            value: 20,
          },
          {
            type: 'att_def_boost_attacker_defender',
            targetedFeature: 'all',
            value: 10,
          },
        ],
      };

      const target = {};
      applyBoostsToCity(msg, target);

      // att_def_boost_attacker adds to both attacking attack and attacking defense
      assert.equal(target.GBGAttackingAttack, 50);
      assert.equal(target.GBGAttackingDefense, 50);

      // att_def_boost_defender adds to both defending attack and defending defense
      assert.equal(target.GEDefendingAttack, 20);
      assert.equal(target.GEDefendingDefense, 20);

      // att_def_boost_attacker_defender adds to all 4
      assert.equal(target.rawBoostAttack, 10);
      assert.equal(target.rawBoostDefense, 10);
      assert.equal(target.rawBoostCityAttack, 10);
      assert.equal(target.rawBoostCityDefense, 10);
    },
  );

  await t.test(
    'method on BoostService class and singleton instance functions identically',
    () => {
      const service = new BoostService();
      const msg = {
        responseData: [
          { type: 'coin_production', value: 100 },
          { type: 'att_boost_attacker', targetedFeature: 'all', value: 50 },
        ],
      };

      const target1 = service.applyBoostsToCity(msg);
      assert.equal(target1.CoinBoost, 100);
      assert.equal(target1.rawBoostAttack, 50);

      const target2 = boostService.applyBoostsToCity(msg);
      assert.equal(target2.CoinBoost, 100);
      assert.equal(target2.rawBoostAttack, 50);
    },
  );
});
