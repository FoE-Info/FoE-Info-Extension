---
name: deprecate-gvg-to-qi
description: Retire legacy GVG code, decouple state, and transition panels to Quantum Incursions.
---

# Workflow: Deprecate Legacy GVG to Quantum Incursions (QI)

Use this skill to safely decommission legacy Guild vs Guild (GVG) code (retired by InnoGames in 2024) and transition state and UI structures to Quantum Incursions (QI).

---

## Phase 1: Dependency & Usage Mapping
1. Query knowledge graph to trace all GVG consumers:
   ```bash
   graphify query "Where is ClanBattleService or collapseGVG used?"
   ```
2. Identify all related legacy files:
   - `src/js/msg/ClanBattleService.js`
   - GVG state variables in `src/js/fn/collapse.js` (`collapseGVG`, `collapseGVGinfo`, etc.)
   - GVG styles in `src/css/gvg.scss`
   - GVG dispatch handlers in `src/js/index.js`

---

## Phase 2: Decouple Shared State
1. Audit whether any non-GVG features depend on `ClanBattleService` helper methods.
2. If pure utility functions exist, extract them to `src/js/fn/helper.js` or `src/js/fn/math.js`.
3. Verify test suite passes cleanly:
   ```bash
   npm test
   ```

---

## Phase 3: Excise Legacy Handlers & SCSS
1. Remove `ClanBattleService` from message dispatcher in `src/js/index.js`.
2. Delete or archive `src/js/msg/ClanBattleService.js`.
3. Remove obsolete GVG collapse definitions from `src/js/fn/collapse.js`.
4. Remove GVG SCSS imports from `src/css/main.scss`.

---

## Phase 4: Scaffold Quantum Incursions (QI)
1. Create `src/js/msg/QuantumIncursionService.js` following the `add-rpc-service` skill.
2. Connect QI nodes, shard economy, and settlement progression with `MetadataStore.js`.
3. Add QI UI section following the `add-feature-panel` skill.
4. Validate with `npm test` and build dev bundles.
