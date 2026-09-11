# Task Plan for OpenCode: Extract Era Mapping from helper.js to src/js/calc/eraMapping.js

## Objective

Extract the era conversion and level mapping helpers (`fLevelfromAge`, `fAgefromLevel`, `fGVGagesname`, `numAges`) from `src/js/fn/helper.js` into a pure, isolated calculation module `src/js/calc/eraMapping.js`.

This reduces `helper.js` (currently 758 lines) by ~140 lines toward the <= 600 line architecture limit, without touching `StartupService.js` or `betaDebugPanel.js`.

---

## Assigned Scope & Boundaries

- **Target New File**: `src/js/calc/eraMapping.js` (<= 150 lines, pure calculation, zero DOM references)
- **Target Test File**: `tests/calc/era-mapping.test.mjs`
- **Modified File**: `src/js/fn/helper.js` (re-exports the extracted functions for 100% backward compatibility)
- **Do NOT touch**: `src/js/msg/StartupService.js`, `src/js/msg/EmissaryService.js`, `src/js/calc/gbNaming.js`, or other files being handled by Antigravity in parallel.

---

## Detailed Requirements

### 1. Create `src/js/calc/eraMapping.js`

- Define and export:
  - `numAges = 23` (constant)
  - `fLevelfromAge(age)`: maps era strings (e.g. `'BronzeAge'` -> 1, `'SpaceAgeSpaceHub'` -> 22, `'SpaceAgeDiscovery'` / `'StellarAgeDiscovery'` -> 23) to level integer, or -1 if unknown.
  - `fAgefromLevel(level)`: maps level integer (1 -> `'BronzeAge'`, 23 -> `'SpaceAgeDiscovery'`) to era string.
  - `fGVGagesname(age)`: maps era string to short code (e.g. `'BronzeAge'` -> `'BA'`, `'FutureEra'` -> `'FE'`, `'SpaceAgeTitan'` -> `'SAT'`).
- Implementation style: Use clean dictionary lookups (Maps or plain objects) for $O(1)$ performance instead of 40-tier `if/else` ladders.
- Dual CJS/ESM exports:
  ```javascript
  module.exports = {
    numAges,
    fLevelfromAge,
    fAgefromLevel,
    fGVGagesname,
  };
  module.exports.default = module.exports;
  ```

### 2. Update `src/js/fn/helper.js`

- Import `numAges`, `fLevelfromAge`, `fAgefromLevel`, `fGVGagesname` from `../calc/eraMapping.js`.
- Re-export them from `helper.js` so existing callers across the codebase retain uninterrupted backward compatibility.
- Remove the inline `if/else` ladders for these 4 helpers from `helper.js`.

### 3. Create Unit Test `tests/calc/era-mapping.test.mjs`

- Assert round-trip mappings (`fAgefromLevel(fLevelfromAge('FutureEra')) === 'FutureEra'`).
- Test edge cases: invalid age returns `-1`, invalid level returns empty string or null.
- Assert short codes for key eras (`'SAT'`, `'SASH'`, `'SAD'`, `'FE'`, `'SAM'`, `'BA'`).

---

## Verification

- Run `npm test` to ensure all existing and new tests pass.
- Run `npm run check` to ensure Prettier code formatting is clean.
