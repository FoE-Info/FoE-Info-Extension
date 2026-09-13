# Subagent Delegation Directory (36 Specialists)

Canonical personas: `.agents/agents/` (OpenCode shims: `.opencode/agents/`). Consult `<subagents>` catalog for full prompt descriptions.

## Squad Map

### Knowledge Graph & Architecture (8)

| Agent                              | Domain                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| `graph-knowledge-explorer`         | Graphify AST traversal, call graphs, module dependencies |
| `forge-hammer-comparator`          | Forge-Hammer architecture/features parity                |
| `forge-hammer-kg-explorer`         | Forge-Hammer knowledge graph exploration                 |
| `low-tool-comparator`              | LoW-Tool closed-source benchmark comparison              |
| `low-tool-kg-explorer`             | LoW-Tool knowledge graph exploration                     |
| `foe-info-original-comparator`     | v1 baseline (pre-agentic) comparison                     |
| `foe-info-original-kg-explorer`    | v1 baseline knowledge graph exploration                  |
| `codebase-modernization-architect` | Legacy decomposition + gradual TS migration planning     |

### FoE Game Domain (15)

| Agent                            | Domain                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `foe-great-buildings-expert`     | GB math, Arc rewards, spot locks, leveling curves                                 |
| `foe-guild-battlegrounds-expert` | GBG attrition, sectors, lock timers, costs                                        |
| `foe-guild-expedition-expert`    | GE trials, negotiation, relics, fortification                                     |
| `foe-quantum-incursions-expert`  | QI settlement economics, shards, node pathing                                     |
| `foe-pvp-expert`                 | PvP Arena/neighborhood warfare, matchmaking, plundering                           |
| `foe-historical-allies-expert`   | Allies room assignments, rarity, compatibility, boosts                            |
| `foe-settlements-expert`         | Cultural settlements (Vikings, Japan, Egypt, Aztecs, Mughals, Polynesia, Pirates) |
| `foe-event-mechanics-expert`     | Seasonal events, minigame solvers, event passes, currency econ                    |
| `foe-combat-boost-analyst`       | Combat boosts across GBG/GE/QI/PvP/army units                                     |
| `foe-city-optimizer`             | City layout optimization (production density, road reduction)                     |
| `foe-antiques-dealer-expert`     | Antiques Dealer inventory, auctions, gem/coin appraisals                          |
| `foe-game-data-expert`           | InnoGames JSON-RPC parsing, metadata ingestion, game calculations                 |
| `foe-sniping-expert`             | GB investment scans, spot locking, profit margins, alerts                         |
| `foe-battle-simulator`           | Battle simulation, army composition, attrition modeling                           |
| `foe-trade-economist`            | Marketplace trade offers, era fair-trade valuation                                |

### Extension Architecture & QA (9)

| Agent                             | Domain                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| `chrome-extension-architect`      | MV3 manifest, DevTools panel iframe, CSP, cross-context messaging   |
| `cdp-test-engineer`               | CDP test pipelines, mock RPC, DOM assertions, live panel exceptions |
| `code-reviewer`                   | Monolith containment, BigNumber, MV3 CSP, modular rules             |
| `monolith-refactoring-specialist` | index.js/StartupService.js → isolated modules                       |
| `extension-security-auditor`      | MV3 security (DOM XSS, credential leaks, host permissions)          |
| `performance-memory-profiler`     | Panel latency, Core Web Vitals, heap snapshots, DOM leaks           |
| `discord-webhook-integrator`      | Discord webhook rate limits, embed layouts, snipe notifications     |
| `extension-release-engineer`      | Chrome Web Store packaging, MV3 manifest sync, changelogs           |
| `accessibility-specialist`        | WCAG 2.2 AA, ARIA live regions for RPC events, keyboard navigation  |

### Web Engineering & UI (4)

| Agent                        | Domain                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `webpack-expert`             | Webpack 5 multi-target, asset modules, bundle splitting, MV3 packaging         |
| `typescript-expert`          | TS type design, strict RPC contracts, Web API typing, hybrid migration         |
| `ui-design-system-architect` | Bootstrap 5.3 layouts, SCSS themes, responsive DevTools docking, semantic HTML |
| `javascript-expert`          | Modern ECMAScript, async pipelines, test runners, clean architecture           |

## Delegation Protocol

**Before executing code modifications or deep investigations:**

1. Check if task fits a specialized subagent (table above)
2. If yes → delegate via `invoke_subagent` (main agent = Tech Lead/Orchestrator)
3. If no → main agent executes directly

**Main agent executes directly when:**

- No subagent fits the task
- Workspace/agent meta-engineering (`.agents/`, AGENTS.md, rules, skills, hooks)
- Cross-squad orchestration & synthesis
- Pipeline & gate verification (`npm test`, `npm run verify`, `git diff`)
- Parallel feature development (dispatch subagents with `Workspace: "share"`)

## Decision Table

See `.agents/rules/subagent-delegation.md` for the full task→subagent routing table.
