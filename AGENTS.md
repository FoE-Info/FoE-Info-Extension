# FoE-Info Extension

Passive Chrome MV3 extension for Forge of Empires. npm, Node 26.8.2+.

AGENTS.md is the canonical agent entrypoint. No mirrors or subtree entrypoints
are maintained. Start with [README.md](README.md), [docs/architecture.md](docs/architecture.md),
and [docs/debugging.md](docs/debugging.md). [SECURITY.md](SECURITY.md) owns observation
boundaries; [CONTRIBUTING.md](CONTRIBUTING.md) owns validation and delivery policy.
Keep detailed procedures in their owning documents and link them here.

## Hard boundaries

- Observe game traffic passively through the DevTools listener and MAIN-world
  transport. Never send game requests, automate gameplay, or write into game frames.
- Stream game metadata from CDN/RPC responses; do not hardcode entity statistics.
- Use BigNumber with explicit rounding modes for FP, boosts, treasury, and locks.
- Preserve presentation, service, state, and calculation boundaries described in
  docs/architecture.md. Organize modules by functional cohesion, not arbitrary line counts.
- Preserve unrelated working-tree changes. Update documentation references in the
  same change when moving, renaming, or deleting modules.

## Commands

- `npm run setup` installs npm dependencies and local Git rebase defaults.
  `mise run setup-full` adds the optional Graphify Python environment.
- `npm run verify` must pass before a commit. It runs version, published references,
  formatting, lint, typecheck, RPC/i18n contracts, tests, focused coverage, dev build,
  and production bundle budgets. Never claim a stage passed without its output.
- `npm run audit:refs` checks local documentation references, including shared
  agent configuration. Run it after moving, renaming, or deleting a module.
  `npm run audit:refs:published` checks shared surfaces and publication policy.
- Run `npm run audit:callsites` for removed/renamed symbols and
  `npm run audit:default-args` for changed parameter defaults. Scope and blind spots
  are documented in README.
- `development` is linear: pull with rebase, never merge. Follow CONTRIBUTING.md,
  including its Graphify merge-driver setup.

## Shared agent harness

[Specialists](.agents/agents/), [rules](.agents/rules/), [skills](.agents/skills/),
and harness scripts/tests are shared repository sources. They supplement this
entrypoint; the root and its owning documents take precedence over conflicting
supplemental guidance. Specialist catalogs describe roles and do not require
delegation. [CONTRIBUTING.md](CONTRIBUTING.md) owns MCP profile generation and
runtime setup; [roadmap](docs/roadmap.md) owns direction and priorities;
[tasks](docs/tasks.md) owns execution status and acceptance
criteria; superseded proposal files are not maintained.

Agent configuration is checked by the same reference, formatting, lint, and test
gates as other shared sources. Credentials, installed environments, and generated
runtime artifacts stay outside shared configuration. No commits or pushes are
needed to verify an isolated export of pending working-tree files.

## Graphify

Consult the graph before a wide disk search when `graphify-out/graph.json` exists.
Use `graphify query`, `path`, `explain`, `god-nodes`, or `affected` for structural
questions; use `rg` for exact tokens. Prefer a scoped query over the whole report.
Dirty graph output is expected and is not a reason to skip it. Skip only when
investigating stale/incorrect graph output or when the user says not to use it.
If a generated wiki index exists, use it for broad navigation.

After editing `src/`, refresh the AST with
`bash scripts/graphify/graphify.sh foe-info ast` or `mise run graph-ast`.
`mise run verify-full` adds that refresh to verification. AST refresh requires no
LLM or API access. The local graph is the only graph produced by this repository.
Before querying a sibling graph, verify its existence, source, and labeling;
never assume peer paths or community meanings.

When `/graphify` is requested, load the local Graphify skill if installed. If it
is unavailable, explain that limitation and use the documented CLI for AST/query
work; do not guess semantic reindex or inference procedures. Record durable graph
findings in generated findings/reflections when useful. For deep cognitive mapping,
use the graph-knowledge-explorer specialist if available; the main agent owns writes.

The [documentation index](docs/index.md) maps document ownership, naming, work state, and delivery artifacts.
