# FoE-Info Extension

Chrome MV3 extension for Forge of Empires. Reads game traffic passively through
DevTools and turns it into economic, combat, guild, and city views. No botting,
no injection, no writes to the game.

npm, Node 20+.

Commands you'll use:

- `npm run verify` runs the whole gate: format, lint, i18n, test, build.
- `npm run graph:<repo>:ast|update|reindex` runs one Graphify tier.
- `foe-browser` starts the isolated Chromium on port 9222 for CDP work.

Config lives in `.agents/` (36 subagents, 17 rules, and 55 skills, hooks, MCP).
`.opencode/` mirrors it for the OpenCode host.

Start with [docs/README.md](docs/README.md) (coordination hub),
[docs/HANDOFF.md](docs/HANDOFF.md) (verified state), and
[docs/STATUS.md](docs/STATUS.md) (open work). Check git status and the source
before trusting an old plan. Host-specific wiring: [docs/OPENCODE.md](docs/OPENCODE.md).

## Rules that are not negotiable

- `src/js/` files stay under 600 lines.
- FP and boost math goes through BigNumber. No float drift.
- Game metadata streams from the InnoGames CDN. Nothing is hardcoded.
- Observation only. Never drive the game or the browser without asking first.
- `ArtifactMetadata` is for `<appDataDir>/brain/<conversation-id>/` artifacts.
- Worktrees live in `.worktrees/<branch>`.

## Before you write code

Check the skills catalog and say which skill you are following. The 55 on-demand
runbooks and procedures are in [docs/SKILLS.md](docs/SKILLS.md).

## Before you pick up a task

Check whether one of the 36 subagents covers the domain. That's 4 squads, and
[rules/subagent-delegation.md](.agents/rules/subagent-delegation.md) has the
protocol.
