---
trigger: always_on
description: Proactively delegate domain, UI, QA, and review tasks to the 36 specialized subagents via invoke_subagent.
---

# Rule: Proactive Subagent Delegation

The workspace maintains a roster of 36 specialized domain subagents across 4 squads (FoE Game Domain, Extension Architecture/QA, Web Engineering, and Knowledge Graphs) registered under `.agents/agents/` and discoverable via `<subagents>`. The primary agent acts as orchestrator and tech lead, proactively delegating tasks matching domain expertise via `invoke_subagent` rather than executing everything in a single thread.

---

## 1. Squad Domains

- **FoE Game Mechanics & Data (15)**: Math, calculations, game data, and combat analysts.
- **Extension Architecture, Security & QA (9)**: CDP testing, security audits, code reviews, and releases.
- **Web Engineering & UI (4)**: Bootstrap 5.3 layouts, TypeScript, JavaScript, and Webpack.
- **Knowledge Graphs & Architecture (8)**: Graphify navigation, refactoring, and peer comparisons.

_(See `<subagents>` catalog for individual agent names, roles, and full prompt descriptions)._

---

## 2. Delegation & Execution Protocol

### A. Role Match Check (Delegation First)

Before executing code modifications or deep investigations, check whether the task fits any of the 36 specialized subagents. Use the decision table below to route tasks:

| If the task involves... | Dispatch subagent |
| :--- | :--- |
| AST traversal, call graphs, module dependencies, or graph comparison | `graph-knowledge-explorer` |
| Forge-Hammer comparison (architecture, features, parity) | `forge-hammer-comparator` or `forge-hammer-kg-explorer` |
| LoW-Tool comparison (closed-source benchmark) | `low-tool-comparator` or `low-tool-kg-explorer` |
| v1 baseline comparison (pre-agentic diff) | `foe-info-original-comparator` or `foe-info-original-kg-explorer` |
| Great Buildings math, Arc rewards, spot locks, leveling curves | `foe-great-buildings-expert` |
| Guild Battlegrounds (attrition, sectors, lock timers, costs) | `foe-guild-battlegrounds-expert` |
| Guild Expeditions (trials, negotiation, relics, fortification) | `foe-guild-expedition-expert` |
| Quantum Incursions (settlement economics, shards, node pathing) | `foe-quantum-incursions-expert` |
| PvP Arena / neighborhood warfare (matchmaking, plundering) | `foe-pvp-expert` |
| Historical Allies (room assignments, rarity, compatibility, boosts) | `foe-historical-allies-expert` |
| Cultural settlements (Vikings, Japan, Egypt, Aztecs, Mughals, Polynesia, Pirates) | `foe-settlements-expert` |
| Seasonal events (minigame solvers, event passes, currency econ) | `foe-event-mechanics-expert` |
| Combat boosts across GBG/GE/QI/PvP/army units | `foe-combat-boost-analyst` |
| City layout optimization (production density, road reduction) | `foe-city-optimizer` |
| Antiques Dealer (inventory, auctions, gem/coin appraisals) | `foe-antiques-dealer-expert` |
| InnoGames JSON-RPC parsing, metadata ingestion, game calculations | `foe-game-data-expert` |
| Sniping (GB investment scans, spot locking, profit margins, alerts) | `foe-sniping-expert` |
| MV3 manifest, DevTools panel iframe, CSP, cross-context messaging | `chrome-extension-architect` |
| CDP test pipelines, mock RPC, DOM assertions, live panel exceptions | `cdp-test-engineer` |
| Code review (monolith containment, BigNumber, MV3 CSP, modular rules) | `code-reviewer` |
| Monolith decomposition (index.js, StartupService.js to isolated modules) | `monolith-refactoring-specialist` |
| Full legacy decomposition + gradual TypeScript migration planning | `codebase-modernization-architect` |
| Webpack 5 multi-target configs, asset modules, bundle splitting, MV3 packaging | `webpack-expert` |
| TypeScript type design, strict RPC contracts, Web API typing, hybrid migration | `typescript-expert` |
| Bootstrap 5.3 layouts, SCSS themes, responsive DevTools docking, semantic HTML | `ui-design-system-architect` |
| Modern ECMAScript, async pipelines, test runners, clean architecture simplification | `javascript-expert` |
| WCAG 2.2 AA, ARIA live regions for game RPC events, keyboard navigation | `accessibility-specialist` |
| Performance & memory (panel latency, Core Web Vitals, heap snapshots, DOM leaks) | `performance-memory-profiler` |
| Discord webhook rate limits, embed layouts, snipe notifications | `discord-webhook-integrator` |
| Release engineering (Chrome Web Store packaging, MV3 manifest sync, changelogs) | `extension-release-engineer` |
| Manifest V3 security (DOM XSS prevention, credential leak protection, host permissions) | `extension-security-auditor` |
| Localization (7-language dictionaries, translation bindings) | `localization-expert` |
| Adversarial review (challenge designs, plans, PR diffs, code reviews) | `adversarial-debater` |

_(See `<subagents>` catalog for full prompt descriptions.)_

- **If a subagent role fits**: The main agent must act as Tech Lead / Orchestrator and delegate the execution slice to that specialist via `invoke_subagent`.
- **Runtime Resolution in Antigravity**: If the specialist is not pre-registered as an active type in `<subagents>`, either:
  1. Define it dynamically via `define_subagent` using the frontmatter and prompt from `.agents/agents/<name>.md`.
  2. Or invoke `self` with `Role: "<name>"` and the specialist's system prompt instructions.

### B. When the Main Agent Executes Directly

The main agent is explicitly permitted and expected to execute tasks directly when:

1. **No Subagent Fits**: The task falls outside the defined roles of the 36 specialists.
2. **Workspace & Agent Meta-Engineering**: Maintaining `.agents/` configurations, `AGENTS.md`, rules, skills, lifecycle hooks, and project documentation.
3. **Cross-Squad Orchestration & Synthesis**: Multi-domain coordination where separating into single-domain subagents would cause thrashing or architectural fragmentation.
4. **Pipeline & Gate Verification**: Running routine terminal verification commands (`npm test`, `npm run verify`, `git diff`, `git status`) and synthesizing reports for the user.
5. **Parallel Feature Development**: When executing 2+ independent coding tasks simultaneously, always dispatch subagents with `Workspace: "share"` so each agent operates in an isolated git worktree under `.worktrees/` without dirty-state collisions.
