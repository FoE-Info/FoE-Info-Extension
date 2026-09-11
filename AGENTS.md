# FoE-Info Extension — Antigravity Workspace Guidelines & Agent Ecosystem

This document defines the workspace architecture, command runners, multi-graph knowledge engines, subagent delegation directories, runbook skills, and lifecycle safety hooks for **FoE-Info Extension** (`/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension`).

**Host & Session Start:** Read [docs/README.md](docs/README.md) (coordination hub), then [docs/STATUS.md](docs/STATUS.md) (live work/todos) and [docs/HANDOFF.md](docs/HANDOFF.md) (verified state) before acting. For Antigravity-specific tool names or hook instructions read [docs/OPENCODE.md](docs/OPENCODE.md). `.agents/` remains canonical; `.opencode/` supplies the host-specific registration. Read applicable rule files explicitly. Workspace identity lives in `.agents/project.json` (`name`, `displayName`, `primaryGraph`); `package.json` mirrors these fields for npm/build tooling.

---

## 1. Workspace Overview & Directives

- **Strictly Agentic Environment**: Never generate IDE configs (`.vscode/`, `.idea/`, `launch.json`). Task execution relies exclusively on `package.json` runners and Antigravity tooling.
- **Antigravity Version Context**: Electron Antigravity 2.0+ started the agentic work; Antigravity CLI did the most recent work (grant rebuilds, MCP portability); Antigravity-IDE base is barely used. OpenCode continues when Antigravity runs out — see `antigravity-interop` skill for handoff protocol.
- **FoE Expert Caveat**: Many FoE custom expert/subagent claims were AI-inferred by Antigravity from inspecting the codebase (which was broken at the time) + live network/RPCs. Some claims may be inaccurate (GB calculations was wrong). Treat expert claims as hypotheses — always verify against source code.
- **Git Boundaries & Worktrees**: Worktrees reside in `.worktrees/<branch>`. Core configurations (`.agents/`, `AGENTS.md`) are tracked in Git, ensuring new worktrees instantly inherit all 31 subagents, 16 rules, and 52 skills (52 on-demand runbooks and procedures).
- **Artifact Boundaries**: Never pass `ArtifactMetadata` when modifying repository files. It is reserved exclusively for `<appDataDir>/brain/<conversation-id>/` artifacts.

```text
FoE-Info-Extension/
├── .agents/                 # Antigravity root: 31 subagents, 16 rules, 52 skills, hooks, MCP
├── graphify-out/            # Knowledge graphs (git-ignored: foe-info/, metadata/, foe-info-original/)
├── metadata-store/          # Offline InnoGames entity databases and RPC captures (read-only)
├── src/
│   ├── chrome/              # MV3 manifests, panel.html, options.html
│   ├── css/                 # Bootstrap 5.3 theme and component stylesheets
│   ├── i18n/                # 7-language localization dictionaries (de, el, en, es, fr, gr, it)
│   ├── js/                  # Modular architecture (<= 600 lines/file)
│   │   ├── calc/            # Pure calculation engines (boosts, prod, goods, units)
│   │   ├── msg/             # Decoupled InnoGames JSON-RPC service handlers
│   │   ├── protocol/        # Network routing, message dispatching, packet interception
│   │   ├── state/           # In-memory reactive state & MetadataStore
│   │   ├── ui/              # DOM rendering, cards, popover components
│   │   └── utils/           # Extension utilities (storage, copy, i18n)
└── tests/                   # Native Node.js test suites (node:test)
```

---

## 2. Command Execution & Verification Pipeline

Run all commands directly from the workspace root (`/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension`):

