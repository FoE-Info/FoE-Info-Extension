# Codebase Modernization — TypeScript Hybrid Design

**Date**: 2026-09-12
**Status**: Draft for review
**Scope**: Resolve the JavaScript/TypeScript duplication debt and establish a
single-source-of-truth TypeScript pipeline for the FoE-Info extension, then
migrate incrementally without changing runtime behavior.
**Supersedes**: the stale premises in
`.agents/skills/codebase-modernization-planner/references/` (see §7).

## 1. Problem & verified facts

- The extension has **207 JS files and 12 hand-written `.ts` twins**. The
  `.ts` files are never imported: webpack bundles **0 `.ts` modules** in both
  the dev and prod builds (verified via `--json` stats). Each twin duplicates
  its `.js` and drifts silently (`cardVisibility.js` 503 L vs `.ts` 789 L;
  `MetadataStore` 486 vs 596).
- The **resolved runtime is the `.js`** and dev == prod on that source graph
  (differences are only dev-only `src/js/dev/*` seeders and the prod CSS
  pipeline). There is no `.ts` in either artifact.
- The codebase is **overwhelmingly CJS**: 166 files use `require(`, 181
  `module.exports`; only 20 `import` / 22 `export`.
- `tsconfig.json` is `allowJs:true`, `checkJs:false`, `strict:false`,
  `noEmit:true`; webpack uses `ts-loader` with `transpileOnly:true`.
- `npm test` runs raw `node --test "tests/**/*.test.mjs"`.
- **Node 26.8.2 (engines `>=24`)** executes `.ts` natively via type
  stripping — verified: `node --test foo.test.ts` and an `.mjs` importing a
  `.ts` both pass.
- Already done and therefore out of scope: jQuery elimination (0 files use
  `$(`) and the centralized date/time formatting engine
  (`src/js/utils/date.js`).

## 2. Goals / non-goals

**Goals**

1. One source of truth per module — eliminate all `.js`/`.ts` twins.
2. Use TypeScript for types in the codebase, incrementally, leaf-first.
3. Keep dev and prod resolving the identical `src/js` source.
4. Keep `npm run verify` green at every step; no runtime behavior change.

**Non-goals**

- No big-bang rewrite; no MV3/permission changes.
- No autonomous live-browser verification (Browser Hygiene rule); browser
  checks run only on explicit user request.
- No forced conversion of the CJS runtime to ESM in this effort.

## 3. Decisions

- **D1 — JS is authoritative today.** Documented, not fought: the `.js` files
  are the shipping runtime in dev and prod.
- **D2 — One extension per module.** A basename must not exist as both `.js`
  and `.ts` under `src/js`.
- **D3 — "Migrated" is defined by resolution.** A module is migrated only when
  its `.ts` is the resolved source: `.js` deleted, **all** importers updated to
  an explicit `.ts` path, and its tests execute the `.ts`.
- **D4 — Test/build execution = Node native type stripping.** Node `>=24`
  strips types; no `tsx`/`ts-node` dependency. Constraints: **erasable syntax
  only** (no `enum`, `namespace`, parameter properties, `import =`) and
  **explicit relative extensions**. Webpack continues to bundle `.ts` via
  `ts-loader`.
- **D5 — Strictness flips after twins are gone.** Keep `checkJs:false`;
  after the twins are resolved, set `strict:true` so migrated `.ts` is checked
  strictly (JS remains unchecked until individually adopted).
- **D6 — Explicit imports, no ambiguity.** Adopt explicit `.js`/`.ts`
  extensions for internal relative imports. With no twins, `resolve.extensions`
  order becomes irrelevant.
- **D7 — Guardrails make drift impossible.** A twin-guard test and an
  explicit-extension lint/check run in `verify`.

## 4. Migration sequence

**Phase 0 — TS hygiene & pipeline (new; prerequisite)**

- P0a resolve the 12 twins. Migrate to `.ts` (per D3): the 9 pure, tested leaf
  modules — `calc/GreatBuildingCalculator`, `calc/BlueGalaxyCalculator`,
  `calc/InvestedCalculator`, `calc/GbgCalculator`, `calc/CityStatsCalculator`,
  `calc/eraMapping`, `calc/utils/spatialUtils`, `calc/utils/eraUtils`,
  `calc/utils/bignumberUtils`. Delete the stale, never-resolved `.ts` for the 3
  entangled modules — `ui/cardVisibility`, `ui/panelDispatcher`,
  `state/MetadataStore` — and re-type them after the Phase 3 decomposition.
- P0b add the twin-guard test + explicit-extension check to `verify`.
- P0c flip `strict:true` once the twins are gone; confirm `tsc --noEmit` clean.

**Phase 1 — Contracts.** Finish ambient `.d.ts` for InnoGames RPC and stores
(`src/types/foe-rpc.d.ts`, `state.d.ts` already exist); add store contracts.

**Phase 2 — Leaf-first TS.** `calc/` engines, `utils/`, and `state/` stores
become `.ts` with per-module tests.

**Phase 3 — Decompose the actual large files** into ≤250 L single-responsibility
typed modules: `MessageDispatcher` (586), `containerBinding` (571),
`indexUiBindings` (528), `CityEntityHarvestCalculator` (513),
`renderGbDonationPanel` (504), `gbDonationTables` (503), `cardVisibility` (503),
`OtherPlayerService` (500), `collapse` (493), `MetadataStore` (486),
`networkListener` (476), `panelDispatcher` (475).

**Phase 4 — Orchestrators last.** `index.js` (174), `StartupService` (422),
`protocol/legacyBridge.js` (62) and other entry points; re-scope the old
"`index.js` ≤ 80 L" target against its real composition-root duties.

## 5. Verification & success criteria

- `npm run verify` exit 0 at every slice (prettier, lint, `tsc --noEmit`, RPC
  contract, i18n, tests, dev build).
- Twin-guard test: zero `.js`/`.ts` basename collisions under `src/js`.
- Dev/prod webpack stats resolve the same `src/js` modules (dev-only `dev/*`
  fixtures excepted); the count of `.ts` modules equals the number of migrated
  modules in both.
- Each migrated module has a `node:test` suite that executes the `.ts`
  directly (native stripping).

## 6. Risks

- **Node type-strip limits**: non-erasable TS syntax breaks execution — enforce
  in review and via a guard; keep TS `.ts` free of `enum`/`namespace`.
- **CJS/ESM interop**: sources are CJS; `.ts` may use `require`/`module.exports`
  or ESM under Node's detection, but not both in one file. Decide per module.
- **tsc vs ts-loader divergence**: `transpileOnly` skips type errors at build;
  `tsc --noEmit` is the type gate, so it must stay in `verify`.
- **Migration churn**: types on unstable units waste effort — hence
  decompose-before-type (Phase 3 before converting the entangled modules).

## 7. Corrections to the existing skill/plan

- The "6 monolithic anchors" and their line counts are historical: actual sizes
  are `StartupService` 422, `index.js` 174, `GreatBuildingsService` 468,
  `helper.js` 203, `GuildBattlegroundService` 446, `legacyBridge.js` 62.
  `helper.js`/`legacyBridge.js` are **not** monoliths.
- Phase 4 (jQuery elimination) and the date/time backlog item are **already
  done**.
- The plan omits the 12 twins and the test-execution path; both are addressed
  as Phase 0 here.
- Step 5's per-slice `foe-browser` + `inspect:panel` conflicts with the Browser
  Hygiene rule and is re-scoped to on-request only.
