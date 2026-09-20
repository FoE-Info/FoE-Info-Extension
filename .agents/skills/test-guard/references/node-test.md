# Test Guard — Node.js Native Test Runner (`node:test`)

Concrete applications of test hygiene for `node:test` and `node:assert/strict` in FoE-Info.

## Rule 2: Mock Boundaries in Node.js

Justified mock targets:

- Global `fetch` or network requests at the true boundary (`mock.method(global, 'fetch', ...)`)
- Clock and timers (`mock.timers.enable()`, `mock.timers.tick(...)`)
- Filesystem I/O when testing error handling

Unjustified mocks:

- Mocking internal calculator functions (e.g. `mock.method(UnitCalculator, ...)`). Test actual calculations directly.
- Mocking state stores to test state stores. Initialize a real store with test fixtures instead.
- Hand-crafted object literals masquerading as game entities when real fixtures exist under `tests/fixtures/`.

## Rule 3: Parameterized Tests in node:test

Avoid repeating near-identical test blocks. Use loop-based parameterization:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';

const testCases = [
  { era: 'SpaceAgeSpaceHub', expected: 'SASH' },
  { era: 'SpaceAgeTitan', expected: 'SAT' },
];

for (const { era, expected } of testCases) {
  test(`maps era ${era} to ${expected}`, () => {
    assert.equal(getEraShortCode(era), expected);
  });
}
```

## Assertion Discipline (`node:assert/strict`)

- Prefer strict comparisons: `assert.equal`, `assert.deepEqual`.
- Use regex matching for dynamic error strings: `assert.match(output, /pattern/)`.
- Test return values and observable state changes, not private implementation details.
