# Quad-Graph Exploration & Comparative Analysis Master Plan

**Date**: 2026-09-12  
**Harness**: OpenCode Session Takeover  
**Subagents**:

1. [`graph-knowledge-explorer`](../../.agents/agents/graph-knowledge-explorer.md) (FoE-Info Deep Host Architecture)
2. [`foe-info-original-comparator`](../../.agents/agents/foe-info-original-comparator.md) (Pre-Agentic v1 Baseline Comparison)
3. [`forge-hammer-comparator`](../../.agents/agents/forge-hammer-comparator.md) (Competitor Architecture Benchmarking)
4. [`low-tool-comparator`](../../.agents/agents/low-tool-comparator.md) (Closed-Source Original Lineage & Lost Features)  
   **Methodology**: `graphify`, `codebase-modernization-planner`, `protocol-reverse-engineering`, `systematic-debugging`

---

## 1. Executive Summary & Baseline Readiness

All 5 knowledge graphs in the ecosystem have been completely reindexed with **DeepSeek** community labeling (`graphify-foe-info`, `metadata-store`, `forge-hammer`, `LoW-Tool`, and `FoE-Info-Extension-original`). Stale findings and outdated backup caches have been cleaned out, providing a 100% clean baseline.

This plan orchestrates **four autonomous exploration and comparative workstreams** for OpenCode. Each stream is isolated, writes to its dedicated git-ignored findings directory, and investigates a distinct architectural dimension to produce actionable intelligence on "what next".

```text
                                [ 5 Reindexed Graphs ]
                                (DeepSeek Community Labeled)
                                           │
         ┌──────────────────┬──────────────┴──────────────┬──────────────────┐
         ▼                  ▼                             ▼                  ▼
   [Stream 1]         [Stream 2]                    [Stream 3]         [Stream 4]
graph-knowledge-   foe-info-original-             forge-hammer-       low-tool-
   explorer           comparator                    comparator        comparator
         │                  │                             │                  │
 ├── FoE-Info Host  ├── v1 Baseline Snapshot      ├── Competitor     ├── Closed-Source
 │   Modernization  │   (commit 8c681d1)          │   Architecture   │   Original Lineage
 ├── God Nodes &    ├── Monolith Debt Conquered   ├── Feature Gaps   ├── Stripped / Lost
 │   Data Flows     │   (Startup, index, helper)  │   (Date, Galaxy) │   Features
 └── Findings ->    └── Findings ->               └── Findings ->    └── Findings ->
     graphify-out/      graphify-out/                 ../forge-hammer/   ../LoW-Tool/
     foe-info/          foe-info-original/            graphify-out/      graphify-out/
     findings/          findings/                     findings/          findings/
         │                  │                             │                  │
         └──────────────────┴──────────────┬──────────────┴──────────────────┘
                                           ▼
                       [OpenCode Synthesis & Roadmap]
                        - Consolidate all 4 findings dossiers
                        - Produce evidence-based "What Next" roadmap
                        - Update docs/STATUS.md
```

---

## 2. Stream 1: FoE-Info Host Deep Exploration (`graph-knowledge-explorer`)

### Focus

Deep architectural traversal of the modernized **FoE-Info-Extension** codebase following the recent extractions (`indexUiBindings.js`, `renderBattlegroundsPanel.js`, `formatters.js`, `gbNaming.js`, `StartupCityStatsAggregator.js`, and hybrid TypeScript ports).

### Key Questions to Probe

1. **End-to-End Data Flow**: Trace raw packet reception from `xhrInterceptor.js` / DevTools bridge $\to$ `MessageDispatcher` $\to$ domain service handlers $\to$ pure calculators in `src/js/calc/` $\to$ DOM renderers in `src/js/ui/`. Are there any bypasses, direct DOM mutations from calculators, or hidden globals?
2. **Centrality & Bottlenecks ("God Nodes")**: Run `god_nodes` on `graphify-foe-info`. What are the top 10 nodes by in-degree, out-degree, and betweenness? How did the recent thinning impact `index.js` (566L) and `StartupService.js` (501L)?
3. **Purity Verification**: Does `src/js/calc/` remain 100% free of DOM references (`window`, `document`, jQuery)?
4. **Remaining Outliers**: Quantify the inbound/outbound dependencies of [`legacyBridge.js`](../../src/js/protocol/legacyBridge.js) (831L) and [`CityMapEntityProcessor.js`](../../src/js/calc/CityMapEntityProcessor.js) (657L).

### Deliverable

- **Output File**: `graphify-out/foe-info/findings/2026-09-12-foe-info-modern-architecture.md`
- **OpenCode Prompt**:
  > _"Execute Stream 1 of `docs/plans/2026-09-12-quad-graph-exploration-and-comparison.md` as the `graph-knowledge-explorer` subagent. Traverse `graphify-foe-info` and `graphify-metadata-store`, map the current topology, probe the 4 questions, and save your comprehensive report to `graphify-out/foe-info/findings/2026-09-12-foe-info-modern-architecture.md`."_

---

## 3. Stream 2: Pre-Agentic v1 Baseline Comparison (`foe-info-original-comparator`)

