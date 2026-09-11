import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { MetadataStore } from '../../src/js/state/MetadataStore.js';
import logger from '../../src/js/utils/logger.js';

function setup(t, defs, metadata = null) {
  const store = new MetadataStore();
  const source = fs.readFileSync(
    new URL('../../src/js/fn/helper.js', import.meta.url),
    'utf8',
  );
  // Execute the actual contiguous lookup functions, excluding unrelated browser UI imports.
  const lookups = source
    .slice(
      source.indexOf('export function getCityEntityDef('),
      source.indexOf('export function fGoodsTally('),
    )
    .replaceAll('export function ', 'function ');
  const context = {
    metadataStore: metadata || store,
    CityEntityDefs: defs || store.createLegacyCityEntityProxy(),
  };
  vm.runInNewContext(lookups, context);
  const debug = t.mock.method(console, 'debug', () => {});
  logger.setDebugEnabled(true, { persist: false });
  t.after(() => logger._resetForTesting());
  const misses = () =>
    debug.mock.calls
      .filter(({ arguments: args }) => args[1] === 'Cache miss for entity:')
      .map(({ arguments: args }) => args[2]);
  return { store, ...context, misses };
}

test('fEntityNameTrim falls back to live metadata when legacy lookups miss', (t) => {
  const metadata = {
    getEntity: (id) =>
      id === 'W_MultiAge_LiveOnly' ?
        { id, name: 'Live Metadata Building' }
      : null,
    peekEntity: () => null,
    reportEntityLookup: () => {},
  };
  const { fEntityNameTrim } = setup(t, {}, metadata);
  assert.equal(
    fEntityNameTrim('W_MultiAge_LiveOnly'),
    'Live Metadata Building',
  );
});

test('late alias success emits no false misses and preserves the title', (t) => {
  const { store, getCityEntityDef, misses } = setup(t);
  store.entities.set('L_MultiAge_Late', {
    id: 'Late',
    title: 'Late alias name',
  });
  assert.equal(getCityEntityDef('Late').name, 'Late alias name');
  assert.deepEqual(misses(), []);
});

test('repeated missing name probes emit one actionable original entity id', (t) => {
  const { getCityEntityDef, fEntityNameTrim, fGBname, misses } = setup(t);
  for (let i = 0; i < 447; i++) {
    assert.equal(getCityEntityDef({ value: 'W_MultiAge_Missing' }), null);
    assert.equal(fEntityNameTrim('W_MultiAge_Missing'), 'W_MultiAge_Missing');
    assert.equal(fGBname('W_MultiAge_Missing'), 'W_MultiAge_Missing');
  }
  assert.deepEqual(misses(), ['W_MultiAge_Missing']);
});

test('a Great Building fallback is a successful resolution, not a cache miss', (t) => {
  const { getCityEntityDef, fGBname, misses } = setup(t);
  assert.equal(getCityEntityDef('X_FutureEra_Landmark1').name, 'The Arc');
  assert.equal(fGBname('X_FutureEra_Landmark1'), 'The Arc');
  assert.deepEqual(misses(), []);
});

test('legacy definition precedence survives silent alias probing', (t) => {
  const { store, getCityEntityDef, misses } = setup(t, {
    L_MultiAge_Priority: { id: 'Priority', Name: 'Legacy name' },
  });
  store.registerEntity({ id: 'Priority', name: 'Store name' });
  assert.equal(getCityEntityDef('Priority').name, 'Legacy name');
  assert.deepEqual(misses(), []);
});

test('miss suppression never caches absent metadata and resets with the store', (t) => {
  const { store, getCityEntityDef, misses } = setup(t);
  assert.equal(getCityEntityDef('New'), null);
  store.registerEntity({ id: 'L_MultiAge_New', name: 'Arrived' });
  assert.equal(getCityEntityDef('New').name, 'Arrived');
  store.reset();
  assert.equal(getCityEntityDef('New'), null);
  assert.deepEqual(misses(), ['New', 'New']);
});

test('standard-mode misses do not consume later debug diagnostics', (t) => {
  const { store, getCityEntityDef, misses } = setup(t);
  logger.setDebugEnabled(false, { persist: false });
  assert.equal(getCityEntityDef('Unknown'), null);
  logger.setDebugEnabled(true, { persist: false });
  assert.equal(getCityEntityDef('Unknown'), null);
  assert.equal(store.getEntity('Unknown'), null);
  assert.deepEqual(misses(), ['Unknown']);
});

test('an unnamed early alias does not hide a later named metadata candidate', (t) => {
  const { store, getCityEntityDef, misses } = setup(t, {});
  store.entities.set('Partial', { id: 'Partial' });
  store.entities.set('L_MultiAge_Partial', {
    id: 'Named',
    name: 'Complete name',
  });
  assert.equal(getCityEntityDef('Partial').name, 'Complete name');
  assert.deepEqual(misses(), []);
});

test('legacy property and membership probes stay silent but direct misses are actionable', (t) => {
  const { store, CityEntityDefs, misses } = setup(t);
  assert.equal(CityEntityDefs.Unknown, undefined);
  assert.equal('Unknown' in CityEntityDefs, false);
  assert.equal(
    Object.getOwnPropertyDescriptor(CityEntityDefs, 'Unknown'),
    undefined,
  );
  assert.deepEqual(misses(), []);
  assert.equal(store.getEntity('Unknown'), null);
  assert.equal(store.getEntity('Unknown'), null);
  assert.deepEqual(misses(), ['Unknown']);
});
