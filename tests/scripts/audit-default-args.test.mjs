import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultArgumentCalls,
  defaultSignatures,
} from '../../scripts/lib/default-argument-calls.mjs';

const file = '/repo/Service.js';
const method = { file, owner: 'Service', name: 'register', paramIndex: 1 };
const scan = (source, change = method, caller = '/repo/caller.js') =>
  defaultArgumentCalls(source, caller, change);

test('default audit distinguishes class methods and constructors with identical names', () => {
  const result = defaultSignatures(
    'class A { constructor(x = 1) {} register(d, o = {}) {} } class B { constructor(x = 2) {} register(d) {} }',
  );
  assert.equal(result.get('A.constructor').params[0].defaultExpr, '1');
  assert.equal(result.get('B.constructor').params[0].defaultExpr, '2');
  assert.equal(result.get('A.register').params[1].defaultExpr, '{}');
  assert.equal(result.get('B.register').params.length, 1);
});

test('default audit excludes declarations and methods on unrelated services', () => {
  const result = scan(`import { Other } from './Other.js';
    class Local { register(dispatcher) {} }
    const unrelated = new Other(); unrelated.register(dispatcher);
    const local = new Local(); local.register(dispatcher);`);
  assert.deepEqual(result.sites, []);
  assert.equal(result.unresolved, 0);
});

test('default audit detects omitted and undefined defaults on imported instances and aliases', () => {
  const result = scan(`import { Service as Renamed } from './Service.js';
    const instance = new Renamed(); const alias = instance;
    alias.register(
      dispatcher
    );
    instance.register(dispatcher, undefined);
    instance.register(dispatcher, void 0);
    instance.register(dispatcher, {});`);
  assert.equal(result.sites.length, 3);
  assert.equal(result.unresolved, 0);
});

test('default audit includes constructors and same-file calls', () => {
  const change = { file, owner: 'Service', name: 'constructor', paramIndex: 0 };
  const result = scan(
    'class Service { constructor(meta = null) {} } const instance = new Service();',
    change,
    file,
  );
  assert.equal(result.sites.length, 1);
});

test('default audit resolves CommonJS imports and same-file this method calls', () => {
  assert.equal(
    scan(
      `const { service } = require('./Service.js'); service.register(dispatcher);`,
    ).sites.length,
    1,
  );
  assert.equal(
    scan(
      'class Service { register(d, o = {}) {} open(d) { this.register(d); } }',
      method,
      file,
    ).sites.length,
    1,
  );
});

test('default audit retains unresolved receivers and spread calls without attributing them', () => {
  const result = scan(`import { Service } from './Service.js';
    const service = new Service(); service.register(...args);
    function run(service) { service.register(dispatcher); }`);
  assert.deepEqual(result.sites, []);
  assert.equal(result.unresolved, 2);
});

test('default audit detects imported function aliases and ignores locally shadowed functions', () => {
  const change = { file, owner: null, name: 'calculate', paramIndex: 0 };
  const result = scan(
    `import { calculate as compute } from './Service.js';
    compute(); function run(compute) { compute(); }`,
    change,
  );
  // Matching aliases must use their declaration's identity, not the call spelling.
  assert.equal(result.sites.length, 1);
});
