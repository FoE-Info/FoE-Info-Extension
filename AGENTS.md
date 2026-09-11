# FoE-Info Extension — Antigravity Workspace Guidelines & Agent Ecosystem

This document defines the workspace architecture, command runners, multi-graph knowledge engines, subagent delegation directories, runbook skills, and lifecycle safety hooks for **FoE-Info Extension** (`/var/home/kronikpillow/Projects/FoE-Info/FoE-Info-Extension`).

**Host & Session Start:** Read [docs/README.md](docs/README.md) (coordination hub), then [docs/STATUS.md](docs/STATUS.md) (live work/todos) and [docs/HANDOFF.md](docs/HANDOFF.md) (verified state) before acting. For Antigravity-specific tool names or hook instructions read [docs/OPENCODE.md](docs/OPENCODE.md). `.agents/` remains canonical; `.opencode/` supplies the host-specific registration. Read applicable rule files explicitly. Workspace identity lives in `.agents/project.json` (`name`, `displayName`, `primaryGraph`); `package.json` mirrors these fields for npm/build tooling.

---

## 1. Workspace Overview & Directives

- **Strictly Agentic Environment**: Never generate IDE configs (`.vscode/`, `.idea/`, `launch.json`). Task execution relies exclusively on `package.json` runners and Antigravity tooling.
- **Antigravity Version Context**: Electron Antigravity 2.0+ started the agentic work; Antigravity CLI did the most recent work (grant rebuilds, MCP portability); Antigravity-IDE base is barely used. OpenCode continues when Antigravity runs out — see `antigravity-interop` skill for handoff protocol.
- **FoE Expert Caveat**: Many FoE custom expert/subagent claims were AI-inferred by Antigravity from inspecting the codebase (which was broken at the time) + live network/RPCs. Some claims may be inaccurate (GB calculations was wrong). Treat expert claims as hypotheses — always verify against source code.
- **Git Boundaries & Worktrees**: Worktrees reside in `.worktrees/<branch>`. Core configurations (`.agents/`, `AGENTS.md`) are tracked in Git, ensuring new worktrees instantly inherit all 36 subagents, 17 rules, and 53 skills (53 on-demand runbooks and procedures).
- **Artifact Boundaries**: Never pass `ArtifactMetadata` when modifying repository files. It is reserved exclusively for `<appDataDir>/brain/<conversation-id>/` artifacts.

```text
FoE-Info-Extension/
├── .agents/                 # Antigravity root: 36 subagents, 17 rules, 53 skills, hooks, MCP
├── graphify-out/            # Knowledge graphs (foe-info/, metadata symlink -> ../metadata-store/graphify-out)
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
2. **`graphify-foe-info-original`** (`../FoE-Info-Extension-original/graphify-out/graph.json`): Original pre-agentic v1 baseline AST (commit `8c681d1`; frozen sibling snapshot).
3. **`graphify-metadata-store`** (`../metadata-store/graphify-out/graph.json`): 5,400+ game entities, building definitions, GBs, Allies.
4. **`graphify-forge-hammer`** (`../forge-hammer/graphify-out/graph.json`): Competitor browser extension architecture graph (optional sibling repo clone).
5. **`graphify-low-tool`** (`../LoW-Tool/graphify-out/graph.json`): Original closed-source implementation graph (optional sibling repo clone); source of removed FoE-Info features.

> Delegate deep cognitive mapping to [`graph-knowledge-explorer`](.agents/agents/graph-knowledge-explorer.md).

---

## 4. Codebase Quality Invariants (17 Core Rules)

All agents adhere to 17 rules in `.agents/rules/` (`always_on` invariants and `model_decision` workflows):

1. [Superpowers](.agents/rules/superpowers.md) · 2. [Verification Before Completion](.agents/rules/verification-before-completion.md) · 3. [Small Incremental Changes](.agents/rules/small-incremental-changes.md) · 4. [Subagent Delegation](.agents/rules/subagent-delegation.md) · 5. [Knowledge Graph Integration](.agents/rules/graphify.md) · 6. [Modular Architecture](.agents/rules/modular-architecture.md) · 7. [Monolith Containment](.agents/rules/monolith-containment.md) · 8. [Dynamic Runtime Metadata](.agents/rules/dynamic-runtime-metadata.md) · 9. [BigNumber Precision](.agents/rules/bignumber-precision.md) · 10. [i18n Compliance](.agents/rules/i18n-compliance.md) · 11. [Scope Control](.agents/rules/scope-control.md) · 12. [Security Permissions](.agents/rules/security-permissions.md) · 13. [Browser Environment Hygiene](.agents/rules/browser-environment-hygiene.md) · 14. [Workspace Structure](.agents/rules/workspace-structure.md) · 15. [Unslop Commits](.agents/rules/unslop-commit.md) · 16. [Debuggability by Design](.agents/rules/debuggability-by-design.md) · 17. [Release Policy](.agents/rules/release-policy.md).

---

## 5. Subagent Delegation Directory (36 Specialists)

Canonical personas live in [`.agents/agents/`](.agents/agents/) (opencode shims in `.opencode/agents/`). Consult `<subagents>` for all 36 available specialists across 4 squads:

- **Knowledge Graph & Architecture (8)**: Graphify AST traversal, refactoring, and peer comparisons.
- **FoE Game Domain (15)**: Math, combat boosts, GBs, snipes, QI, GBG, GE, settlements, and RPC data.
- **Extension Architecture & QA (9)**: CDP browser automation, security audits, code reviews, and releases.
- **Web Engineering & UI (4)**: Bootstrap 5.3 layouts, TypeScript, JavaScript, and Webpack.

---

## 6. Skills & Runbooks Taxonomy (53 Skills)

53 on-demand runbooks and procedures discovered from [`.agents/skills/`](.agents/skills/) (consult `<skills>` catalog for triggers):

- **FoE Domain (7)**: RPC handlers, UI panel scaffolding, metadata ingestion, reverse engineering.
- **Code Quality (13)**: Monolith decomposition, TDD, systematic debugging, complexity cuts, audits.
- **Browser Diagnostics (10)**: CDP test harness, memory leaks, DevTools, rendering performance.
- **Localization & Release (8)**: i18n audits, a11y, supply chain security, packaging.
- **Multi-Agent Orchestration (15)**: Superpowers, planning, git worktrees, rule/skill/agent authoring.

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
- **Dual-Harness MCP Registration**: Antigravity CLI reads `.agents/mcp_config.json` for all 6 servers (`chrome-devtools`, `graphify-foe-info`, `graphify-forge-hammer`, `graphify-metadata-store`, `graphify-foe-info-original`, `graphify-low-tool`); opencode reads `opencode.json`. Permission grants use `mcp(server/tool)` wrapper syntax in `~/.gemini/config/config.json`.
- **Documentation**: [Antigravity Docs](https://antigravity.google/docs) | [Skills](https://antigravity.google/docs/skills) | [Rules](https://antigravity.google/docs/rules-workflows) | [Hooks](https://antigravity.google/docs/hooks) | [MCP](https://antigravity.google/docs/mcp).
