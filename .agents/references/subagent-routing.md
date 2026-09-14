# Subagent Routing Table

Which of the 36 specialists to dispatch for a given task. Loaded on demand; the
always-on `subagent-delegation` rule keeps only the protocol.

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

Squad membership: FoE Game Mechanics & Data (15), Extension Architecture, Security & QA (9), Web Engineering & UI (4), Knowledge Graphs & Architecture (8).
