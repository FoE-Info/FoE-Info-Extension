# Authoring Skills for opencode

opencode counterpart to the Antigravity skill spec. The `SKILL.md` body is
shared; only discovery and frontmatter enforcement differ.

## Discovery

opencode scans `**/SKILL.md` in these locations:

- Project: `.opencode/skills/<name>/SKILL.md`
  and `.agents/skills/<name>/SKILL.md` (walk-up to the git worktree root).
- Global: `~/.config/opencode/skills/`, `~/.agents/skills/`.

The canonical workspace skills live in `.agents/skills/` and are picked up
natively; no `skills.paths` entry is required. Registering extra locations via
`opencode.json` `skills.paths` is optional.

## Frontmatter Rules

Only these fields are recognized: `name`, `description`, `license`,
`compatibility`, `metadata` (string-to-string map). Unknown fields (including
Antigravity's category keys and `trigger`) are ignored.

- `name` is required, 1-64 chars, lowercase, matches the containing folder, and
  must satisfy `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `description` is required, 1-1024 chars, third-person, stating what the skill
  does and when to trigger it. Skills without a description are never surfaced.
- Skill names must be **unique across all locations**. Name collisions with a
  global `~/.agents/skills/` copy are resolved in favor of the project copy, but
  avoid adding collisions.

## Invocation

Skills are loaded by the model through the `skill` tool (`name: <skill>`), not
by a slash command. To expose a user-facing `/<name>` command, add
`.opencode/command/<name>.md`. Restrict access with `permission.skill`
(glob patterns; `deny` hides the skill).

## Verification

`node --test tests/agents/agent-config.test.mjs` validates the canonical 53
skills. `tests/agents/harness-parity.test.mjs` validates opencode-specific
frontmatter and shim parity.
