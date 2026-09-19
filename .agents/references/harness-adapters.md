# Antigravity Harness & Environment Reference

Operational reference for Antigravity-native execution across tools, subagent dispatch, workspace isolation, lifecycle hooks, and artifact management.

Canonical configuration lives under `.agents/`.

---

## 1. Tool Resolution & Primitives

| Action | Antigravity Tool | Operational Notes |
| :--- | :--- | :--- |
| Run commands | `run_command` | Execute commands in project root or subdirectories. Persistent terminals supported. |
| Read file | `view_file` | Slice viewing up to 800 lines; supports text and binary inspection. |
| Edit file | `replace_file_content` | Contiguous block replacement. Line numbers and exact target text required. |
| Create file | `write_to_file` | Create or overwrite files. Use `ArtifactMetadata` only in brain directories. |
| Text search | `run_command` (`git grep`) | Fast text search across tracked repository files. |
| Subagent dispatch | `invoke_subagent` | Dispatch project specialists (`TypeName`, `Role`, `Prompt`, `Workspace`). |
| Manage subagents | `manage_subagents` / `send_message` | List, query status, kill, or message running subagents. |
| MCP tools | `call_mcp_tool` / native tools | Eagerly loaded tools or lazy-loaded MCP tools via `call_mcp_tool`. |
| Browser tasks | OpenCLI (`opencli browser ...`) | Connected via local daemon on `19825`. Mandatory `--window background`. |
| Interactive input | `ask_question` | Structured multi-choice question prompts for user decisions. |

---

## 2. Subagent Dispatch & Isolation

- **Dispatch**: Use `invoke_subagent` with:
  - `TypeName`: Defined agent name (e.g. `foe-economy-analyst`, `research`, `self`, `code-reviewer`).
  - `Role`: 2-5 word job title.
  - `Prompt`: Specific, bounded task instructions with verification commands.
  - `Workspace`:
    - `"inherit"` (default): Shares current working directory.
    - `"share"`: Shared repo checkout via git worktree (ideal for independent branch work without duplicating disk space).
    - `"branch"`: Fully isolated clone/branch.

---

## 3. Rules & Instruction Scoping

- Frontmatter `trigger: always_on` activates unconditionally for all prompts.
- Frontmatter `trigger: model_decision` activates contextually based on task scope.
- Frontmatter `trigger: glob` activates when editing or inspecting matching file patterns.
- Directory-level instructions: `AGENTS.md` at workspace root sets project-wide boundaries.

---

## 4. Lifecycle Hooks (`.agents/hooks.json`)

Antigravity executes shell commands with a JSON stdin/stdout contract on key lifecycle events:

- `PreToolUse`: Evaluates tool calls before execution (e.g. `safety-gate.mjs` blocks destructive commands).
- `PreInvocation`: Injects transient context before agent reasoning (e.g. `pre-invocation-reminder.mjs`).
- `Stop`: Validates conditions before stopping execution (e.g. `stop-guard.mjs`).

---

## 5. Plans & Artifact Placement

- **User-facing artifacts**: Written to `<appDataDir>/brain/<conversation-id>/` using `write_to_file` with `ArtifactMetadata`.
- **Repository documentation**: Implementation plans, specs, and persistent architectural records live in `docs/plans/` and `docs/specs/`.
- **Scratch scripts**: Temporary one-off debug scripts belong in `<appDataDir>/brain/<conversation-id>/scratch/`.