| Pipeline Stage         | Command                                             | Purpose / Verification Standard                                                   |
| :--------------------- | :-------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Verification Gate**  | `npm run verify`                                    | Full 5-stage gate: formatting, linting, i18n completeness, unit tests, dev build. |
| **Unit Testing**       | `npm test` / `npm run test:watch`                   | Run fast Node.js tests (`tests/**/*.test.mjs`, including hook suite).             |
| **Formatting & Lint**  | `npm run format` / `npm run check` / `npm run lint` | Prettier write/check; ESLint runs through `lint`.                                 |
| **i18n Parity**        | `npm run i18n:check` / `npm run i18n:fix`           | Check/fix key parity across all 7 language dictionaries.                          |
| **Builds & Watch**     | `npm run build:dev` / `npm run dev`                 | Webpack development bundle, watch mode, or production bundle.                     |
| **CDP Runtime**        | `foe-browser` (`--restart`)                         | Launch isolated Chromium (port 9222) / monitor panel exceptions.                  |
| **Metadata Ingestion** | `npm run metadata:download` / `:query`              | Ingest live entity datasets / query offline database.                             |
| **Graphify FoE-Info**  | `npm run graph:foe-info:ast` / `:update`            | Fast AST refresh / update & export / full reindex via `llama-swap`.               |
| **Graphify Metadata**  | `npm run graph:metadata:update`                     | Rebuild offline entity graph, cluster, label, and export.                         |
| **Graphify Hammer**    | `npm run graph:forge-hammer:update`                 | Refresh competitor extension architecture graph.                                  |

---

## 3. Multi-Graph Knowledge Infrastructure (Graphify)

Consult knowledge graphs before wide disk searches:

1. **`graphify-foe-info`** (`graphify-out/foe-info/graph.json`): FoE-Info AST, call graphs, module dependencies.
2. **`graphify-foe-info-original`** (`graphify-out/foe-info-original/graph.json`): Original pre-agentic v1 baseline AST (commit `8c681d1`).
3. **`graphify-metadata-store`** (`graphify-out/metadata/graph.json`): 5,400+ game entities, building definitions, GBs, Allies.
4. **`graphify-forge-hammer`** (`../forge-hammer/graphify-out/graph.json`): Competitor browser extension architecture graph (optional sibling repo clone).

> Delegate deep cognitive mapping to [`graph-knowledge-explorer`](.agents/agents/graph-knowledge-explorer.md).

---

## 4. Codebase Quality Invariants (16 Core Rules)

All agents strictly adhere to these 16 rules (managed under `.agents/rules/` with core invariants on `always_on` and scoped workflows on `model_decision`):

1. [**Superpowers**](.agents/rules/superpowers.md): Mandatory skill consultation (`"Using [skill] to [purpose]"`) before modifying code.
2. [**Verification Before Completion**](.agents/rules/verification-before-completion.md): Strict mandate for fresh terminal verification evidence.
3. [**Small Incremental Changes**](.agents/rules/small-incremental-changes.md): Work in slices $\le 100$ lines, surgical blast radius, stop-the-line on failure.
4. [**Subagent Delegation**](.agents/rules/subagent-delegation.md): Delegate to specialist if role fits; main agent executes when no role fits.
5. [**Knowledge Graph Integration**](.agents/rules/graphify.md): Query graphs before wide grep; maintain AST freshness.
6. [**Modular Architecture**](.agents/rules/modular-architecture.md): Hard cap $\le 600$ lines/file, single responsibility, strict directory taxonomy.
7. [**Monolith Containment**](.agents/rules/monolith-containment.md): Zero inline logic additions to `index.js` or `StartupService.js`.
8. [**Dynamic Runtime Metadata**](.agents/rules/dynamic-runtime-metadata.md): Zero static entity JSON in `src/`; runtime is 100% dynamic network RPC.
9. [**BigNumber Precision**](.agents/rules/bignumber-precision.md): Mandatory `bignumber.js` with `BigNumber.ROUND_HALF_UP` for all Arc boost & FP math.
10. [**i18n Compliance**](.agents/rules/i18n-compliance.md): Mandatory `data-i18n` in HTML and `t('key')` in JS; zero hardcoded English.
11. [**Scope Control**](.agents/rules/scope-control.md): Modify only requested target files.
12. [**Security Permissions**](.agents/rules/security-permissions.md): No wildcard permissions (`*`); prevent duplicate MCP servers.
13. [**Browser Environment Hygiene**](.agents/rules/browser-environment-hygiene.md): Use `foe-browser` (port 9222); mandatory game reload (F5) on extension restart.
14. [**Workspace Structure**](.agents/rules/workspace-structure.md): Agent resources in `.agents/`; brain artifacts in `<appDataDir>/brain/`.
15. [**Unslop Commits**](.agents/rules/unslop-commit.md): Concise Conventional Commits $\le 72$ chars without AI marketing fluff.
16. [**Debuggability by Design**](.agents/rules/debuggability-by-design.md): All features, calculators, RPC services, network interceptors, storage routines, and UI renderers must implement debug-mode debuggability via `logger.js` (silent in standard mode, console diagnostics in debug mode; see [docs/debugging.md](docs/debugging.md)).