### Focus

Benchmark the modernized extension against the frozen pre-agentic v1 baseline at `../FoE-Info-Extension-original` (commit `8c681d1`).

### Key Questions to Probe

1. **Monolith Decomposition Scorecard**: Compare the original monoliths (`StartupService` ~2,334L $\to$ 501L, `index.js` ~1,646L $\to$ 566L, `helper.js` ~993L $\to$ 210L, `GreatBuildingsService` ~1,226L $\to$ 458L). What specific responsibilities were extracted, and was any legacy functionality lost?
2. **Precision & Safety Evolution**: Identify areas where the v1 baseline used native JavaScript floating-point math that FoE-Info upgraded to BigNumber hybrid rounding (`ROUND_HALF_UP` for Arc, `ROUND_CEIL` for spot locks).
3. **Network Architecture**: Compare the original monolithic packet handling against our decoupled `MessageDispatcher` and passive `xhrInterceptor`.
4. **Parity Check**: Are there any helper functions, string utilities, or event hooks present in v1 that were inadvertently dropped or broken?

### Deliverable

- **Output File**: `graphify-out/foe-info-original/findings/2026-09-12-v1-baseline-comparison.md`
- **OpenCode Prompt**:
  > _"Execute Stream 2 of `docs/plans/2026-09-12-quad-graph-exploration-and-comparison.md` as the `foe-info-original-comparator` subagent. Traverse `graphify-foe-info` against `graphify-foe-info-original`, produce a side-by-side modernization scorecard, verify behavioral parity, and save your findings to `graphify-out/foe-info-original/findings/2026-09-12-v1-baseline-comparison.md`."_

---

## 4. Stream 3: Competitor Architecture Benchmarking (`forge-hammer-comparator`)

### Focus

Compare FoE-Info against the peer competitor extension **Forge-Hammer** (`../forge-hammer`).

### Key Questions to Probe

1. **Feature Architecture & Modularity**: How does Forge-Hammer structure its calculation and UI layers compared to FoE-Info's modular `src/js/calc/` and `src/js/ui/` separation?
2. **Date & Time Formatting Engine**: Compare Forge-Hammer's `FH.DateFormat` against FoE-Info's newly integrated `src/js/utils/date.js`. Does Forge-Hammer offer format tokens or options configurations that FoE-Info should adopt?
3. **Blue Galaxy & Sniping Algorithms**: Compare Blue Galaxy candidate ranking, double-collection probability calculations, and Great Building sniping spot-locking algorithms between both extensions.
4. **Performance & Memory Footprint**: Contrast DOM rendering strategies (Forge-Hammer DOM updates vs FoE-Info Bootstrap 5.3 cards and event listeners).

### Deliverable

- **Output File**: `../forge-hammer/graphify-out/findings/2026-09-12-forge-hammer-comparison.md`
- **OpenCode Prompt**:
  > _"Execute Stream 3 of `docs/plans/2026-09-12-quad-graph-exploration-and-comparison.md` as the `forge-hammer-comparator` subagent. Compare `graphify-foe-info` with `graphify-forge-hammer`, analyze structural trade-offs and feature parity, and save your report to `../forge-hammer/graphify-out/findings/2026-09-12-forge-hammer-comparison.md`."_

---

## 5. Stream 4: Closed-Source Original Lineage (`low-tool-comparator`)

### Focus

Compare FoE-Info against the original closed-source implementation **LoW-Tool** (`../LoW-Tool`).

### Key Questions to Probe

1. **Stripped & Removed Features**: What features and RPC handlers existed in LoW-Tool that were omitted when FoE-Info was open-sourced? Which of these features are safe, valuable, and compliant with current game policies to restore?
2. **Calculation Formula Lineage**: Trace original combat boost formulas, settlement solvers, and antique dealer valuation algorithms. Did FoE-Info alter any core game logic during its evolution?
3. **Packet Interception & Session Resilience**: How did LoW-Tool handle game reconnections, world switches, and cold logins compared to FoE-Info's modern startup barrier?

### Deliverable

- **Output File**: `../LoW-Tool/graphify-out/findings/2026-09-12-low-tool-comparison.md`
- **OpenCode Prompt**:
  > _"Execute Stream 4 of `docs/plans/2026-09-12-quad-graph-exploration-and-comparison.md` as the `low-tool-comparator` subagent. Benchmark `graphify-foe-info` against `graphify-low-tool`, identify removed/lost features and calculation lineage, and save your report to `../LoW-Tool/graphify-out/findings/2026-09-12-low-tool-comparison.md`."_

---

## 6. Synthesis & Takeover Workflow for OpenCode

### Execution Order:

1. OpenCode can launch the 4 subagents in parallel or sequentially using `task` (e.g. `subagent_type: graph-knowledge-explorer`, etc.).
2. Once all 4 streams save their markdown findings, OpenCode reads all 4 documents and synthesizes a master summary:
   - Macro architecture health.
   - Identified gaps and competitive opportunities.
   - Evidence-based recommendation for the **Targeted Surgical Modernization Path**.
3. Record the milestone in `docs/STATUS.md`.
