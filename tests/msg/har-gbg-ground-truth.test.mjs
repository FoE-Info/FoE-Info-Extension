import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  calculateProvinceAttrition,
  getAttritionReduction,
} from '../../src/js/calc/GbgCalculator.js';

const require = createRequire(import.meta.url);
const {
  clearSignals,
  getSignals,
  removeSignal,
  setSignal,
} = require('../../src/js/msg/GbgSignalService.js');

function loadBundle(relPath) {
  return JSON.parse(
    fs.readFileSync(new URL(`../fixtures/rpc/har/${relPath}`, import.meta.url)),
  );
}

const SIGNALS = loadBundle('gbg/signals_and_markers.json');
const CONSTRUCTION = loadBundle('gbg/building_construction.json');
const DESTRUCTION = loadBundle('gbg/building_destruction.json');
const RUSHED = loadBundle('gbg/diamond_rushed_camps.json');

function capturesFor(bundle, method) {
  return bundle.captures.filter((c) => c.requestMethod === method);
}

test('HAR ground truth: GBG building construction and destruction', async (t) => {
  await t.test('place payload is [provinceId, buildingId]', () => {
    const places = capturesFor(CONSTRUCTION, 'place');
    assert.ok(places.length >= 2);
    for (const capture of places) {
      const [provinceId, buildingId] = capture.requestData;
      assert.equal(typeof provinceId, 'number');
      assert.equal(typeof buildingId, 'string');
      assert.equal(capture.responseData.__class__, 'Success');
    }
    const ids = places.map((p) => p.requestData[1]);
    assert.ok(ids.includes('barracks_reinforced'));
    assert.ok(ids.includes('barracks_improvised'));
  });

  await t.test('destroy payload is [provinceId, slotId]', () => {
    const destroys = capturesFor(DESTRUCTION, 'destroy');
    assert.ok(destroys.length >= 2);
    for (const capture of destroys) {
      const [provinceId, slotId] = capture.requestData;
      assert.equal(typeof provinceId, 'number');
      assert.equal(typeof slotId, 'number');
      assert.equal(capture.responseData.__class__, 'Success');
    }
  });

  await t.test(
    'getBuildings carries provinceId and placed building timers',
    () => {
      const reads = capturesFor(CONSTRUCTION, 'getBuildings');
      const withBuildings = reads.find(
        (c) =>
          Array.isArray(c.responseData?.placedBuildings) &&
          c.responseData.placedBuildings.some((b) => b.readyAt),
      );
      assert.ok(withBuildings, 'expected a placedBuildings capture');
      assert.equal(typeof withBuildings.responseData.provinceId, 'number');
      for (const building of withBuildings.responseData.placedBuildings) {
        assert.equal(typeof building.id, 'string');
        assert.ok(getAttritionReduction(building.id) > 0);
      }
    },
  );

  await t.test(
    'attrition math respects real readyAt construction timers',
    () => {
      const read = capturesFor(CONSTRUCTION, 'getBuildings').find(
        (c) =>
          Array.isArray(c.responseData?.placedBuildings) &&
          c.responseData.placedBuildings.length >= 2,
      );
      const placedBuildings = read.responseData.placedBuildings;
      const province = { ownerId: 1, placedBuildings };
      const times = placedBuildings
        .map((b) => b.readyAt)
        .filter((n) => typeof n === 'number');

      const underConstruction = calculateProvinceAttrition({
        connectedProvinces: [province],
        currentParticipantId: 1,
        currentEpoc: Math.min(...times) - 10,
      });
      assert.equal(underConstruction.campsReady, 0);
      assert.equal(underConstruction.campsNotReady, 80);
      assert.equal(underConstruction.underConstructionChance, 20);

      const finished = calculateProvinceAttrition({
        connectedProvinces: [province],
        currentParticipantId: 1,
        currentEpoc: Math.max(...times) + 10,
      });
      assert.equal(finished.campsReady, 80);
      assert.equal(finished.campsNotReady, 0);
      assert.equal(finished.attritionChance, 20);
    },
  );
});

test('HAR ground truth: GBG diamond rushed camps', async (t) => {
  await t.test('instantFinish payload is [provinceId, slotId]', () => {
    const rushes = capturesFor(RUSHED, 'instantFinish');
    assert.equal(rushes.length, 2);
    for (const capture of rushes) {
      const [provinceId, slotId] = capture.requestData;
      assert.equal(typeof provinceId, 'number');
      assert.equal(typeof slotId, 'number');
      assert.equal(capture.responseData.__class__, 'Success');
    }
  });

  await t.test(
    'gainAttritionChance promotes rushed camps to ready immediately',
    () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 1,
            placedBuildings: [
              { id: 'barracks_reinforced', readyAt: 9999999999 },
            ],
          },
        ],
        currentParticipantId: 1,
        currentEpoc: 1700000000,
        gainAttritionChance: 60,
      });
      assert.equal(result.campsReady, 40);
      assert.equal(result.campsNotReady, 20);
    },
  );
});

test('HAR ground truth: GBG focus markers and stop signs', async (t) => {
  await t.test('setSignal payload is [provinceId, "focus"|"ignore"]', () => {
    const sets = capturesFor(SIGNALS, 'setSignal');
    assert.ok(sets.length > 0);
    const types = new Set();
    for (const capture of sets) {
      const [provinceId, signalType] = capture.requestData;
      assert.equal(typeof provinceId, 'number');
      assert.ok(
        ['focus', 'ignore'].includes(signalType),
        `unexpected GBG signal type: ${signalType}`,
      );
      types.add(signalType);
    }
    assert.ok(types.has('focus'));
    assert.ok(types.has('ignore'));
  });

  await t.test('removeSignal payload is [provinceId]', () => {
    const removes = capturesFor(SIGNALS, 'removeSignal');
    assert.ok(removes.length > 0);
    for (const capture of removes) {
      assert.equal(capture.requestData.length, 1);
      assert.equal(typeof capture.requestData[0], 'number');
    }
  });

  await t.test('focus adds and ignore/remove mutate the signals list', () => {
    const setFocus = capturesFor(SIGNALS, 'setSignal').find(
      (c) => c.requestData[1] === 'focus',
    );
    const setIgnore = capturesFor(SIGNALS, 'setSignal').find(
      (c) => c.requestData[1] === 'ignore',
    );
    const remove = capturesFor(SIGNALS, 'removeSignal')[0];

    clearSignals();
    setSignal({ requestData: setFocus.requestData });
    let signals = getSignals();
    assert.equal(signals.length, 1);
    assert.equal(Number(signals[0].provinceId), setFocus.requestData[0]);
    assert.equal(signals[0].type, 'focus');

    setSignal({ requestData: setIgnore.requestData });
    signals = getSignals();
    assert.equal(
      signals.some((s) => Number(s.provinceId) === setIgnore.requestData[0]),
      false,
      'ignore must remove the province from the signals list',
    );
    // Re-add and clear via removeSignal (stop sign removal path).
    setSignal({ requestData: setFocus.requestData });
    removeSignal({ requestData: remove.requestData });
    signals = getSignals();
    assert.equal(
      signals.some((s) => Number(s.provinceId) === remove.requestData[0]),
      false,
    );
    clearSignals();
  });
});
