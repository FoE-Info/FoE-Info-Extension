import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLiveCityStats } from '../../src/js/ui/liveCityStatsCalculator.js';

test('liveCityStatsCalculator Unit Suite', async (t) => {
  await t.test('computes military offense and defense stats correctly', () => {
    const city = {
      Attack: 100,
      Defense: 50,
      GBGAttackingAttack: 200,
      GBGAttackingDefense: 150,
      GEAttackingAttack: 300,
      GEAttackingDefense: 250,
      QIAttackingAttack: 80,
      QIAttackingDefense: 60,
      CityAttack: 40,
      CityDefense: 30,
      GBGDefendingAttack: 70,
      GBGDefendingDefense: 90,
      GEDefendingAttack: 110,
      GEDefendingDefense: 130,
      QIDefendingAttack: 20,
      QIDefendingDefense: 15,
    };

    const stats = calculateLiveCityStats({ city });

    // Red military
    assert.equal(stats.military.red.base.att.toNumber(), 100);
    assert.equal(stats.military.red.base.def.toNumber(), 50);
    assert.equal(stats.military.red.gbg.att.toNumber(), 300); // 200 + 100
    assert.equal(stats.military.red.gbg.def.toNumber(), 200); // 150 + 50
    assert.equal(stats.military.red.ge.att.toNumber(), 400); // 300 + 100
    assert.equal(stats.military.red.ge.def.toNumber(), 300); // 250 + 50
    assert.equal(stats.military.red.qi.att.toNumber(), 80);
    assert.equal(stats.military.red.qi.def.toNumber(), 60);

    // Blue military
    assert.equal(stats.military.blue.base.att.toNumber(), 40);
    assert.equal(stats.military.blue.base.def.toNumber(), 30);
    assert.equal(stats.military.blue.gbg.att.toNumber(), 110); // 70 + 40
    assert.equal(stats.military.blue.gbg.def.toNumber(), 120); // 90 + 30
    assert.equal(stats.military.blue.ge.att.toNumber(), 150); // 110 + 40
    assert.equal(stats.military.blue.ge.def.toNumber(), 160); // 130 + 30
    assert.equal(stats.military.blue.qi.att.toNumber(), 20);
    assert.equal(stats.military.blue.qi.def.toNumber(), 15);
  });

  await t.test('computes special stats and critical strikes', () => {
    const city = {
      ArcBonus: 90.6,
      ChatBonus: 40,
      AOCriticalStrike: 65.5,
      CCCriticalStrike: 20.25,
    };

    const stats = calculateLiveCityStats({ city });

    assert.equal(stats.special.arcPercent.toNumber(), 90.6);
    assert.equal(stats.special.chatBonus.toNumber(), 40);
    assert.equal(stats.special.goodsPerQuest.toNumber(), 7); // floor(40/20 + 5) = 7
    assert.equal(stats.special.aoCriticalStrike.toNumber(), 65.5);
    assert.equal(stats.special.ccCriticalStrike.toNumber(), 20.25);
    assert.equal(stats.special.criticalStrike.toNumber(), 85.75);
  });

  await t.test('applies coin and supply production boosts', () => {
    const city = {
      Coins: 1000,
      CoinBoost: 100, // 100% boost -> 2000
      Supplies: 500,
      SupplyBoost: 50, // 50% boost -> 750
      ForgePoints: 200,
      TrazUnits: 42,
    };

    const stats = calculateLiveCityStats({ city, availableFP: 50 });

    assert.equal(stats.coins.total.toNumber(), 2000);
    assert.equal(stats.supplies.total.toNumber(), 750);
    assert.equal(stats.fp.total.toNumber(), 200);
    assert.equal(stats.units.daily.toNumber(), 42);
    assert.equal(stats.availableFP, 50);
  });
});
