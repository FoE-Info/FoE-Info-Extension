import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTargetGeneratorTargets as reExportedBuildTargets,
  sortProvincesByLock as reExportedSortProvinces,
} from '../../src/js/ui/renderTargetGeneratorCard.js';
import {
  buildTargetGeneratorTargets,
  sortProvincesByLock,
} from '../../src/js/ui/targetTokenAssembler.js';

describe('targetTokenAssembler Suite', () => {
  describe('Backward compatibility re-exports', () => {
    it('re-exports functions identically on renderTargetGeneratorCard', () => {
      assert.equal(reExportedSortProvinces, sortProvincesByLock);
      assert.equal(reExportedBuildTargets, buildTargetGeneratorTargets);
    });
  });

  describe('sortProvincesByLock', () => {
    it('handles empty or undefined map gracefully', () => {
      assert.deepEqual(sortProvincesByLock([]), []);
      assert.deepEqual(sortProvincesByLock(null), []);
      assert.deepEqual(sortProvincesByLock(undefined), []);
    });

    it('sorts provinces with lockedUntil soonest first, placing unlocked provinces at the end', () => {
      const map = [
        { id: 1, lockedUntil: 0 },
        { id: 2, lockedUntil: 1700000200 },
        { id: 3, lockedUntil: null },
        { id: 4, lockedUntil: 1700000100 },
        { id: 5, lockedUntil: 1700000300 },
      ];

      const sorted = sortProvincesByLock(map);
      assert.equal(sorted[0].id, 4); // 1700000100
      assert.equal(sorted[1].id, 2); // 1700000200
      assert.equal(sorted[2].id, 5); // 1700000300
      assert.ok([1, 3].includes(sorted[3].id));
      assert.ok([1, 3].includes(sorted[4].id));
    });
  });

  describe('buildTargetGeneratorTargets', () => {
    it('returns empty strings when no signals or provinces match', () => {
      const res = buildTargetGeneratorTargets({
        map: [{ id: 1 }],
        signals: [],
        provinceDefs: [{ id: 1, name: 'A1T' }],
      });
      assert.deepEqual(res, {
        textProvinceUnlocked: '',
        textProvinceLocked: '',
      });
    });

    it('ignores sectors owned by currentParticipantId', () => {
      const res = buildTargetGeneratorTargets({
        map: [{ id: 1, ownerId: 42 }],
        signals: [{ provinceId: 1, signal: 'focus' }],
        provinceDefs: [{ id: 1, name: 'A1T' }],
        currentParticipantId: 42,
      });
      assert.deepEqual(res, {
        textProvinceUnlocked: '',
        textProvinceLocked: '',
      });
    });

    it('assembles unlocked target tokens when lockedUntil is absent', () => {
      const res = buildTargetGeneratorTargets({
        map: [{ id: 1, ownerId: 99 }],
        signals: [{ provinceId: 1, signal: 'focus' }],
        provinceDefs: [{ id: 1, name: 'A1T' }],
        currentParticipantId: 42,
        formatSectorName: (name) => `[${name}]`,
        formatTargetToken: ({ sectorTag }) => `${sectorTag} Attack`,
      });
      assert.equal(res.textProvinceUnlocked, '[A1T] Attack');
      assert.equal(res.textProvinceLocked, '');
    });

    it('assembles locked target tokens with <br> separators when lockedUntil is set and showOptions.GBGprovinceTime is enabled', () => {
      const res = buildTargetGeneratorTargets({
        map: [
          { id: 1, ownerId: 99, lockedUntil: 1700000100 },
          { id: 2, ownerId: 99, lockedUntil: 1700000200 },
        ],
        signals: [
          { provinceId: 1, signal: 'focus' },
          { provinceId: 2, signal: 'focus' },
        ],
        provinceDefs: [
          { id: 1, name: 'A1T' },
          { id: 2, name: 'B1S' },
        ],
        currentParticipantId: 42,
        showOptions: { GBGprovinceTime: true },
        formatSectorName: (name) => name,
        formatTime: () => '14:00',
        formatTargetToken: ({ sectorTag, timeText }) =>
          `${sectorTag} (${timeText})`,
      });
      assert.equal(res.textProvinceUnlocked, '');
      assert.equal(res.textProvinceLocked, 'A1T (14:00)<br>B1S (14:00)');
    });

    it('falls back to volcanoProvinceDefs and waterfallProvinceDefs when provinceDefs is empty', () => {
      const resVolcano = buildTargetGeneratorTargets({
        map: [{ id: 10 }],
        signals: [{ provinceId: 10, signal: 'focus' }],
        provinceDefs: [],
        volcanoProvinceDefs: [{ id: 10, name: 'Volcano_A1' }],
        formatSectorName: (name) => name,
        formatTargetToken: ({ sectorTag }) => sectorTag,
      });
      assert.equal(resVolcano.textProvinceUnlocked, 'Volcano_A1');

      const resWaterfall = buildTargetGeneratorTargets({
        map: [{ id: 20 }],
        signals: [{ provinceId: 20, signal: 'focus' }],
        provinceDefs: [],
        volcanoProvinceDefs: [],
        waterfallProvinceDefs: [{ id: 20, name: 'Waterfall_B1' }],
        formatSectorName: (name) => name,
        formatTargetToken: ({ sectorTag }) => sectorTag,
      });
      assert.equal(resWaterfall.textProvinceUnlocked, 'Waterfall_B1');
    });
  });
});
