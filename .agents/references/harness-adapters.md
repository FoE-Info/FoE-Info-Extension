# Dual-Harness Adapter (Antigravity & opencode)

Single shared reference for the harness-specific details behind the abstract
actions used by workflow skills. Load it only when a skill step differs by
harness; the canonical `.agents/` content is otherwise harness-neutral.

Canonical source of truth stays in `.agents/`. `.opencode/` mirrors only what
opencode requires. See `docs/OPENCODE.md` for the full coexistence contract.

---

## 1. Tool Resolution

| Abstract action | Antigravity | opencode |
| :--- | :--- | :--- |
| Run a command | `run_command` | `bash` |
| Read a file | `view_file` | `read` |
| Edit a file | `replace_file_content` | `edit` |
| Create/overwrite a file | `write_to_file` | `write` |
| Text search / file search | `grep_search` / `find_by_name` | `grep` / `glob` |
| Dispatch a subagent | `invoke_subagent` | `task` (`subagent_type: <name>`) |
| Load a skill | implicit skill activation | `skill` tool (`name: <skill>`) |
| Track tasks | plan checkboxes + `replace_file_content` | `todowrite` |
| Read MCP tool | `call_mcp_tool` (`ServerName`) | call the MCP tool directly (`<server>_<tool>`) |

MCP tool names are sanitized per host: Antigravity uses `mcp(server/tool)` in
grants; opencode exposes `server_tool` (e.g. `graphify-foe-info_query_graph`).

---

## 2. Subagent Dispatch

- **Antigravity**: `invoke_subagent` with `TypeName`/`Role`/`Prompt`, or
  `define_subagent` from `.agents/agents/<name>.md`. Built-ins: `self`,
  `research`.
- **opencode**: `task` tool with `subagent_type: <name>`; the 36 specialists are
  thin shims in `.opencode/agents/<name>.md` that point back at the canonical
  persona in `.agents/agents/<name>.md`.

Role Markdown is reusable instruction content on both hosts; tool schemas and
the user's instruction govern dispatch. A skill that names an unavailable
`invoke_subagent` parameter must be adapted, not copied verbatim.

---

## 3. Parallel Isolation (Worktrees)

- **Antigravity**: `Workspace: "share"` (shared repo checkout via git worktree),
  `"branch"` (fully isolated clone/branch), `"inherit"` (parent cwd, default).
- **opencode**: no `Workspace` mode. Create an explicit worktree under
  `.worktrees/<branch>` and point each writer at its own checkout cwd. Use the
  `using-git-worktrees` skill.

---

## 4. Rules & Instructions Activation

- **Antigravity**: `.agents/rules/*.md` frontmatter `trigger: always_on`
  activates unconditionally; `glob` / `model_decision` / `manual` load
  contextually. Hierarchical `AGENTS.md`/`GEMINI.md` apply per directory scope.
- **opencode**: frontmatter triggers are not read. All 17 rules are injected via
  the `opencode.json` `instructions` glob (`.agents/rules/*.md`) plus
  `.opencode/instructions/*.md`; the agent decides applicability per task.
  Project `AGENTS.md` and global `~/.config/opencode/AGENTS.md` also apply.

---

## 5. Skills & Slash Commands

- **Antigravity**: skills are first-class slash commands (`/<skill-name>`), plus
  semantic auto-discovery from the `description`.
- **opencode**: skills are model-invoked through the `skill` tool; discovery is
  `**/SKILL.md` under `.opencode/skills`, `.claude/skills`, and
  `.agents/skills` (project walk-up) plus the `~/.config/opencode/skills`,
  `~/.claude/skills`, and `~/.agents/skills` globals. There is no implicit
  `/<skill>` command; use `.opencode/command/<name>.md` to add one.
- Frontmatter must satisfy opencode: `name` matches the directory and the regex
  `^[a-z0-9]+(-[a-z0-9]+)*$`, and `description` is 1-1024 characters.

---

## 6. Lifecycle Hooks

- **Antigravity**: `.agents/hooks.json` events `PreToolUse`, `PostToolUse`,
  `PreInvocation`, `PostInvocation`, `Stop`; handlers are shell commands with a
  stdin/stdout JSON contract.
- **opencode**: `.opencode/plugins/*.mjs`, registered in `opencode.json`
  `plugin[]`. Hook surface: `tool.execute.before|after`, `event`, `shell.env`,
  `experimental.session.compacting`, `tool`. There is no `PreInvocation` (bake
  guardrails into `.opencode/instructions/*.md`), no blocking `Stop`
  (`session.idle` is notification-only), and no `force_ask` (a before-hook can
  only throw; approvals come from `permission`).
- Shared enforcement logic lives once in `.agents/scripts/*.mjs` and is imported
  by the opencode plugins. Details and authoring steps: `writing-hooks` skill.

---

## 7. Plans & Artifacts

- **Antigravity**: repository files never take `ArtifactMetadata`; user-facing
  plans/diffs are written to `<appDataDir>/brain/<conversation-id>/`.
- **opencode**: no brain path. Keep implementation plans in `docs/plans/` and
  disposable analysis under the git-ignored `graphify-out/`. Do not invent an
  Antigravity artifact path.

---

## 8. Known Parity Limits

| Capability | Antigravity | opencode |
| :--- | :--- | :--- |
| Pre-invocation injection | `PreInvocation` hook | instructions files only |
| Block completion | `Stop` hook (`decision: continue`, `fullyIdle`) | `session.idle` notify-only |
| Approval semantics | `force_ask` / `permissionOverrides` | `permission` config (`allow`/`ask`/`deny`) |
| Parallel workspace mode | `Workspace: "share"|"branch"` | explicit `.worktrees/<branch>` |
| Skill slash command | native `/<skill>` | model-invoked only (or command file) |
