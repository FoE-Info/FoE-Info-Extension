# FoE-Info Extension

Passive Chrome MV3 extension for Forge of Empires. Reads game traffic through DevTools into economic, combat, guild, and city views. No botting, injection, or game writes. npm, Node 20+.

Commands:

- `npm run verify` runs the whole gate: format, lint, i18n, test, build.
- `npm run graph:<repo>:ast|update|reindex` runs one Graphify tier.
- `opencli doctor` / `npm run browser:doctor` verifies browser bridge health.

Config lives in `.agents/` (project subagents, rules, skills, hooks, and MCP). The repository is configured strictly for Antigravity. Start with [docs/README.md](docs/README.md) (coordination hub) and [docs/STATUS.md](docs/STATUS.md) (open work). Read [docs/HANDOFF.md](docs/HANDOFF.md) when resuming threads.

## Non-negotiable rules

- `src/js/` files stay under 500 lines.
- FP, boost, treasury, or lock math: load BigNumber rule before changing arithmetic.
- Game metadata streams dynamically from CDN. Nothing is hardcoded.
- Observation only. Never drive the game or browser without asking first.
- `ArtifactMetadata` is for `<appDataDir>/brain/<conversation-id>/` artifacts.
- Worktrees live in `.worktrees/<branch>`.
- Verification: follow [verification-before-completion rule](.agents/rules/verification-before-completion.md) with fresh command evidence before claiming completion.
- Before coding: consult the catalog and follow on-demand procedures in [docs/SKILLS.md](docs/SKILLS.md).
- Subagent delegation: follow protocol in [rules/subagent-delegation.md](.agents/rules/subagent-delegation.md).
