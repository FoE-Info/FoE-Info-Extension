import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  groupGalaxyBuildings,
  renderGalaxyBuildingList,
} from '../../src/js/ui/galaxyBuildingGrouper.js';

describe('galaxyBuildingGrouper Suite', () => {
  it('returns empty array when given null, undefined, or empty array', () => {
    assert.deepEqual(groupGalaxyBuildings(null), []);
    assert.deepEqual(groupGalaxyBuildings(undefined), []);
    assert.deepEqual(groupGalaxyBuildings([]), []);
  });

  it('groups duplicate buildings with matching fp and ready status in normal mode', () => {
    const buildings = [
      { name: 'Snowdrop Garden', fp: 270, isReady: true },
      { name: 'Snowdrop Garden', fp: 270, isReady: true },
      { name: 'Winner Plaza', fp: 30, isReady: true },
    ];

    const groups = groupGalaxyBuildings(buildings, false);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].name, 'Snowdrop Garden');
    assert.equal(groups[0].count, 2);
    assert.equal(groups[0].fp, 270);
    assert.equal(groups[0].timerStr, '');
    assert.equal(groups[1].name, 'Winner Plaza');
    assert.equal(groups[1].count, 1);
  });

  it('groups buildings taking into account timerStr when isDebug is true', () => {
    const buildings = [
      {
        name: 'Eternal Market',
        fp: 504,
        isReady: false,
        transition: 1700010000,
      },
      {
        name: 'Eternal Market',
        fp: 504,
        isReady: false,
        transition: 1700010000,
      },
      {
        name: 'Eternal Market',
        fp: 504,
        isReady: false,
        transition: 1700020000,
      },
    ];

    const groups = groupGalaxyBuildings(buildings, true);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].count, 2);
    assert.match(groups[0].timerStr, /\d{2}:\d{2}:\d{2}/);
    assert.equal(groups[1].count, 1);
  });

  it('sets timerStr to READY when isDebug is true and transition is absent/invalid', () => {
    const buildings = [{ name: 'Statue', fp: 10, isReady: true }];
    const groups = groupGalaxyBuildings(buildings, true);
    assert.equal(groups[0].timerStr, 'READY');
  });

  it('renders muted empty message when groupedBuildings is empty or null', () => {
    assert.equal(
      renderGalaxyBuildingList([]),
      '<p class="text-muted mb-0">No ready buildings with FP production</p>',
    );
    assert.equal(
      renderGalaxyBuildingList(null),
      '<p class="text-muted mb-0">No ready buildings with FP production</p>',
    );
  });

  it('renders building list markup for normal mode', () => {
    const groups = [
      {
        name: 'Snowdrop Garden',
        fp: 270,
        count: 2,
        isReady: true,
        timerStr: '',
      },
      { name: 'Winner Plaza', fp: 30, count: 1, isReady: true, timerStr: '' },
    ];

    const html = renderGalaxyBuildingList(groups, false);
    assert.equal(
      html,
      '<p class="mb-0">2x 270FP Snowdrop Garden<br>1x 30FP Winner Plaza<br></p>',
    );
  });

  it('renders building list markup with timer and ready indicators for debug mode', () => {
    const groups = [
      {
        name: 'Eternal Market',
        fp: 504,
        count: 2,
        isReady: false,
        timerStr: '12:34:56',
      },
      {
        name: 'Snowdrop Garden',
        fp: 270,
        count: 1,
        isReady: true,
        timerStr: 'READY',
      },
    ];

    const html = renderGalaxyBuildingList(groups, true);
    assert.equal(
      html,
      '<p class="mb-0">2x 504FP Eternal Market [12:34:56]<br>1x 270FP Snowdrop Garden [READY]<br></p>',
    );
  });
});
