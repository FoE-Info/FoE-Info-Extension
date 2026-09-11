# FoE-Info Extension — Antigravity Workspace Guidelines & Agent Ecosystem

This document defines the workspace architecture, command runners, multi-graph knowledge engines, subagent delegation directories, runbook skills, and lifecycle safety hooks for **FoE-Info Extension** (`/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension`).

---

## 1. Workspace Overview & Directives

- **Strictly Agentic Environment**: Never generate or restore IDE-specific configurations (`.vscode/`, `.idea/`, `launch.json`, `tasks.json`). Task execution relies exclusively on `package.json` runners and Antigravity tooling.
- **Git Boundaries & Worktrees**: Isolated worktrees reside in `.worktrees/<branch>`. Core configurations (`.agents/`, `AGENTS.md`) are tracked in Git, ensuring new worktrees instantly inherit all 31 subagents, 12 rules, and 45 skills (45 on-demand runbooks and procedures).
- **Artifact Boundaries**: Never pass `ArtifactMetadata` when modifying repository files. It is reserved exclusively for `<appDataDir>/brain/<conversation-id>/` artifacts.

```text
FoE-Info-Extension/
├── .agents/                 # Antigravity agent customization root
│   ├── agents/              # 31 specialized subagents (*.md)
│   ├── rules/               # 12 contextual and always-on rules (*.md)
│   ├── skills/              # 45 on-demand runbooks and procedures
│   ├── scripts/             # Hook executors, CDP inspectors, graph syncers
│   ├── hooks.json           # Lifecycle hooks (PreToolUse, PreInvocation, PostToolUse, Stop)
│   └── mcp_config.json      # Stdio MCP servers (DevTools, Graphify engines)
├── graphify-out/            # Knowledge graphs (git-ignored: foe-info/, metadata/, foe-info-original/)
├── metadata-store/          # Offline InnoGames raw entity databases and RPC captures
├── src/
│   ├── chrome/              # HTML panels, manifests, extension entry points
│   │   ├── manifest.json    # Chrome Extension Manifest V3 configuration
│   │   ├── panel.html       # Primary DevTools extension panel
│   │   └── options.html     # User preferences and webhook settings
│   ├── i18n/                # 7-language localization dictionaries (de, el, en, es, fr, gr, it)
│   ├── js/
│   │   ├── fn/              # Pure calculation helpers, i18n bindings, city calculators
│   │   ├── msg/             # Decoupled InnoGames JSON-RPC service handlers
│   │   ├── content-bridge.js# Cross-context messaging between page and extension
│   │   ├── devtools.js      # Chrome DevTools panel lifecycle manager
│   │   ├── index.js         # Orchestrator and legacy bootstrap
│   │   └── xhr-interceptor.js # Page-level XHR/WebSocket packet interceptor
│   └── css/                 # Bootstrap 5.3 theme and component stylesheets
├── tests/                   # Fast Node.js native unit tests (node:test)
│   ├── agents/              # Lifecycle hooks regression test suite
│   ├── fn/                  # Unit tests for calculation engines
│   ├── fixtures/            # Static RPC fixtures for isolated tests
│   └── msg/                 # Service handler unit tests
└── webpack.*.js             # Webpack 5 production and development configurations
```

---

## 2. Command Execution & Verification Pipeline

Run all commands directly from the workspace root (`/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension`):

| Pipeline Stage                | Command                                                | Purpose / Verification Standard                                          |
| :---------------------------- | :----------------------------------------------------- | :----------------------------------------------------------------------- |
| **Verification Gate**         | `npm run verify`                                       | Full 4-stage gate: formatting, i18n completeness, unit tests, dev build. |
| **Unit Testing**              | `npm test` / `npm run test:watch`                      | Run fast Node.js tests (`tests/**/*.test.mjs`, including hook suite).    |
| **Code Formatting & Linting** | `npm run format` / `npm run check` / `npm run lint`    | Prettier check/write & ESLint static analysis.                           |
| **i18n Parity**               | `npm run i18n:check` / `npm run i18n:fix`              | Check/fix key parity across all 7 language dictionaries.                 |
| **Builds & Watch**            | `npm run build:dev` / `npm run dev` / `npm run build`  | Webpack development bundle, watch mode, or production bundle.            |
| **Browser Runtime & CDP**     | `foe-browser` (`--restart`) / `npm run inspect:panel`  | Launch isolated Chromium (port 9222) / monitor panel exceptions.         |
| **Metadata Ingestion**        | `npm run metadata:download` / `npm run metadata:query` | Ingest live entity datasets / query offline database.                    |
| **Graphify FoE-Info**         | `npm run graph:foe-info:ast` / `:update` / `:reindex`  | Fast AST refresh / update & export / full reindex via `llama-swap`.      |
| **Graphify Metadata**         | `npm run graph:metadata:update` / `:reindex`           | Rebuild offline entity graph, cluster, label, and export.                |
| **Graphify Forge-Hammer**     | `npm run graph:forge-hammer:update` / `:reindex`       | Refresh or reindex competitor extension architecture graph.              |

