# TypeScript Hygiene — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all dead `.js`/`.ts` twin modules, lock the single-source-of-truth invariant with tests, and set the compiler to strict so real TypeScript migration (Phase 2) starts from a clean baseline.

**Architecture:** The resolved runtime is the CJS `.js` (dev and prod both bundle 0 `.ts`). Phase 0 deletes the 12 dead ESM `.ts` mirrors, adds two architecture guard tests, fixes the 6 extensionless imports, and flips `strict:true`. No runtime behavior changes; no `.ts` source is authored here (that is Phase 2).

**Tech Stack:** Node `node:test` (native `.ts` type stripping on Node >= 24), webpack 5 + `ts-loader`, `tsc --noEmit`.

**Spec:** [`docs/specs/2026-09-12-codebase-modernization-design.md`](../specs/2026-09-12-codebase-modernization-design.md)

## Global Constraints

- Target module size <= 250 lines (hard ceiling <= 600 lines).
- Debuggability Invariant (Rule 16): Every new or refactored module must instantiate `createLogger('<ModuleName>')` from `src/js/utils/logger.js`, emitting `logger.debug(...)` diagnostics when debug mode is enabled, while remaining 100% silent in standard mode.
- BigNumber precision (Rule 9) for all FP and game resource math.
- 5-stage verification gate: `npm run verify` (formatting, lint, i18n parity, tests, development build); run `npm run typecheck` separately.
- Exact twin inventory (all under `src/js/`, 12 files): `calc/BlueGalaxyCalculator.ts`, `calc/CityStatsCalculator.ts`, `calc/eraMapping.ts`, `calc/GbgCalculator.ts`, `calc/GreatBuildingCalculator.ts`, `calc/InvestedCalculator.ts`, `calc/utils/bignumberUtils.ts`, `calc/utils/eraUtils.ts`, `calc/utils/spatialUtils.ts`, `state/MetadataStore.ts`, `ui/cardVisibility.ts`, `ui/panelDispatcher.ts`.

---

### Task 1: Delete the 12 dead `.ts` twins and guard against new twins

**Files:**

- Delete: `src/js/calc/BlueGalaxyCalculator.ts`, `src/js/calc/CityStatsCalculator.ts`, `src/js/calc/eraMapping.ts`, `src/js/calc/GbgCalculator.ts`, `src/js/calc/GreatBuildingCalculator.ts`, `src/js/calc/InvestedCalculator.ts`, `src/js/calc/utils/bignumberUtils.ts`, `src/js/calc/utils/eraUtils.ts`, `src/js/calc/utils/spatialUtils.ts`, `src/js/state/MetadataStore.ts`, `src/js/ui/cardVisibility.ts`, `src/js/ui/panelDispatcher.ts`
- Test: `tests/architecture/no-js-ts-twins.test.mjs`

**Interfaces:**

- Consumes: nothing.
- Produces: the invariant "no basename exists as both `.js` and `.ts` under `src/js/`"; the guard test `tests/architecture/no-js-ts-twins.test.mjs` (asserts a non-empty walk so it cannot pass vacuously).

- [x] **Step 1: Write the failing test**

```javascript
// tests/architecture/no-js-ts-twins.test.mjs
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../src/js');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

test('no module exists as both .js and .ts under src/js', async () => {
  const bases = new Map();
  for (const file of await walk(ROOT)) {
    const ext = path.extname(file);
    if (ext !== '.js' && ext !== '.ts') continue;
    const base = file.slice(0, -ext.length);
    if (!bases.has(base)) bases.set(base, new Set());
    bases.get(base).add(ext);
  }
  const twins = [...bases.entries()]
    .filter(([, exts]) => exts.has('.js') && exts.has('.ts'))
    .map(([base]) => path.relative(ROOT, base))
    .sort();
  assert.deepEqual(twins, [], `duplicate .js/.ts modules: ${twins.join(', ')}`);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/no-js-ts-twins.test.mjs`
Expected: FAIL listing all 12 twins (e.g. `calc/BlueGalaxyCalculator`, `ui/cardVisibility`, …).

- [x] **Step 3: Confirm the twins are unresolved, then delete them**

Run: `grep -rnE "from '.*\.ts'|require\(['\"].*\.ts['\"]\)" src/js tests --include=*.js --include=*.mjs` — expected: no output (no explicit `.ts` imports).

Then delete all 12 files:

