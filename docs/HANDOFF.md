# FoE-Info Extension — Verified Handoff

## Repository State

- Branch: `development`, tracking `origin/development`.
- The repository is configured strictly for native Google Antigravity.
- `.agents/` is the Git-tracked canonical agent library.

## Canonical Configuration

- 12 domain-specific skills under `.agents/skills/` (Antigravity-native; generic AAS residue purged).
- 14 flat subagents under `.agents/agents/`.
- 16 rules: 7 `always_on`, 9 `model_decision` (including `modern-web-conventions.md`).
- `docs/SKILLS.md` and `docs/SUBAGENTS.md` are generated from canonical frontmatter by `.agents/scripts/generate-agent-catalogs.mjs`; `--check` detects drift.
- Optional skill depth lives in owned `references/` libraries with explicit `references/README.md` catalogs.

## Routing and Ownership

- `graph-knowledge-explorer` uses explicit graph profiles from `.agents/references/agents/graph-targets.md`.
- `cross-codebase-comparator` uses explicit peer/baseline profiles from `.agents/references/agents/comparison-targets.md`.
- `foe-economy-analyst` and `foe-combat-analyst` use topic profiles from `.agents/references/agents/foe-mechanics-topics.md`.
- FoE JSON-RPC analysis is owned by `protocol-reverse-engineering`; `add-rpc-service` remains the separate implementation workflow.
- Mandatory skill selection and completion verification are owned by rules, not duplicate invokable skills.
- Chrome extension development and DevTools inspection are provided by official Google plugins (`modern-web-guidance-plugin` and `chrome-devtools-plugin`).

## Host Behavior

- Antigravity directly loads workspace rules, skills, agents, and hooks.
- BigNumber precision is `model_decision` and applies only to FP, boost, treasury, lock, and related arithmetic work.
- MCP commands resolve through `PATH`; graph locations are workspace-relative. Antigravity environment placeholders resolve when a profile is generated.
- `.agents/references/antigravity-environment.md` provides tool, dispatch, isolation, hook, and artifact mapping.

## Self-Improvement

- `.agents/rules/verification-before-completion.md` requires grounded verification evidence before completion.
- Reusable constraints and operational lessons persist directly into `.agents/rules/` and via native Antigravity `/learn`.

## Verification

Verified on 2026-09-20:

- `npm run verify` — passed formatting, ESLint (0 errors), TypeScript, RPC contract, i18n, complete Node tests (80/80 suites), and development webpack build.
- `node .agents/scripts/generate-agent-catalogs.mjs --check` — both catalogs current.
- `git status` — clean working tree on `development`.

## Current Work

Use `docs/STATUS.md` and `docs/specs/2026-09-20-codebase-modernization-roadmap.md` for active modernization work.

- **Completed**:
  - Slice 1A: `src/js/calc/prod/entityProductionParser.js` (497L -> 202L)
  - Slice 2A: `src/js/msg/GuildBattlegroundService.js` (489L -> 240L)
  - Slice 2B: `src/js/msg/StartupService.js` (424L -> 246L)
  - Slice 2C: `src/js/msg/GbgSignalService.js` (403L -> 221L)
- **Next Slice to Resume**:
  - Milestone 1, Cluster 3 (Slice 3A): decompose `src/js/protocol/MessageDispatcher.js` (493L down to $\le 250$L).
