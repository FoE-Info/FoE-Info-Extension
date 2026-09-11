---
name: codebase-modernization-planner
description: "Roadmap to decompose monoliths and migrate to TypeScript."
---

# Codebase Modernization & Migration Planner

This skill defines the master architectural procedure to modernize the remaining legacy FoE-Info codebase (eliminating all monolithic files and migrating to TypeScript) without breaking extension functionality, corrupting user data, or causing game session desynchronization.

---

## 1. When to Use

- Planning multi-stage refactoring across the 6 monolithic anchors (`StartupService.js`, `index.js`, `GreatBuildingsService.js`, `helper.js`, `GuildBattlegroundService.js`, `legacyBridge.js`).
- Setting up or extending the hybrid JavaScript/TypeScript compilation pipeline.
- Scaffolding bite-sized task briefs for parallel subagent execution via `subagent-driven-development`.

---

## 2. The 5-Phase Modernization Sequence

```text
Phase 1: Hybrid TypeScript Infrastructure
  └─ tsconfig.json + Webpack loader + ambient RPC contracts (.d.ts)
Phase 2: Leaf-First TypeScript Migration
  └─ Pure math & calculation engines in src/js/calc/* -> .ts
Phase 3: Monolith Decomposition & Service Extraction
  └─ Remaining StartupService & GreatBuildingsService responsibilities -> src/js/msg/
Phase 4: Legacy Helper & jQuery Elimination
  └─ Remaining helper.js responsibilities & jQuery DOM calls -> modular typed native utils
Phase 5: Orchestrator Thinning
  └─ index.js -> <= 80-line pure routing entry point (roadmap target)
```

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
- [`references/monolith-decomposition-phases.md`](references/monolith-decomposition-phases.md): Line-by-line debt breakdown of the 6 monoliths.
