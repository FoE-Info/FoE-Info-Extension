# Deep Knowledge Graph Update & End-to-End Architectural Exploration Plan

**Date**: 2026-09-12  
**Harness**: OpenCode (or Antigravity executing the task)  
**Agent Specialist**: [`graph-knowledge-explorer`](../../.agents/agents/graph-knowledge-explorer.md)  
**Methodology**: `graphify`, `codebase-modernization-planner`, `systematic-debugging`, `verification-before-completion`

---

## 1. Executive Summary & Mission Objective

Following the recent intensive modernization and thinning slices (reducing `index.js` 1,003 → 566 lines, `helper.js` 402 → 210 lines, adding pure formatters, GBG renderers, and hybrid TypeScript ports), we need to update the architectural knowledge graph to reflect the current codebase topology.

The objective of this task is to:

1. **Run a full deep re-indexing of `graphify-foe-info`**: Extract AST, label semantic communities with the local LLM backend, and export updated visual documentation.
2. **Conduct an end-to-end traversal of the updated graph**: Map central hubs ("god nodes"), dependencies, and community clusters.
3. **Formulate, probe, and answer critical architectural questions**: Investigate data flow, coupling, and remaining debt.
4. **Reflect on system stability & trade-offs**: Critically evaluate whether further monolith decomposition is justified versus leaf-first TypeScript adoption.
5. **Persist findings & next steps**: Save structured findings to `graphify-out/foe-info/findings/2026-09-12-deep-architecture-exploration.md`.

---

## 2. Phase 1: Knowledge Graph AST Update & Export (Zero Local LLM / No llama-swap)

To utilize OpenCode's API potential and avoid local VRAM/llama-swap execution, refresh the AST and visual documentation directly via:

```bash
npm run graph:foe-info:update
```

### What this step does:

1. **Tree-Sitter Code AST Extraction**: Rapidly parses JavaScript, TypeScript, SCSS, HTML, and JSON AST using native tree-sitter parsers into `graphify-out/foe-info/graph.json` without requiring any local vision model or llama-swap instance.
2. **Visual & Structural Documentation Export**: Automatically regenerates:
   - Call-flow architecture HTML (`graphify-out/foe-info/callflow.html`)
   - D3 collapsible tree visualization (`graphify-out/foe-info/GRAPH_TREE.html`)
   - Obsidian markdown vault & canvas (`graphify-out/foe-info/obsidian/`)
   - Wiki documentation pages (`graphify-out/foe-info/wiki/`)
   - Interactive SVG topology graph (`graphify-out/foe-info/graph.svg`)

---

## 3. Phase 2: End-to-End Exploration via OpenCode's Cloud API

All deep reasoning, semantic clustering analysis, architectural probing, and synthesis are driven exclusively by **OpenCode's own API** (`opencode/big-pickle` or configured cloud model), fully utilizing your active OpenCode API quota:

Operate as the [`graph-knowledge-explorer`](../../.agents/agents/graph-knowledge-explorer.md) specialist using Graphify MCP tools (`graphify-foe-info`) in OpenCode:

### Step 2.1: Macro Topology Audit

- Run `graph_stats` on `graphify-foe-info` to record:
  - Total Node Count, Total Edge Count, Community Count, Graph Density.
- Run `god_nodes` on `graphify-foe-info` to identify:
  - Top 10 nodes by in-degree (most heavily depended upon).
  - Top 10 nodes by out-degree (highest blast-radius orchestrators).
  - Top 10 nodes by Betweenness Centrality (critical architectural bridges).

### Step 2.2: Inspect Key Modernization Anchors

Query `get_node` and `get_neighbors` on the following pivotal files and symbols:

1. `src/js/protocol/legacyBridge.js` (How many incoming/outgoing routes? What services are coupled to it?)
2. `src/js/protocol/MessageDispatcher.js` (How clean is dispatcher routing after the takeover?)
3. `src/js/calc/CityMapEntityProcessor.js` (What depends on this 657-line calculator?)
4. `src/js/ui/indexUiBindings.js` (Verify clean separation from `index.js`.)
5. `src/js/fn/helper.js` vs `src/js/utils/formatters.js` and `src/js/ui/renderBattlegroundsPanel.js` (Verify clean re-exports and callers.)
6. `src/js/calc/gbNaming.js` vs `src/js/calc/utils/gbNames.js` (Verify GB map consolidation.)

---

## 4. Phase 3: Targeted Probing & Architectural Questions

The explorer must formulate, investigate, and explicitly answer the following four questions using graph topology corroborated with source inspections:

### Question 1: Data Flow Verification

> _"How does game network data flow from DevTools/XHR interception through `MessageDispatcher` down to UI cards across our newly modularized architecture?"_

- Map the end-to-end path: `xhrInterceptor.js` / DevTools → `MessageDispatcher` → `legacyBridge` / Services → Calculators → UI renderers.
- Are there any bypasses, direct DOM mutations in calculators, or hidden globals?

### Question 2: Coupling & Circular Dependency Analysis

> _"Are there any circular import paths or tight bidirectional couplings remaining in `src/js/`?"_

- Check for dependency cycles using `shortest_path` between `state.js`, `MetadataStore.js`, `StartupService.js`, and `legacyBridge.js`.
- Confirm that `src/js/calc/` remains 100% pure (zero imports from `src/js/ui/` or DOM).

### Question 3: LegacyBridge Structural Breakdown

> _"What is the exact composition of `legacyBridge.js`'s 831 lines, and how cleanly can it be split into domain route tables?"_

- Enumerate the distinct domain clusters inside `legacyBridge.js`:
  - Combat / GBG / Army
  - City Map / Production / Outposts
  - Social / Clan / Ignore
  - Great Buildings / Blueprints
- Assess whether extracting route tables into `src/js/protocol/routes/` carries any runtime risk.

### Question 4: Recent Extractions Parity & Stability

> _"Did the extraction of `indexUiBindings.js` and `renderBattlegroundsPanel.js` leave any orphaned references or dead bridges in `index.js` and `helper.js`?"_

- Inspect `helper.js` (210 lines) and `index.js` (566 lines) neighbors in the graph.
- Verify that every re-exported function has active callers and passes tests.

---

## 5. Phase 4: Critical Self-Reflection & Next Steps Evaluation

Before drawing conclusions, critically reflect:

- **Stability vs. Churn**: Does the working state of the extension (826 green tests) justify further aggressive refactoring of files under 600 lines? Or should the team enforce a strict "Targeted Surgical" boundary?
- **Risk Assessment**: What are the specific failure modes if `legacyBridge.js` is decomposed? How can the test suite guarantee zero dropped RPC messages?
- **TypeScript Roadmap**: Which calculation modules are best suited for the next batch of `.ts` ports without creating dual-maintenance debt?

---

## 6. Phase 5: Deliverable & Persistent Output

Save the completed investigation report to:
`graphify-out/foe-info/findings/2026-09-12-deep-architecture-exploration.md`

### Required Report Structure:

1. **Executive Summary**: Macro health of the codebase, key changes since last index.
2. **Graph Topology & Metrics**: Table of node/edge counts, top god nodes, community distribution.
3. **Answers to Core Architectural Questions (Q1–Q4)**: Detailed analysis with ASCII or compact Mermaid flowcharts ($\le 100$ columns).
4. **Critical Self-Reflection**: Assessment of architectural trade-offs and stability vs. debt.
5. **Actionable Recommendations**: Clear, prioritized guidance on "what next" for the team.

Update `docs/STATUS.md` with a summary of the exploration once complete.
