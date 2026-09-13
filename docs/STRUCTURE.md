# Workspace Structure

```
FoE-Info-Extension/
├── .agents/                      # Antigravity root (tracked in Git)
│   ├── agents/                   # 36 subagent definitions (.md)
│   ├── rules/                    # 17 rule files (always_on + model_decision)
│   ├── skills/                   # 55 skill directories (SKILL.md + refs/scripts)
│   ├── hooks.json                # Lifecycle hooks (3 active)
│   ├── mcp_config.json           # 7 MCP server definitions (Antigravity)
│   ├── scripts/                  # Hook scripts + graphify pipeline scripts
│   │   ├── safety-gate.mjs
│   │   ├── pre-invocation-reminder.mjs
│   │   ├── stop-guard.mjs
│   │   ├── llama-swap-lifecycle.sh
│   │   ├── llama-swap-env.sh
│   │   ├── run-graphify-local.sh
│   │   └── graph-*-ast.sh|update.sh|reindex.sh (10 scripts)
│   └── project.json              # Workspace identity (name, displayName, primaryGraph)
├── .opencode/                    # OpenCode host registration (mirrors .agents/)
│   ├── agents/                   # Shims → .agents/agents/
│   └── opencode.json             # OpenCode config + MCP plugins
├── graphify-out/                 # Generated knowledge graphs (gitignored)
│   ├── foe-info/                 # graph.json + exports
│   └── metadata/                 # symlink → ../metadata-store/graphify-out
├── docs/                         # Progressive disclosure docs (this folder)
│   ├── README.md                 # Coordination hub
│   ├── STATUS.md                 # Live work/todos
│   ├── HANDOFF.md                # Verified state
│   ├── OPENCODE.md               # Antigravity-specific tools/hooks
│   ├── COMMANDS.md               # This file: commands & verification pipeline
│   ├── GRAPHIFY.md               # Multi-graph knowledge infrastructure
│   ├── SUBAGENTS.md              # 36 specialist catalog + delegation protocol
│   ├── SKILLS.md                 # 55 skills taxonomy + skill-first invariant
│   ├── HOOKS.md                  # Lifecycle hooks reference
│   ├── ARCHITECTURE.md           # Antigravity/OpenCode architecture
│   ├── STRUCTURE.md              # This file: workspace structure
│   ├── plans/                    # Implementation plans (YYYY-MM-DD-<slug>.md)
│   └── specs/                    # Design specs & audit findings (YYYY-MM-DD-<slug>-design.md)
├── src/
│   ├── chrome/                   # MV3 manifests, panel.html, options.html
│   ├── css/                      # Bootstrap 5.3 theme & component stylesheets
│   ├── i18n/                     # 7-language dictionaries (de, el, en, es, fr, gr, it)
│   └── js/                       # Modular architecture (≤600 lines/file)
│       ├── calc/                 # Pure calculation engines (BigNumber, zero DOM)
│       ├── msg/                  # InnoGames JSON-RPC service handlers (14+ services)
│       ├── protocol/             # Interception, dedup, priority dispatch
│       ├── state/                # In-memory reactive state & MetadataStore
│       ├── ui/                   # Container binding, Bootstrap cards, renderers
│       └── utils/                # Storage, i18n, XSS formatters, logger
├── tests/                        # Native Node.js test suites (node:test)
│   └── agents/                   # Harness parity tests
├── .worktrees/                   # Git worktrees (gitignored)
│   └── <branch>/                 # Isolated worktree per task
├── package.json                  # npm scripts, dependencies, project metadata
├── tsconfig.json                 # TypeScript config
├── webpack.config.js             # Webpack 5 multi-target config
├── AGENTS.md                     # Root agent workspace (minimal, links to docs/)
├── CHANGELOG.md                  # Version history (standard repo-root)
├── LICENSE.md                    # License (standard repo-root)
├── SECURITY.md                   # Security policy (standard repo-root)
├── CONTRIBUTING.md               # Contribution guide (standard repo-root)
└── README.md                     # Project overview (standard repo-root)
```

## Key Conventions

- **Standard repo-root docs** (leave at root): README.md, CHANGELOG.md, LICENSE.md, SECURITY.md, CONTRIBUTING.md
- **Spec/audit/decision docs** → `docs/plans/` or `docs/specs/` (see `docs-placement-discipline` skill)
- **Graphify output** (`graphify-out/`) is gitignored — never commit generated graphs
- **Worktrees** (`.worktrees/`) are gitignored — each task gets isolated branch
- **Core configs** (`.agents/`, `AGENTS.md`) are tracked — new worktrees inherit full agent ecosystem
