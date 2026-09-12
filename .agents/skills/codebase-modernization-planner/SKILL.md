---
name: codebase-modernization-planner
description: 'Roadmap to decompose monoliths and migrate to TypeScript.'
---

# Codebase Modernization & Migration Planner

This skill defines the master architectural procedure to modernize the remaining legacy FoE-Info codebase (eliminating all monolithic files and migrating to TypeScript) without breaking extension functionality, corrupting user data, or causing game session desynchronization.

---

## 1. When to Use

- Planning multi-stage refactoring across the measured large-file inventory (see [`references/monolith-decomposition-phases.md`](references/monolith-decomposition-phases.md)): `StartupService.js` (422), `GreatBuildingsService.js` (468), `GuildBattlegroundService.js` (446), plus the 12-file >450 L backlog. `index.js` (174) is a thin entry point, and `helper.js` (203) / `legacyBridge.js` (62) are **not** monoliths.
- Setting up or extending the hybrid JavaScript/TypeScript compilation pipeline.
- Scaffolding bite-sized task briefs for parallel subagent execution via `subagent-driven-development`.

---

## 2. The 5-Phase Modernization Sequence

```text
Phase 0: TypeScript Hygiene & Pipeline (prerequisite)
  └─ delete dead .js/.ts twins + architecture guards + tsconfig strict
Phase 1: Contracts
  └─ ambient InnoGames RPC & store contracts (src/types/foe-rpc.d.ts, state.d.ts)
Phase 2: Leaf-First TypeScript Migration
  └─ Pure math, utils, and state stores in src/js/ -> .ts
Phase 3: Decompose the Actual Large Files
  └─ >450 L files into <= 250 L single-responsibility typed modules
Phase 4: Orchestrators Last
  └─ index.js, StartupService, legacyBridge, and other entry points
```

jQuery elimination (0 files use `$(`) and the centralized date/time formatting
engine (`src/js/utils/date.js`) are already shipped and are not pending work.

---

## 3. Operational Workflow

### Step 1: Map the Target Slice via Knowledge Graph

Before modifying code, query `graphify-foe-info` with `get_node` and `get_neighbors` for the target symbol. Use `npm run graph:foe-info:ast` only to refresh a stale graph; it does not query dependencies. Measure current file lengths before planning a slice.

### Step 2: Lock Behavior with Characterization Tests

Never refactor without an automated safety net. If test coverage is absent:

1. Capture real InnoGames RPC payloads into `tests/fixtures/`.
2. Write a `node:test` suite verifying the current output.
3. Confirm green: `npm test`.

### Step 3: Package Task for Subagent Execution

Author an isolated Task Brief specifying:

- Source file and target file paths ($\le 250$ lines/file).
- Strict interface contracts (no hidden globals, explicit parameter passing).
- **Debuggability Invariant**: Every extracted module must instantiate `createLogger('<ModuleName>')` from `src/js/utils/logger.js`, log computations/caches/races in debug mode, and remain completely silent in standard mode.
- Delegate to specialist (`monolith-refactoring-specialist`, `javascript-expert`, `foe-*`) using isolated worktrees (`Workspace: "share"`).

### Step 4: Adversarial Plan Review

Submit non-trivial plans to [`adversarial-debater`](../../agents/adversarial-debater.md) to challenge assumptions, identify race conditions, and weed out over-engineering before execution.

### Step 5: Verify Full Gate

Run the complete 5-stage verification gate:

```bash
npm run verify
```

---

## 4. References

- [`references/typescript-hybrid-strategy.md`](references/typescript-hybrid-strategy.md): Webpack setup, `tsconfig.json`, and conversion sequence.
- [`references/monolith-decomposition-phases.md`](references/monolith-decomposition-phases.md): Verified line-count inventory and >450 L decomposition backlog.
