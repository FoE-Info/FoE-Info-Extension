import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  SPECIAL_GOODS,
  NON_GOODS_KEYS,
  isSpecialGood,
  isNonGoodKey,
} = require('../../src/js/calc/goods/goodsClassification.js');

test('goodsClassification suite', async (t) => {
  await t.test('SPECIAL_GOODS contains known space and colony goods', () => {
    assert.ok(SPECIAL_GOODS instanceof Set);
    assert.ok(SPECIAL_GOODS.has('promethium'));
    assert.ok(SPECIAL_GOODS.has('orichalcum'));
    assert.ok(SPECIAL_GOODS.has('mars_ore'));
    assert.ok(SPECIAL_GOODS.has('asteroid_ice'));
    assert.ok(SPECIAL_GOODS.has('venus_carbon'));
    assert.ok(SPECIAL_GOODS.has('unknown_dna'));
    assert.ok(SPECIAL_GOODS.has('crystallized_hydrocarbons'));
    assert.ok(SPECIAL_GOODS.has('dark_matter'));
    assert.ok(SPECIAL_GOODS.has('stellar_void_shard'));
    assert.ok(SPECIAL_GOODS.has('stel_void_shard'));
  });

  await t.test(
    'NON_GOODS_KEYS contains standard non-tradeable currencies',
    () => {
      assert.ok(NON_GOODS_KEYS instanceof Set);
      assert.ok(NON_GOODS_KEYS.has('money'));
      assert.ok(NON_GOODS_KEYS.has('supplies'));
      assert.ok(NON_GOODS_KEYS.has('medals'));
      assert.ok(NON_GOODS_KEYS.has('strategy_points'));
      assert.ok(NON_GOODS_KEYS.has('clan_power'));
      assert.ok(NON_GOODS_KEYS.has('population'));
      assert.ok(NON_GOODS_KEYS.has('happiness'));
      assert.ok(NON_GOODS_KEYS.has('units'));
      assert.ok(NON_GOODS_KEYS.has('premium'));
    },
  );

  await t.test('isSpecialGood identifies special goods correctly', () => {
    assert.equal(isSpecialGood('mars_ore'), true);
    assert.equal(isSpecialGood('promethium'), true);
    assert.equal(isSpecialGood('iron'), false);
    assert.equal(isSpecialGood('money'), false);
    assert.equal(isSpecialGood(null), false);
    assert.equal(isSpecialGood(undefined), false);
    assert.equal(isSpecialGood(123), false);
  });

  await t.test('isNonGoodKey identifies non-goods keys correctly', () => {
    assert.equal(isNonGoodKey('strategy_points'), true);
    assert.equal(isNonGoodKey('money'), true);
    assert.equal(isNonGoodKey('supplies'), true);
    assert.equal(isNonGoodKey('dyes'), false);
    assert.equal(isNonGoodKey('mars_ore'), false);
    assert.equal(isNonGoodKey(null), false);
    assert.equal(isNonGoodKey(''), false);
  });
});
