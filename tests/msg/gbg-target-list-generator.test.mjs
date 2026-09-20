import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateTargetList } from '../../src/js/msg/GbgTargetListGenerator.js';

describe('GbgTargetListGenerator Suite', () => {
  it('returns empty results when called with defaults or empty parameters', () => {
    const result = generateTargetList();
    assert.deepEqual(result, {
      textProvinceUnlocked: '',
      textProvinceLocked: '',
      targets: [],
    });
  });

  it('generates targets for Volcano map with focus signals', () => {
    const volcanoDefs = [
      { id: 10, name: 'A1S Sector', connections: [11], totalBuildingSlots: 2 },
      {
        id: 11,
        name: 'B1T Neighbor',
        connections: [10],
        totalBuildingSlots: 2,
      },
    ];
    const map = [
      { id: 10, lockedUntil: 0, ownerId: 2 },
      { id: 11, lockedUntil: 0, ownerId: 3 },
    ];
    const activeSignals = [{ id: 10, type: 'focus' }];

    const result = generateTargetList({
      map,
      activeSignals,
      volcanoDefs,
      currentParticipantId: 1,
      mapName: 'volcano',
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 1);
    assert.equal(result.targets[0].provinceId, 10);
    assert.ok(result.textProvinceUnlocked.length > 0);
    assert.equal(result.textProvinceLocked, '');
  });

  it('generates targets for Waterfall map and uses waterfall sector naming', () => {
    const waterfallDefs = [
      { id: 5, name: 'A1 Waterfall', connections: [], totalBuildingSlots: 1 },
    ];
    const map = [{ id: 5, lockedUntil: 0, ownerId: 4 }];
    const activeSignals = [{ id: 5, type: 'focus' }];

    const result = generateTargetList({
      map,
      activeSignals,
      waterfallDefs,
      mapName: 'waterfall',
      currentParticipantId: 1,
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 1);
    assert.equal(result.targets[0].provinceId, 5);
    assert.equal(result.targets[0].tag, 'A1');
    assert.match(result.textProvinceUnlocked, /A1/);
  });

  it('skips provinces owned by the current participant', () => {
    const volcanoDefs = [
      { id: 20, name: 'C1T Sector', connections: [], totalBuildingSlots: 1 },
    ];
    const map = [{ id: 20, lockedUntil: 0, ownerId: 99 }];
    const activeSignals = [{ id: 20, type: 'focus' }];

    const result = generateTargetList({
      map,
      activeSignals,
      volcanoDefs,
      currentParticipantId: 99,
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 0);
    assert.equal(result.textProvinceUnlocked, '');
    assert.equal(result.textProvinceLocked, '');
  });

  it('separates unlocked and locked provinces and sorts locked provinces by lockedUntil', () => {
    const volcanoDefs = [
      { id: 1, name: 'A1S One', connections: [], totalBuildingSlots: 1 },
      { id: 2, name: 'B1S Two', connections: [], totalBuildingSlots: 1 },
      { id: 3, name: 'C1S Three', connections: [], totalBuildingSlots: 1 },
    ];
    const map = [
      { id: 2, lockedUntil: 1800000200, ownerId: 10 },
      { id: 1, lockedUntil: 0, ownerId: 10 },
      { id: 3, lockedUntil: 1800000100, ownerId: 10 },
    ];
    const activeSignals = [
      { id: 1, type: 'focus' },
      { id: 2, type: 'focus' },
      { id: 3, type: 'focus' },
    ];

    const result = generateTargetList({
      map,
      activeSignals,
      volcanoDefs,
      currentParticipantId: 1,
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 3);
    assert.ok(result.textProvinceUnlocked.length > 0);
    assert.ok(result.textProvinceLocked.length > 0);

    // Locked targets in array should be sorted: lockedUntil 1800000100 before 1800000200
    const lockedTargets = result.targets.filter((t) => t.lockedUntil > 0);
    assert.equal(lockedTargets[0].provinceId, 3);
    assert.equal(lockedTargets[1].provinceId, 2);
  });

  it('incorporates custom targetText into target string', () => {
    const volcanoDefs = [
      { id: 30, name: 'D1S Sector', connections: [], totalBuildingSlots: 1 },
    ];
    const map = [{ id: 30, lockedUntil: 0, ownerId: 2 }];
    const activeSignals = [{ id: 30, type: 'focus' }];

    const result = generateTargetList({
      map,
      activeSignals,
      volcanoDefs,
      currentParticipantId: 1,
      targetText: 'RUSH NOW',
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 1);
    assert.match(result.targets[0].text, /RUSH NOW/);
  });

  it('ignores sectors with ignore signals', () => {
    const volcanoDefs = [
      { id: 40, name: 'D2S Sector', connections: [], totalBuildingSlots: 1 },
    ];
    const map = [{ id: 40, lockedUntil: 0, ownerId: 2 }];
    const activeSignals = [{ id: 40, type: 'ignore' }];

    const result = generateTargetList({
      map,
      activeSignals,
      volcanoDefs,
      currentParticipantId: 1,
      options: { GBGshowSC: true, GBGprovinceTime: true },
    });

    assert.equal(result.targets.length, 0);
  });
});
