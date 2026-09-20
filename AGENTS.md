# FoE-Info Extension

Passive Chrome MV3 extension for Forge of Empires. Reads game traffic through DevTools into economic, combat, guild, and city views. No botting, injection, or game writes. npm, Node 20+.

Commands:

- `npm run verify` runs the whole gate: format, lint, i18n, test, build.
- `npm run graph:<repo>:ast|update|reindex` runs one Graphify tier.
- `opencli doctor` / `npm run browser:doctor` verifies browser bridge health.

Config lives in `.agents/` (project subagents, rules, skills, hooks, and MCP). The repository is configured strictly for Antigravity. Start with [docs/README.md](docs/README.md) (documentation hub) and [conductor/](conductor/index.md) (tracks, product specs, and session handoffs).

## Non-negotiable rules

- `src/js/` files stay under 500 lines: follow [modular architecture rule](.agents/rules/modular-architecture.md).
- FP, boost, treasury, or lock math: load [BigNumber rule](.agents/rules/bignumber-precision.md) before changing arithmetic.
- Game metadata streams dynamically from CDN. Nothing is hardcoded: follow [dynamic metadata rule](.agents/rules/dynamic-runtime-metadata.md).
- Observation only. Never drive the game or browser without asking first: follow [browser hygiene rule](.agents/rules/browser-environment-hygiene.md).
- `ArtifactMetadata` is for `<appDataDir>/brain/<conversation-id>/` artifacts.
- Worktrees live in `.worktrees/<branch>`: follow [workspace structure rule](.agents/rules/workspace-structure.md).
- Verification: run `npm run verify` and obtain fresh command evidence before claiming completion.
- Before coding: consult [docs/SKILLS.md](docs/SKILLS.md) and follow [skill-driven-development rule](.agents/rules/skill-driven-development.md).
- Subagent delegation: consult [docs/SUBAGENTS.md](docs/SUBAGENTS.md) and follow protocol in [.agents/rules/subagent-delegation.md](.agents/rules/subagent-delegation.md).