---

## 3. Multi-Graph Knowledge Infrastructure (Graphify)

Four distinct knowledge graphs provide instant structural intelligence without raw grepping:

1. **`graphify-foe-info`** (`graphify-out/foe-info/graph.json`):
   - FoE-Info Extension AST, function call graphs, module dependencies, and IPC routing.
2. **`graphify-foe-info-original`** (`graphify-out/foe-info-original/graph.json`):
   - FoE-Info original pre-agentic v1 baseline AST (commit `8c681d1`, 403 nodes, 690 edges).
3. **`graphify-metadata-store`** (`graphify-out/metadata/graph.json`):
   - 5,400+ game entities, building definitions, era progression, Great Buildings, and Historical Allies.
4. **`graphify-forge-hammer`** (`/var/home/kronikpillow/Projects/Forge-Hammer/forge-hammer/graphify-out/graph.json`):
   - Competitor browser extension architecture for compatibility diagnostics and feature benchmarking.

> **Query-First Protocol**: Consult knowledge graphs (`query_graph`, `god_nodes`) before wide disk searches. Delegate deep mapping to [`graph-knowledge-explorer`](.agents/agents/graph-knowledge-explorer.md).

---

## 4. Codebase Quality Invariants

All agents must strictly adhere to these 12 core workspace rules (managed under `.agents/rules/` as `always_on` rules):

1. [**Small Incremental Changes**](.agents/rules/small-incremental-changes.md) (`always_on`): Keep modifications under ~100 lines per slice. Stop-the-line immediately on build/test failures.
2. [**Monolith Containment**](.agents/rules/monolith-containment.md) (`always_on`): Never add new inline logic to `src/js/index.js` or `StartupService.js`. Extract pure logic to `src/js/fn/` and RPC handlers to `src/js/msg/`.
3. [**BigNumber Precision**](.agents/rules/bignumber-precision.md) (`always_on`): Mandatory `bignumber.js` for all Great Building investments, Arc boosts (ceiling rounding `BigNumber.ROUND_CEIL`), and Forge Point arithmetic.
4. [**i18n Compliance**](.agents/rules/i18n-compliance.md) (`always_on`): Mandatory `data-i18n` attributes in HTML and `t('key')` / `$.i18n()` in JS. Zero hardcoded English strings.
5. [**Browser Environment Hygiene**](.agents/rules/browser-environment-hygiene.md) (`always_on`): Never launch Chromium from dirty terminal subshells; use `foe-browser` to scrub environment variables. Test via CDP on port 9222.
6. [**Security & Tool Permissions**](.agents/rules/security-permissions.md) (`always_on`): No wildcard permissions (`*`). Prevent duplicate MCP servers. Use approved isolated wrappers.
7. [**Scope Control**](.agents/rules/scope-control.md) (`always_on`): Modify only requested target files. Do not alter third-party tool configurations.
8. [**Workspace & Repository Structure**](.agents/rules/workspace-structure.md) (`always_on`): Agent resources live in `.agents/`. Brain artifacts stay in `<appDataDir>/brain/<conversation-id>/`.
9. [**Knowledge Graph Integration**](.agents/rules/graphify.md) (`always_on`): Maintain AST freshness and consult knowledge graphs before broad grep searches.
10. [**Dynamic Runtime Metadata**](.agents/rules/dynamic-runtime-metadata.md) (`always_on`): Strict prohibition against introducing static metadata or entity JSON dumps into `src/`; runtime must remain 100% dynamically driven by live InnoGames network RPC payloads.
11. [**Unslop Commits**](.agents/rules/unslop-commit.md) (`always_on`): Mandate concise Conventional Commits adhering strictly to the unslop-commit standard.
12. [**Proactive Subagent Delegation**](.agents/rules/subagent-delegation.md) (`always_on`): Mandate delegating domain, UI, QA, and review tasks to specialized subagents.

---

## 5. Subagent Delegation Directory (31 Specialists)

Antigravity natively discovers and registers subagents from [`.agents/agents/`](.agents/agents/). Delegate tasks proactively via `invoke_subagent` across 4 specialized squads:

1. **Knowledge Graph & Architecture (1 Specialist)**:
   - Deep traversal & cognitive mapping: [`graph-knowledge-explorer`](.agents/agents/graph-knowledge-explorer.md).