---

## 5. Subagent Delegation Directory (31 Specialists)

Canonical personas live in [`.agents/agents/`](.agents/agents/) (opencode-hosted via thin shims in `.opencode/agents/`). Delegate tasks matching specialist roles across 4 squads (main agent executes if no subagent fits):

- **Knowledge Graph & Architecture (3)**: [`graph-knowledge-explorer`](.agents/agents/graph-knowledge-explorer.md), [`forge-hammer-comparator`](.agents/agents/forge-hammer-comparator.md), [`codebase-modernization-architect`](.agents/agents/codebase-modernization-architect.md).
- **FoE Game Domain (15)**: [`foe-great-buildings-expert`](.agents/agents/foe-great-buildings-expert.md), [`foe-sniping-expert`](.agents/agents/foe-sniping-expert.md), [`foe-guild-battlegrounds-expert`](.agents/agents/foe-guild-battlegrounds-expert.md), [`foe-guild-expedition-expert`](.agents/agents/foe-guild-expedition-expert.md), [`foe-quantum-incursions-expert`](.agents/agents/foe-quantum-incursions-expert.md), [`foe-pvp-expert`](.agents/agents/foe-pvp-expert.md), [`foe-game-data-expert`](.agents/agents/foe-game-data-expert.md), [`foe-city-optimizer`](.agents/agents/foe-city-optimizer.md), [`foe-combat-boost-analyst`](.agents/agents/foe-combat-boost-analyst.md), [`foe-historical-allies-expert`](.agents/agents/foe-historical-allies-expert.md), [`foe-event-mechanics-expert`](.agents/agents/foe-event-mechanics-expert.md), [`foe-settlements-expert`](.agents/agents/foe-settlements-expert.md), [`foe-antiques-dealer-expert`](.agents/agents/foe-antiques-dealer-expert.md), [`monolith-refactoring-specialist`](.agents/agents/monolith-refactoring-specialist.md), [`discord-webhook-integrator`](.agents/agents/discord-webhook-integrator.md).
- **Extension Architecture & QA (9)**: [`chrome-extension-architect`](.agents/agents/chrome-extension-architect.md), [`extension-release-engineer`](.agents/agents/extension-release-engineer.md), [`cdp-test-engineer`](.agents/agents/cdp-test-engineer.md), [`extension-security-auditor`](.agents/agents/extension-security-auditor.md), [`code-reviewer`](.agents/agents/code-reviewer.md), [`adversarial-debater`](.agents/agents/adversarial-debater.md), [`performance-memory-profiler`](.agents/agents/performance-memory-profiler.md), [`accessibility-specialist`](.agents/agents/accessibility-specialist.md), [`localization-expert`](.agents/agents/localization-expert.md).
- **Web Engineering & UI (4)**: [`ui-design-system-architect`](.agents/agents/ui-design-system-architect.md), [`javascript-expert`](.agents/agents/javascript-expert.md), [`typescript-expert`](.agents/agents/typescript-expert.md), [`webpack-expert`](.agents/agents/webpack-expert.md).

---

## 6. Skills & Runbooks Taxonomy (52 Skills)

