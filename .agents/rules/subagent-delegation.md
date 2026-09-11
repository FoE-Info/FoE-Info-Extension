---
trigger: always_on
description: Proactively delegate domain, UI, QA, and review tasks to the 36 specialized subagents via invoke_subagent.
---

# Rule: Proactive Subagent Delegation

The workspace maintains a roster of 36 specialized domain subagents (`.agents/agents/*.md`). The primary agent must act as an orchestrator and tech lead, proactively delegating tasks matching their domain expertise via `invoke_subagent` rather than executing everything in a single thread.

---

## 1. Domain Delegation Directory

1. **FoE Game Mechanics & Data (15)**:
   - City production, tile density, layout $\to$ `foe-city-optimizer`
   - Great Buildings, 1.9x Arc boosts, leveling math $\to$ `foe-great-buildings-expert`
   - Great Building spot locking, sniping margins $\to$ `foe-sniping-expert`
   - Guild Battlegrounds (GBG) attrition, sectors, races $\to$ `foe-guild-battlegrounds-expert`
   - Guild Expedition (GE 1-5) trials, relics, negotiations $\to$ `foe-guild-expedition-expert`
   - Quantum Incursions (QI) settlement, nodes, actions $\to$ `foe-quantum-incursions-expert`
   - PvP Arena, defense towers, neighborhood attacks $\to$ `foe-pvp-expert`
   - Combat boosts, army stats, counter units $\to$ `foe-combat-boost-analyst`
   - InnoGames RPC parsing, dynamic envelopes, protocol math $\to$ `foe-game-data-expert`
   - Seasonal events, passes, minigames $\to$ `foe-event-mechanics-expert`
   - Historical Allies, rooms, rarities $\to$ `foe-historical-allies-expert`
   - Cultural settlements $\to$ `foe-settlements-expert`
   - Antiques Dealer inventory, appraisal $\to$ `foe-antiques-dealer-expert`
   - Monolith decomposition $\to$ `monolith-refactoring-specialist`
   - Discord webhooks, snipe alerts $\to$ `discord-webhook-integrator`

2. **Extension Architecture, Security & QA (9)**:
   - Manifest V3, CSP, background lifecycles $\to$ `chrome-extension-architect`
   - WebStore packaging, manifest sync, release gates $\to$ `extension-release-engineer`
   - Live CDP testing on port 9222 & panel QA $\to$ `cdp-test-engineer`
   - DOM XSS, permission minimization $\to$ `extension-security-auditor`
   - Pre-commit invariant audits (<100 lines, BigNumber) $\to$ `code-reviewer`
   - Adversarial plan/code challenge $\to$ `adversarial-debater`
   - Startup latency, LCP, heap snapshots, memory leaks $\to$ `performance-memory-profiler`
   - Multi-locale translations $\to$ `localization-expert`
   - WCAG 2.2 AA, ARIA live regions $\to$ `accessibility-specialist`

3. **Web Engineering & UI (4)**:
   - Bootstrap 5.3, SCSS themes, container queries, dialogs $\to$ `ui-design-system-architect`
   - Modern ECMAScript, async pipelines, Node 24+ tests, code simplification $\to$ `javascript-expert`
   - Type systems, strict RPC contracts, hybrid migration $\to$ `typescript-expert`
   - Webpack bundling, chunking $\to$ `webpack-expert`

4. **Knowledge Graphs & Architecture (8)**:
   - Host AST & game metadata traversal, probing, findings dossiers $\to$ `graph-knowledge-explorer`
   - Peer comparative benchmarking against Forge-Hammer $\to$ `forge-hammer-comparator`
   - Peer comparative benchmarking against LoW-Tool $\to$ `low-tool-comparator`
   - Pre-agentic v1 baseline benchmarking $\to$ `foe-info-original-comparator`
   - Standalone Forge-Hammer extension explorer $\to$ `forge-hammer-kg-explorer`
   - Standalone LoW-Tool original explorer $\to$ `low-tool-kg-explorer`
   - Standalone FoE-Info v1 baseline explorer $\to$ `foe-info-original-kg-explorer`
   - Full codebase modernization & TypeScript roadmaps $\to$ `codebase-modernization-architect`

---

## 2. Delegation & Execution Protocol

### A. Role Match Check (Delegation First)
- Before executing code modifications or deep investigations, check whether the task fits any of the 36 specialized subagents in the directory above (e.g. Bootstrap UI, Great Buildings math, RPC network handlers, CDP browser testing).
- **If a subagent role fits**: The main agent must act as Tech Lead / Orchestrator and delegate the execution slice to that specialist via `invoke_subagent`.

### B. When the Main Agent Executes Directly
The main agent is explicitly permitted and expected to execute tasks directly when:
1. **No Subagent Fits**: The task, script, or investigation falls outside the defined roles of the 36 specialists.
2. **Workspace & Agent Meta-Engineering**: Maintaining `.agents/` configurations, `AGENTS.md`, rules, skills, lifecycle hooks, and project documentation.
3. **Cross-Squad Orchestration & Synthesis**: Multi-domain coordination where separating into single-domain subagents would cause thrashing or architectural fragmentation.
4. **Pipeline & Gate Verification**: Running routine terminal verification commands (`npm test`, `npm run verify`, `git diff`, `git status`) and synthesizing reports for the user.
5. **Parallel Feature Development**: When executing 2+ independent coding tasks simultaneously, always dispatch subagents with `Workspace: "share"` so each agent operates in an isolated git worktree under `.worktrees/` without dirty-state collisions.