2. **FoE Game Domain & Mechanics (11 Specialists)**:
   - Mechanics, RPC schemas, and calculations: [`foe-great-buildings-expert`](.agents/agents/foe-great-buildings-expert.md), [`foe-game-data-expert`](.agents/agents/foe-game-data-expert.md), [`foe-city-optimizer`](.agents/agents/foe-city-optimizer.md), [`foe-combat-boost-analyst`](.agents/agents/foe-combat-boost-analyst.md), [`foe-historical-allies-expert`](.agents/agents/foe-historical-allies-expert.md), [`foe-event-mechanics-expert`](.agents/agents/foe-event-mechanics-expert.md), [`foe-settlements-expert`](.agents/agents/foe-settlements-expert.md), [`foe-guild-warfare-expert`](.agents/agents/foe-guild-warfare-expert.md), [`foe-antiques-dealer-expert`](.agents/agents/foe-antiques-dealer-expert.md), [`monolith-refactoring-specialist`](.agents/agents/monolith-refactoring-specialist.md), [`discord-webhook-integrator`](.agents/agents/discord-webhook-integrator.md).
3. **Extension Architecture, Security & QA (9 Specialists)**:
   - Manifest V3, testing, and release: [`chrome-extension-architect`](.agents/agents/chrome-extension-architect.md), [`extension-release-engineer`](.agents/agents/extension-release-engineer.md), [`cdp-test-engineer`](.agents/agents/cdp-test-engineer.md), [`extension-qa-auditor`](.agents/agents/extension-qa-auditor.md), [`extension-security-auditor`](.agents/agents/extension-security-auditor.md), [`code-reviewer`](.agents/agents/code-reviewer.md), [`cwv-performance-engineer`](.agents/agents/cwv-performance-engineer.md), [`a11y-accessibility-specialist`](.agents/agents/a11y-accessibility-specialist.md), [`i18n-localization-expert`](.agents/agents/i18n-localization-expert.md).
4. **Web Engineering & UI Modernization (10 Specialists)**:
   - Modern web standards and UI: [`bootstrap-expert`](.agents/agents/bootstrap-expert.md), [`ui-design-system-architect`](.agents/agents/ui-design-system-architect.md), [`css-expert`](.agents/agents/css-expert.md), [`html-expert`](.agents/agents/html-expert.md), [`javascript-expert`](.agents/agents/javascript-expert.md), [`jquery-expert`](.agents/agents/jquery-expert.md), [`webpack-expert`](.agents/agents/webpack-expert.md), [`websocket-expert`](.agents/agents/websocket-expert.md), [`nodejs-expert`](.agents/agents/nodejs-expert.md), [`performance-memory-profiler`](.agents/agents/performance-memory-profiler.md).

---

## 6. Skills & Runbooks Taxonomy (45 Skills)

Antigravity discovers skills from [`.agents/skills/`](.agents/skills/) and `.agents/skills.json`. All 45 skills trigger on demand or via user slash commands (`/<skill-name>`). Procedures and runbooks are organized into 5 domains:

1. **FoE Domain & Reverse Engineering (7 Skills)**:
   - [`add-rpc-service`](.agents/skills/add-rpc-service/SKILL.md), [`add-feature-panel`](.agents/skills/add-feature-panel/SKILL.md), [`ingest-game-metadata`](.agents/skills/ingest-game-metadata/SKILL.md), [`deprecate-gvg-to-qi`](.agents/skills/deprecate-gvg-to-qi/SKILL.md), [`graphify`](.agents/skills/graphify/SKILL.md), [`ephemeral-llama-swap`](.agents/skills/ephemeral-llama-swap/SKILL.md), [`api-testing-observability-api-mock`](.agents/skills/api-testing-observability-api-mock/SKILL.md).
2. **Code Quality, Refactoring & Algorithm Optimization (11 Skills)**:
   - [`refactor-index-slice`](.agents/skills/refactor-index-slice/SKILL.md), [`service-extractor`](.agents/skills/service-extractor/SKILL.md), [`complexity-cuts`](.agents/skills/complexity-cuts/SKILL.md), [`code-simplifier`](.agents/skills/code-simplifier/SKILL.md), [`andrej-karpathy`](.agents/skills/andrej-karpathy/SKILL.md), [`brooks-lint`](.agents/skills/brooks-lint/SKILL.md), [`test-driven-development`](.agents/skills/test-driven-development/SKILL.md), [`test-guard`](.agents/skills/test-guard/SKILL.md), [`systematic-debugging`](.agents/skills/systematic-debugging/SKILL.md), [`verification-before-completion`](.agents/skills/verification-before-completion/SKILL.md), [`unslop-commit`](.agents/skills/unslop-commit/SKILL.md).
