# FoE-Info Extension — Verified Handoff

## Repository State

- Branch: `development`, tracking `origin/development`.
- The working tree is intentionally dirty with both harness work and pre-existing application work. Do not discard, stage, commit, or push unrelated changes.
- `.agents/` is the Git-tracked canonical harness library. `.opencode/` and `opencode.json` are adapters, not independent owners.

## Canonical Harness

- 55 skills under `.agents/skills/`.
- 20 flat subagents under `.agents/agents/`, with matching OpenCode shims.
- 17 rules: 8 `always_on`, 9 `model_decision`.
- `docs/SKILLS.md` and `docs/SUBAGENTS.md` are generated from canonical frontmatter by `.agents/scripts/generate-agent-catalogs.mjs`; `--check` detects drift.
- Optional skill depth lives in owned `references/` libraries with explicit `references/README.md` catalogs. Skill entrypoints stay at or below 250 lines.

## Routing and Ownership

- `graph-knowledge-explorer` uses explicit graph profiles from `.agents/references/agents/graph-targets.md`.
- `cross-codebase-comparator` uses explicit peer/baseline profiles from `.agents/references/agents/comparison-targets.md`.
- `foe-economy-analyst` and `foe-combat-analyst` use topic profiles from `.agents/references/agents/foe-mechanics-topics.md`.
- FoE JSON-RPC analysis is owned by `protocol-reverse-engineering`; `add-rpc-service` remains the separate implementation workflow.
- Mandatory skill selection and completion verification are owned by rules, not duplicate invokable skills.
- Chrome extension development and Chrome Web Store publishing are separate skills.

## Host Behavior

- OpenCode injects exactly the eight canonical `always_on` rules. Scoped rules load by relevance.
- BigNumber precision is `model_decision` and applies only to FP, boost, treasury, lock, and related arithmetic work.
- MCP commands resolve through `PATH`; graph locations are workspace-relative. Antigravity environment placeholders resolve when a profile is generated. OpenCode uses literal local Graphify defaults and native `{env:NAME}` interpolation only for required external credentials.
- MCP profile writes reject symlinked destinations, use exclusively created randomized staging files, preserve unrelated OpenCode MCP entries, and format both generated configs before replacement.
- `.agents/references/harness-adapters.md` is the canonical tool, dispatch, isolation, hook, and artifact mapping.

## Self-Improvement

- `.agents/rules/verification-before-completion.md` requires grounded outcome logging for each project skill or subagent used.
- `.agents/scripts/skill-memory.mjs` records evidence and promotes verified lessons into canonical definitions.
- `.agents/scripts/project-curator.mjs` is dry-run/read-only by default; apply mode only repairs already-recorded missing lesson promotions.
- `.agents/references/skill-memory.md` is the sole shared explanation.

## Verification

Verified on 2026-09-15:

- `npm run test:agents` — 83/83 passed.
- `node .agents/scripts/generate-agent-catalogs.mjs --check` — both catalogs current.
- `node .agents/scripts/project-curator.mjs status` — 55 skills, 20 agents, 75 definitions, 0 missing stored lessons, 0 stale definitions, 0 duplicate lesson groups, 0 duplicate reference groups, 0 warnings.
- `npm run verify` — passed formatting, ESLint, TypeScript, RPC contract, i18n, complete Node tests, and development webpack build.
- `git diff --check` — passed.

## Current Work

Use `docs/STATUS.md` for open product work. No harness migration task remains open. Before any future harness change, inspect the current tree and run the generator check, harness suite, Curator status, and full verification gate.