Discovered from [`.agents/skills/`](.agents/skills/) and `.agents/skills.json` (load on demand):

1. **FoE Domain (7)**: `add-rpc-service`, `add-feature-panel`, `ingest-game-metadata`, `graphify`, `ephemeral-llama-swap`, `api-testing-observability-api-mock`, `protocol-reverse-engineering`.
2. **Code Quality (13)**: `refactor-index-slice`, `service-extractor`, `codebase-modernization-planner`, `complexity-cuts`, `migrate-jquery-to-native`, `brooks-lint`, `test-driven-development`, `test-guard`, `systematic-debugging`, `verification-before-completion`, `unslop-commit`, `codebase-audit-pre-push`, `debate-review`.
3. **Browser Diagnostics (10)**: `browser-testing`, `audit-memory-leaks`, `chrome-devtools`, `cookie-debugging`, `chrome-devtools-troubleshooting`, `chrome-extensions`, `debug-optimize-lcp`, `fixing-motion-performance`, `modern-web-guidance`, `ui-ux-pro-max`.
4. **Localization & Release (8)**: `i18n-audit`, `a11y-debugging`, `supply-chain-risk-auditor`, `cross-platform-contract-propagation-audit`, `package-release`, `git-hooks-automation`, `changelog-automation`, `frontend-security-coder`.
5. **Multi-Agent Orchestration (14)**: `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `using-git-worktrees`, `finishing-a-development-branch`, `requesting-code-review`, `receiving-code-review`, `writing-skills`, `writing-agents`, `writing-rules`, `writing-hooks`, `github`, `antigravity-interop`.

---

## 7. Lifecycle Hooks (`.agents/hooks.json`)

- **`safety-gate` (`PreToolUse: run_command`)**: Runs `.agents/scripts/safety-gate.mjs` to intercept destructive commands.
- **`graphify-guard` (`PreToolUse: grep_search|find_by_name|call_mcp_tool|run_command`)**: Runs `.agents/scripts/graphify-guard.mjs` to check source searches and record Graphify activity stamps.
- **`monolith-guardrail` (`PreInvocation`)**: Runs `.agents/scripts/pre-invocation-reminder.mjs` to inject ephemeral guardrail reminders.
- **`graphify-sync` (`PostToolUse: replace_file_content|write_to_file`)**: Runs `.agents/scripts/post-tool-graphify-sync.mjs` to update AST.
- **`stop-guard` (`Stop`)**: Runs `.agents/scripts/stop-guard.mjs` to block premature exit during active background tasks.

---

## 8. Antigravity Architecture & Precedence

- **Precedence**: Workspace Root (`.agents/`, `AGENTS.md`) $\to$ Declared Configs (`skills.json`) $\to$ Global (`~/.gemini/config/`) $\to$ Built-in.
- **Progressive Disclosure**: Skills load on-demand; rules inject contextually or via `always_on`; subagents load only when invoked.
- **Dual-Harness MCP Registration**: The Antigravity CLI reads the workspace `.agents/mcp_config.json` to discover all 5 servers (chrome-devtools, graphify-foe-info, graphify-forge-hammer, graphify-metadata-store, graphify-foe-info-original); opencode reads its own `opencode.json` `mcp` block. Both use native `env` injection and relative graph paths for portability — no absolute `/var/home/kronikpillow/...` paths. Antigravity permission grants must use the `mcp(server/tool)` wrapper form — bare `server/tool` strings are rejected as "invalid grant string" by the CLI's `permission_grant_store`. Global grants live in `~/.gemini/config/config.json` (`userSettings.globalPermissionGrants.allow`); project-scoped grants in `~/.gemini/config/projects/<id>.json`.
- **Documentation**: [Antigravity Docs](https://antigravity.google/docs) | [Skills](https://antigravity.google/docs/skills) | [Rules](https://antigravity.google/docs/rules-workflows) | [Hooks](https://antigravity.google/docs/hooks) | [MCP](https://antigravity.google/docs/mcp).