```bash
git rm src/js/calc/BlueGalaxyCalculator.ts src/js/calc/CityStatsCalculator.ts \
  src/js/calc/eraMapping.ts src/js/calc/GbgCalculator.ts \
  src/js/calc/GreatBuildingCalculator.ts src/js/calc/InvestedCalculator.ts \
  src/js/calc/utils/bignumberUtils.ts src/js/calc/utils/eraUtils.ts \
  src/js/calc/utils/spatialUtils.ts src/js/state/MetadataStore.ts \
  src/js/ui/cardVisibility.ts src/js/ui/panelDispatcher.ts
```

- [x] **Step 4: Run the guard test to verify it passes**

Run: `node --test tests/architecture/no-js-ts-twins.test.mjs`
Expected: PASS (1 test, 0 fail).

- [x] **Step 5: Run the full gate**

Run: `npm run verify`
Expected: exit 0; webpack dev bundle compiles; test count increases by 1 (the new architecture guard test).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(ts): remove dead js/ts twin modules" -m "- delete 12 never-resolved ESM .ts mirrors" -m "- add architecture guard against new twins"
```

---

### Task 2: Enforce explicit extensions on internal relative imports

**Files:**

- Test: `tests/architecture/explicit-relative-extensions.test.mjs`
- Modify: `src/js/fn/post.js:20`, `src/js/fn/collapse.js:4`, `src/js/msg/ConversationService.js:22`, `src/js/msg/OtherPlayerService.js:30`, `src/js/msg/StartupService.js:7`, `src/js/ui/renderInvestedPanel.js:11`

**Interfaces:**

- Consumes: nothing.
- Produces: the invariant "every internal relative `require`/`from` specifier ends in `.js`/`.ts`/`.json`/`.mjs`/`.scss`/`.css`".

- [x] **Step 1: Write the failing test**

```javascript
// tests/architecture/explicit-relative-extensions.test.mjs
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../src/js');
const REL_IMPORT = /(?:require\(|from\s+)['"]\s*(\.\.?\/[^'"]+)['"]/g;
const VALID_EXT = /\.(js|ts|json|mjs|scss|css)$/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

test('internal relative imports use explicit extensions', async () => {
  const violations = [];
  let scanned = 0;
  let matched = 0;
  for (const file of await walk(ROOT)) {
    if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
    scanned += 1;
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(REL_IMPORT)) {
      matched += 1;
      if (!VALID_EXT.test(match[1])) {
        violations.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
  }
  assert.ok(scanned > 0, 'expected to scan at least one .js/.ts file');
  assert.ok(matched > 0, 'expected to match at least one relative specifier');
  assert.deepEqual(violations, [], violations.join('\n'));
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/architecture/explicit-relative-extensions.test.mjs`
Expected: FAIL listing 6 violations, all targeting `AddElement`.

- [x] **Step 3: Fix the 6 specifiers**

Append `.js` to each `AddElement` specifier:

- `src/js/fn/post.js:20` `require('./AddElement'` -> `require('./AddElement.js'`
- `src/js/fn/collapse.js:4` `from './AddElement'` -> `from './AddElement.js'`
- `src/js/msg/ConversationService.js:22` `require('../fn/AddElement'` -> `require('../fn/AddElement.js'`
- `src/js/msg/OtherPlayerService.js:30` `require('../fn/AddElement'` -> `require('../fn/AddElement.js'`
- `src/js/msg/StartupService.js:7` `from '../fn/AddElement'` -> `from '../fn/AddElement.js'`
- `src/js/ui/renderInvestedPanel.js:11` `from '../fn/AddElement'` -> `from '../fn/AddElement.js'`

- [x] **Step 4: Run the guard test to verify it passes**

Run: `node --test tests/architecture/explicit-relative-extensions.test.mjs`
Expected: PASS (1 test, 0 fail).

- [x] **Step 5: Run the full gate**

Run: `npm run verify`
Expected: exit 0.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(ts): require explicit relative import extensions" -m "- add architecture guard for extensionless specifiers" -m "- add .js to six AddElement imports"
```

---

### Task 3: Enable strict TypeScript checking

**Files:**

- Modify: `tsconfig.json`
- Test: n/a (compiler gate)

**Interfaces:**

- Consumes: no `.ts` source remains (Task 1), all imports explicit (Task 2).
- Produces: `strict:true` baseline for Phase 2 migrations; `tsc --noEmit` is the type gate.

- [x] **Step 1: Flip `strict` to true**

In `tsconfig.json`, change `"strict": false,` to `"strict": true,`. Keep `allowJs: true`, `checkJs: false`, `noEmit: true` unchanged.

- [x] **Step 2: Run the type gate**

Run: `npm run typecheck`
Expected: exit 0 (only `.d.ts` ambient files are checked; JS is excluded by `checkJs:false`).

If `src/types/state.d.ts` or `src/types/foe-rpc.d.ts` report errors under strict, fix them in place (they are small ambient contracts) and re-run until exit 0.

- [x] **Step 3: Run the full gate**

Run: `npm run verify`
Expected: exit 0.

- [x] **Step 4: Commit**

```bash
git add tsconfig.json src/types
git commit -m "chore(ts): enable strict compiler checks" -m "- set strict true now that no drift mirrors remain" -m "- keep checkJs false until leaf migration"
```

---

### Task 4: Align the modernization skill references with reality

**Files:**

- Modify: `.agents/skills/codebase-modernization-planner/references/monolith-decomposition-phases.md`
- Modify: `.agents/skills/codebase-modernization-planner/references/typescript-hybrid-strategy.md`

**Interfaces:**

- Consumes: the verified facts from the spec (§1, §7).
- Produces: a correct reference the next migration session reads instead of the stale counts.

- [x] **Step 1: Update the monolith inventory**

In `monolith-decomposition-phases.md` §1, replace the 6-row table with the current measured inventory and mark it verified:

| File                              | Current L | Status         |
| :-------------------------------- | --------: | :------------- |
| `msg/StartupService.js`           |       422 | decompose      |
| `index.js`                        |       174 | thin           |
| `msg/GreatBuildingsService.js`    |       468 | decompose      |
| `fn/helper.js`                    |       203 | not a monolith |
| `msg/GuildBattlegroundService.js` |       446 | decompose      |
| `protocol/legacyBridge.js`        |        62 | not a monolith |

Add the real >450 L backlog: `protocol/MessageDispatcher.js` (586), `ui/containerBinding.js` (571), `ui/indexUiBindings.js` (528), `calc/entities/CityEntityHarvestCalculator.js` (513), `ui/renderGbDonationPanel.js` (504), `ui/cardVisibility.js` (503), `ui/gbDonationTables.js` (503), `msg/OtherPlayerService.js` (500), `fn/collapse.js` (493), `state/MetadataStore.js` (486), `protocol/networkListener.js` (476), `ui/panelDispatcher.js` (475). Delete §3 item A (date/time engine) — already shipped in `src/js/utils/date.js`.

- [x] **Step 2: Update the TS hybrid strategy**

In `typescript-hybrid-strategy.md`:

- Replace the `@babel/preset-typescript` mention with `ts-loader` (`transpileOnly:true`, already configured in `webpack.common.js`).
- State the execution decision: tests run `.ts` natively via Node >= 24 type stripping (verified); erasable syntax only; explicit relative extensions.
- Note the 12 dead mirrors were deleted in Phase 0 and real TS is authored from the authoritative `.js` in Phase 2.
- Note `.d.ts` paths are `src/types/foe-rpc.d.ts` and `src/types/state.d.ts` (not `inno-rpc.d.ts`).

- [x] **Step 3: Run docs checks**

Run: `npm run check`
Expected: exit 0 (Prettier clean). If markdown is reformatted by Prettier, accept it.

- [x] **Step 4: Commit**

```bash
git add .agents/skills/codebase-modernization-planner/references
git commit -m "docs: correct modernization skill references" -m "- update monolith inventory to measured sizes" -m "- record native ts execution and removed mirrors"
```

---

## Self-Review

**Spec coverage:** Phase 0 P0a → Task 1; P0b → Tasks 1–2; P0c → Task 3; §7 reference corrections → Task 4. Phases 1–4 intentionally out of scope here (separate plans). Covered.

**Placeholder scan:** No TBD/TODO; every step has exact paths, code, and expected output. Covered.

**Type consistency:** The guard tests import only `node:fs/promises`, `node:path`, `node:test`, `node:assert/strict`. Filenames `tests/architecture/no-js-ts-twins.test.mjs` and `tests/architecture/explicit-relative-extensions.test.mjs` are referenced consistently. Covered.

**Note on later phases:** Phases 1–4 (contracts, leaf-first TS, monolith decomposition, orchestrators) each get their own plan, written after Phase 0 lands.
