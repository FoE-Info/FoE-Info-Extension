---
trigger: always_on
description: Proactively delegate domain, UI, QA, and review tasks to the 31 specialized subagents via invoke_subagent.
---

# Rule: Proactive Subagent Delegation

The FoE-Info workspace maintains a roster of 31 specialized domain subagents (`.agents/agents/*.md`). The primary agent must act as an orchestrator and tech lead, proactively delegating tasks matching their domain expertise via `invoke_subagent` rather than executing everything in a single thread.

---

## 1. Domain Delegation Directory

1. **FoE Game Mechanics & Data**:
   - City production, tile density, layout $\to$ `foe-city-optimizer`
   - Great Buildings, 1.9x Arc boosts, locking math $\to$ `foe-great-buildings-expert`
   - Combat boosts, army stats, counter units $\to$ `foe-combat-boost-analyst`
   - InnoGames RPC parsing, dynamic envelopes, protocol math $\to$ `foe-game-data-expert`
   - Seasonal events, passes, minigames $\to$ `foe-event-mechanics-expert`
   - Historical Allies, rooms, rarities $\to$ `foe-historical-allies-expert`
   - Cultural settlements $\to$ `foe-settlements-expert`
   - Guild Battlegrounds (GBG) attrition, sectors, QI $\to$ `foe-guild-warfare-expert`
   - Antiques Dealer inventory, appraisal $\to$ `foe-antiques-dealer-expert`
   - Monolith decomposition (`index.js`, `StartupService.js`) $\to$ `monolith-refactoring-specialist`
   - Discord webhooks, snipe alerts $\to$ `discord-webhook-integrator`

2. **Extension Architecture, Security & QA**:
   - Manifest V3, CSP, background lifecycles $\to$ `chrome-extension-architect`
   - WebStore packaging, manifest sync, release gates $\to$ `extension-release-engineer`
   - Live CDP testing on port 9222 $\to$ `cdp-test-engineer`
   - Panel runtime exceptions, DevTools inspection $\to$ `extension-qa-auditor`
   - DOM XSS, permission minimization $\to$ `extension-security-auditor`
   - Startup latency, LCP, panel rendering $\to$ `cwv-performance-engineer`
   - Pre-commit invariant audits (<100 lines, BigNumber) $\to$ `code-reviewer`
   - Multi-locale translations in `src/i18n/` $\to$ `i18n-localization-expert`
   - WCAG 2.2 AA, ARIA live regions $\to$ `a11y-accessibility-specialist`

3. **Web Engineering & UI**:
   - Bootstrap 5.3, compact DevTools docking $\to$ `bootstrap-expert`
   - Design tokens, container queries, native `<dialog>` $\to$ `ui-design-system-architect`
   - Modern CSS Grid/Flexbox layouts $\to$ `css-expert`
   - Semantic HTML and accessibility $\to$ `html-expert`
   - Modernizing legacy jQuery $\to$ `jquery-expert`
   - Webpack 5 bundling, chunking $\to$ `webpack-expert`
   - Memory leaks, detached DOM nodes $\to$ `performance-memory-profiler`
   - WebSocket streaming $\to$ `websocket-expert`
   - Node 20+ runtime, scripts $\to$ `nodejs-expert`
   - Modern ECMAScript $\to$ `javascript-expert`

4. **Knowledge Graphs**:
   - Multi-graph traversal, probing, findings dossiers $\to$ `graph-knowledge-explorer`

---

## 2. Delegation Invariants

- **When to Delegate**: Whenever a task requires domain-specific analysis, multi-file investigation, deep UI redesign, browser testing, or pre-commit verification.
- **Parallel Feature Development**: When executing 2+ independent coding tasks simultaneously, always dispatch subagents with `Workspace: "share"` so each agent operates in an isolated git worktree under `.worktrees/` without dirty-state collisions.
- **When to Execute Directly**: Running routine terminal commands (`npm test`, git status), quick file inspections, or executing minor single-line adjustments during a focused slice.
