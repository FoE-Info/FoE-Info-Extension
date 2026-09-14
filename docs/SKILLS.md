# Skills & Runbooks Taxonomy (56 Skills)

Discovered from `.agents/skills/`. Consult `<skills>` catalog for triggers. Load on-demand via `skill_view(name)`.

## Categories

### FoE Domain (7)

| Skill                            | Purpose                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `add-rpc-service`                | Scaffold new InnoGames JSON-RPC service handler                              |
| `add-feature-panel`              | Scaffold new DevTools panel feature with container binding                   |
| `ingest-game-metadata`           | Ingest live game metadata, rebuild entity graph, ensure relational integrity |
| `reverse-engineer-game-mechanic` | RE game mechanics from network traffic + live RPC                            |
| `foe-gb-calculator`              | Great Building math, Arc boosts, spot locks, leveling                        |
| `foe-combat-boosts`              | Combat boost calculations across GBG/GE/QI/PvP                               |
| `foe-city-optimizer`             | City layout optimization, production density, road reduction                 |

### Code Quality (13)

| Skill                            | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `test-driven-development`        | Enforce RED-GREEN-REFACTOR, tests before code              |
| `systematic-debugging`           | 4-phase root cause debugging                               |
| `monolith-decomposition`         | Break monoliths into isolated modules (≤600 lines)         |
| `code-complexity-audit`          | Identify and cut complexity hotspots                       |
| `security-audit`                 | Security scan, quality gates, auto-fix                     |
| `simplify-code`                  | Parallel 4-agent cleanup of recent changes                 |
| `spike`                          | Throwaway experiments to validate ideas                    |
| `subagent-driven-development`    | Execute plans via delegate_task subagents (2-stage review) |
| `requesting-code-review`         | Pre-commit review: security, quality gates, auto-fix       |
| `grill-me`                       | Adversarial plan interview before implementation           |
| `verification-before-completion` | Final gate before marking done                             |
| `unslop-commit`                  | Clean commit discipline                                    |
| `writing-plans`                  | Architecture/spec writing                                  |

### Browser Diagnostics (10)

| Skill                           | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `chrome-devtools`               | CDP automation, DevTools Protocol          |
| `browser-testing`               | CDP test harness, mock RPC, DOM assertions |
| `memory-leak-detection`         | Heap snapshots, DOM leak tracking          |
| `rendering-performance`         | Core Web Vitals, frame timing              |
| `dogfood`                       | Exploratory QA of web apps                 |
| `node-inspect-debugger`         | Node.js --inspect + CDP debugging          |
| `python-debugpy`                | Python pdb + debugpy remote                |
| `inspecting-hermes-desktop-dom` | Live Hermes DOM/CSS over CDP               |
| `har-derived-api-client`        | Record XHR → HAR → HTTP client             |
| `web-audit-checklist`           | Comprehensive web app audit                |

### Localization & Release (8)

| Skill                   | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `i18n-audit`            | 7-language dictionary parity, completeness |
| `accessibility-audit`   | WCAG 2.2 AA, ARIA, keyboard nav            |
| `supply-chain-security` | Dependency audit, SBOM, provenance         |
| `extension-packaging`   | Chrome Web Store bundle, MV3 manifest sync |
| `release-engineering`   | Changelogs, versioning, publishing         |
| `a11y-testing`          | Automated accessibility test patterns      |
| `localization-workflow` | Translation extraction, validation, sync   |
| `release-checklist`     | Pre-release verification gates             |

### Multi-Agent Orchestration (18)

| Skill                          | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `superpowers`                  | Skill-first execution loop                              |
| `subagent-driven-development`  | Parallel workstreams via delegation                     |
| `antigravity-interop`          | Antigravity ↔ OpenCode handoff protocol                 |
| `graphify`                     | Graphify AST, update, reindex, exports                  |
| `llama-swap-contract`          | Enforce llama-swap sourcing before LLM exports          |
| `docs-placement-discipline`    | Move spec/audit/decision docs from root to docs/        |
| `antigravity-cli`              | Operate Antigravity CLI (plugins, auth, sandbox)        |
| `agentic-harness-review`       | Audit harness: config, grants, MCP, DBs, scripts, rules |
| `codex`                        | Delegate to OpenAI Codex CLI                            |
| `opencode`                     | Delegate to OpenCode CLI                                |
| `computer-use`                 | Drive desktop background-first                          |
| `dynamic-workflow`             | Plan-in-code fan-outs, adversarial verification         |
| `hermes-agent`                 | Configure, theme, extend Hermes Agent                   |
| `codebase-inspection`          | pygount LOC, languages, ratios                          |
| `hermes-agent-skill-authoring` | Author in-repo SKILL.md files                           |
| `requesting-code-review`       | Pre-commit review gates                                 |
| `grill-me`                     | Adversarial plan interview                              |
| `caveman`                      | Terse communication mode cutting output tokens          |

## Skill Memory & Work Log

Skills accumulate evidence about their own usage — the persistence layer for a
Generator → Reflector → Curator self-improvement loop:

| Artifact                                     | Purpose                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| `.agents/skills/<name>/memory/worklog.jsonl` | One JSON object per run: outcome, ground signals, lesson |
| `.agents/skills/<name>/memory/lessons.md`    | Deduplicated prose lessons, newest date block first      |

Record a run, then fold the lesson back into the skill's `SKILL.md` in the same
change — a lesson recorded only in the worklog never changes behaviour:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> --outcome pass|fail|partial \
  --signal "<ground command that can fail>" --lesson '<imperative rule + why>'
node .agents/scripts/skill-memory.mjs lessons --skill <name>
node .agents/scripts/skill-memory.mjs stats
```

Full loop, promotion signals, and authoring rules: `writing-skills`
`references/skill-memory.md`. Verified by `tests/agents/skill-memory.test.mjs`.

## Shared On-Demand Knowledge

Reusable FoE domain knowledge, API catalogs, and worked subagent examples live
outside agent prompts under `.agents/references/`. Use the
[Agent Reference Catalog](../.agents/references/README.md) to locate material
that agents and skills can load only when relevant. Antigravity subagent
definitions remain flat in `.agents/agents/*.md`.

## Skill-First Invariant

**Before any non-trivial task:**

1. Consult `<skills>` catalog
2. Announce: `Using [skill] to [purpose]`
3. Follow skill workflow strictly

**Red flags (never skip):**

- "This is just a simple question" → check skills first
- "I need more context first" → skills define context gathering
- "The skill is overkill" → skills contain evolving checklists
- "I'll just do this quick thing first" → invariants require skill check BEFORE action
