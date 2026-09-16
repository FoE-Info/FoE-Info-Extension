# FoE-Info Extension

Chrome MV3 extension for Forge of Empires. Reads game traffic passively through
DevTools and turns it into economic, combat, guild, and city views. No botting,
no injection, no writes to the game.

npm, Node 20+.

Commands you'll use:

- `npm run verify` runs the whole gate: format, lint, i18n, test, build.
- `npm run graph:<repo>:ast|update|reindex` runs one Graphify tier.
- `foe-browser` starts the isolated Chromium on port 9222 for CDP work.

Config lives in `.agents/` (project subagents, rules, skills, hooks, and MCP).
`.opencode/` adapts the canonical library for the OpenCode host.

Start with [docs/README.md](docs/README.md) (coordination hub) and
[docs/STATUS.md](docs/STATUS.md) (open work). Read
[docs/HANDOFF.md](docs/HANDOFF.md) only when resuming a named thread or checking
known verified state. Check git status and current source before trusting a plan.
Host-specific wiring: [docs/OPENCODE.md](docs/OPENCODE.md).

## Rules that are not negotiable

- `src/js/` files stay under 600 lines.
- When a task touches FP, boost, treasury, or lock calculations, load the domain-scoped BigNumber rule before changing arithmetic.
- Game metadata streams from the InnoGames CDN. Nothing is hardcoded.
- Observation only. Never drive the game or the browser without asking first.
- `ArtifactMetadata` is for `<appDataDir>/brain/<conversation-id>/` artifacts.
- Worktrees live in `.worktrees/<branch>`.

## Before you claim completion

Follow the
[verification-before-completion rule](.agents/rules/verification-before-completion.md),
including recording the grounded outcome for every project skill or subagent used.

## Before you write code

Check the skills catalog and say which skill you are following. The on-demand
runbooks and procedures are in [docs/SKILLS.md](docs/SKILLS.md).

## Before you pick up a task

Check whether a project subagent covers the domain. The
[rules/subagent-delegation.md](.agents/rules/subagent-delegation.md) has the
protocol.
