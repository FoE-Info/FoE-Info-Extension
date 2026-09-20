import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  areSignalsEqual,
  isProvinceConquered,
  normalizeClanSignals,
  preserveProvinceBuildings,
} from '../../src/js/msg/GbgMapUtils.js';

describe('GbgMapUtils Suite', () => {
  describe('preserveProvinceBuildings', () => {
    it('carries forward placedBuildings and availableBuildings from oldMap', () => {
      const oldMap = [
        {
          id: 1,
          placedBuildings: ['b1'],
          availableBuildings: ['b1', 'b2'],
        },
      ];
      const newMap = [{ id: 1, currentProgress: 10 }];

      preserveProvinceBuildings(newMap, oldMap);

      assert.deepEqual(newMap[0].placedBuildings, ['b1']);
      assert.deepEqual(newMap[0].availableBuildings, ['b1', 'b2']);
      assert.equal(newMap[0].id, 1);
    });

    it('defaults province id to 0 when missing', () => {
      const map = [{ name: 'ProvA' }];
      preserveProvinceBuildings(map, []);
      assert.equal(map[0].id, 0);
    });

    it('tolerates non-array or empty map inputs', () => {
      assert.doesNotThrow(() => preserveProvinceBuildings(null, []));
      assert.doesNotThrow(() => preserveProvinceBuildings([], null));
    });
  });

  describe('normalizeClanSignals', () => {
    it('normalizes clan signals keys id, provinceId, type, signal', () => {
      const signals = [
        { id: 5, type: 'focus' },
        { provinceId: 10, signal: 'ignore' },
      ];

      normalizeClanSignals(signals);

      assert.deepEqual(signals[0], {
        id: 5,
        provinceId: 5,
        type: 'focus',
        signal: 'focus',
      });
      assert.deepEqual(signals[1], {
        id: 10,
        provinceId: 10,
        type: 'ignore',
        signal: 'ignore',
      });
    });

    it('handles empty or non-array signals gracefully', () => {
      assert.doesNotThrow(() => normalizeClanSignals(null));
      assert.doesNotThrow(() => normalizeClanSignals([]));
    });
  });

  describe('areSignalsEqual', () => {
    it('returns true for matching signals regardless of order', () => {
      const a = [
        { id: 1, type: 'focus' },
        { id: 2, type: 'ignore' },
      ];
      const b = [
        { provinceId: 2, signal: 'ignore' },
        { provinceId: 1, signal: 'focus' },
      ];
      assert.equal(areSignalsEqual(a, b), true);
    });

    it('returns false for different types or lengths', () => {
      const a = [{ id: 1, type: 'focus' }];
      const b = [{ id: 1, type: 'ignore' }];
      assert.equal(areSignalsEqual(a, b), false);

      const c = [
        { id: 1, type: 'focus' },
        { id: 2, type: 'focus' },
      ];
      assert.equal(areSignalsEqual(a, c), false);
    });

    it('returns true for two empty arrays', () => {
      assert.equal(areSignalsEqual([], []), true);
    });
  });

  describe('isProvinceConquered', () => {
    it('returns true if ownerId equals currentParticipantId', () => {
      const conquered = isProvinceConquered(
        { id: 1, ownerId: 100 },
        { id: 1, ownerId: 200 },
        200,
      );
      assert.equal(conquered, true);
    });

    it('returns true if ownerId changed', () => {
      const conquered = isProvinceConquered(
        { id: 1, ownerId: 100 },
        { id: 1, ownerId: 300 },
        200,
      );
      assert.equal(conquered, true);
    });

    it('returns true if lockedUntil increases', () => {
      const conquered = isProvinceConquered(
        { id: 1, lockedUntil: 1000 },
        { id: 1, lockedUntil: 5000 },
        200,
      );
      assert.equal(conquered, true);
    });

    it('returns false if owner and lockedUntil have not changed', () => {
      const notConquered = isProvinceConquered(
        { id: 1, ownerId: 100, lockedUntil: 5000 },
        { id: 1, ownerId: 100, lockedUntil: 5000 },
        200,
      );
      assert.equal(notConquered, false);
    });

    it('returns false when updated province is null or invalid', () => {
      assert.equal(isProvinceConquered(null, null, 100), false);
      assert.equal(isProvinceConquered({ id: 1 }, undefined, 100), false);
    });
  });

  describe('Edge case robustness', () => {
    it('preserveProvinceBuildings handles string/number id coercion and null elements', () => {
      const map = [null, { id: '42' }];
      const oldMap = [{ id: 42, placedBuildings: ['barracks'] }];
      preserveProvinceBuildings(map, oldMap);
      assert.deepEqual(map[1].placedBuildings, ['barracks']);
    });

    it('normalizeClanSignals tolerates null elements inside array', () => {
      const signals = [null, { id: 10, type: 'focus' }];
      assert.doesNotThrow(() => normalizeClanSignals(signals));
      assert.equal(signals[1].provinceId, 10);
    });

    it('areSignalsEqual handles null items without throwing', () => {
      assert.equal(areSignalsEqual([null], [{ id: 1, type: 'focus' }]), false);
      assert.equal(areSignalsEqual([{ id: 1, type: 'focus' }], [null]), false);
    });
  });
});
