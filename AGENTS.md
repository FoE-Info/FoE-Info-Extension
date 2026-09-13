# FoE-Info Extension — Agent Workspace

**Project:** Chrome MV3 extension for Forge of Empires — real-time economic, combat, guild, and city intelligence via passive DevTools network interception.

**Package manager:** npm (Node.js 20+)

**Non-standard commands:**

- `npm run verify` — full 5-stage gate (format, lint, i18n, test, build)
- `npm run graph:<repo>:ast|update|reindex` — 3-tier Graphify pipeline (`foe-info`, `foe-info-original`, `forge-hammer`, `low-tool`, `metadata`)
- `foe-browser [--restart]` — isolated Chromium on port 9222 for CDP testing

**Canonical config root:** `.agents/` (36 subagents, 17 rules, and 55 skills, hooks, MCP). `.opencode/` mirrors for OpenCode host.

---

## Quick Links

| Topic                               | File                                         |
| ----------------------------------- | -------------------------------------------- |
| Commands & verification pipeline    | [docs/COMMANDS.md](docs/COMMANDS.md)         |
| Graphify multi-graph infrastructure | [docs/GRAPHIFY.md](docs/GRAPHIFY.md)         |
| Subagent delegation catalog         | [docs/SUBAGENTS.md](docs/SUBAGENTS.md)       |
| Skills & runbooks taxonomy          | [docs/SKILLS.md](docs/SKILLS.md)             |
| Lifecycle hooks reference           | [docs/HOOKS.md](docs/HOOKS.md)               |
| Antigravity/OpenCode architecture   | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Workspace structure                 | [docs/STRUCTURE.md](docs/STRUCTURE.md)       |

---

## Session Start

1. Read [docs/README.md](docs/README.md) (coordination hub)
2. Read [docs/STATUS.md](docs/STATUS.md) (live work/todos)
3. Read [docs/HANDOFF.md](docs/HANDOFF.md) (verified state)
4. For Antigravity-specific tools/hooks: [docs/OPENCODE.md](docs/OPENCODE.md)

---

## Core Invariants (always-on)

- **Modular architecture:** ≤600 lines/file in `src/js/`
- **BigNumber precision:** zero floating-point drift in FP/boost calculations
- **Zero static game metadata:** all entities stream dynamically from InnoGames CDN
- **Strict passive observation:** no botting, injection, or active game modification
- **Artifact boundary:** `ArtifactMetadata` only for `<appDataDir>/brain/<conversation-id>/` artifacts
- **Git worktrees:** `.worktrees/<branch>` — core configs (`.agents/`, `AGENTS.md`) tracked

---

## Skill-First Invariant

Before modifying code, designing architecture, or debugging: **consult `<skills>` catalog** → **announce active skill** → **follow skill workflow**. See [docs/SKILLS.md](docs/SKILLS.md) for categories — 55 on-demand runbooks and procedures, catalogued in the Skills & Runbooks Taxonomy (55 Skills).

---

## Subagent-First Invariant

Before executing domain tasks: check if a specialized subagent fits (36 across 4 squads). See [docs/SUBAGENTS.md](docs/SUBAGENTS.md) for squad map.