3. **Browser Automation, Performance & Diagnostics (9 Skills)**:
   - [`browser-testing`](.agents/skills/browser-testing/SKILL.md), [`audit-memory-leaks`](.agents/skills/audit-memory-leaks/SKILL.md), [`chrome-devtools`](.agents/skills/chrome-devtools/SKILL.md), [`troubleshooting`](.agents/skills/troubleshooting/SKILL.md), [`chrome-extensions`](.agents/skills/chrome-extensions/SKILL.md), [`debug-optimize-lcp`](.agents/skills/debug-optimize-lcp/SKILL.md), [`fixing-motion-performance`](.agents/skills/fixing-motion-performance/SKILL.md), [`modern-web-guidance`](.agents/skills/modern-web-guidance/SKILL.md), [`ui-ux-pro-max`](.agents/skills/ui-ux-pro-max/SKILL.md).
4. **Localization, Accessibility, Security & Release (7 Skills)**:
   - [`i18n-audit`](.agents/skills/i18n-audit/SKILL.md), [`a11y-debugging`](.agents/skills/a11y-debugging/SKILL.md), [`supply-chain-risk-auditor`](.agents/skills/supply-chain-risk-auditor/SKILL.md), [`cross-platform-contract-propagation-audit`](.agents/skills/cross-platform-contract-propagation-audit/SKILL.md), [`package-release`](.agents/skills/package-release/SKILL.md), [`git-hooks-automation`](.agents/skills/git-hooks-automation/SKILL.md), [`changelog-automation`](.agents/skills/changelog-automation/SKILL.md).
5. **Multi-Agent Orchestration, Planning & Workflow (11 Skills)**:
   - [`brainstorming`](.agents/skills/brainstorming/SKILL.md), [`writing-plans`](.agents/skills/writing-plans/SKILL.md), [`executing-plans`](.agents/skills/executing-plans/SKILL.md), [`subagent-driven-development`](.agents/skills/subagent-driven-development/SKILL.md), [`dispatching-parallel-agents`](.agents/skills/dispatching-parallel-agents/SKILL.md), [`using-git-worktrees`](.agents/skills/using-git-worktrees/SKILL.md), [`finishing-a-development-branch`](.agents/skills/finishing-a-development-branch/SKILL.md), [`requesting-code-review`](.agents/skills/requesting-code-review/SKILL.md), [`receiving-code-review`](.agents/skills/receiving-code-review/SKILL.md), [`writing-skills`](.agents/skills/writing-skills/SKILL.md), [`using-superpowers`](.agents/skills/using-superpowers/SKILL.md).

---

## 7. Lifecycle Hooks (`.agents/hooks.json`)

1. **`safety-gate` (`PreToolUse: run_command`)**: Runs `.agents/scripts/safety-gate.mjs`. Intercepts destructive commands forcing user confirmation (`force_ask`). Tests in `tests/agents/hooks.test.mjs`.
2. **`monolith-guardrail` (`PreInvocation`)**: Runs `.agents/scripts/pre-invocation-reminder.mjs`. Injects ephemeral guardrail reminders (<100 lines, monolith, BigNumber, dynamic runtime metadata).
3. **`graphify-sync` (`PostToolUse: replace_file_content|write_to_file`)**: Runs `.agents/scripts/post-tool-graphify-sync.mjs`. Refreshes AST (`graphify update .`) when source files are modified.
4. **`stop-guard` (`Stop`)**: Runs `.agents/scripts/stop-guard.mjs`. Blocks premature exit while background tasks are actively running.

---

## 8. Antigravity Customization Architecture

- **Precedence**: Workspace Project (`.agents/`, `AGENTS.md`) $\to$ Declared Configs (`skills.json`) $\to$ Global (`~/.gemini/config/`) $\to$ Built-in.
- **Skill Sharing**: `.agents/skills.json` defines modular workspace skill directories and external inheritance paths.
- **Progressive Disclosure**: Skills (`.agents/skills/`) load on-demand; all 12 workspace rules in `.agents/rules/` inject unconditionally (`always_on`).
- **Security**: Granular tool permissions only (no wildcards `*`); browser tools wrapped via isolated shell scripts.

---

## 9. Platform Documentation References

- **Docs**: [Antigravity Docs](https://antigravity.google/docs) | [Skills](https://antigravity.google/docs/skills) | [Rules](https://antigravity.google/docs/rules-workflows) | [Hooks](https://antigravity.google/docs/hooks) | [MCP](https://antigravity.google/docs/mcp)
- **Surfaces**: Antigravity CLI (`agy`), Antigravity IDE, Antigravity 2.0 Desktop, and Antigravity Python SDK.
