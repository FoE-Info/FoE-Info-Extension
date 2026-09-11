# Antigravity CLI (`agy`) & Desktop Tool Mapping

Skills describe abstract agent actions ("dispatch a subagent", "edit code", "run tests", "track plan progress"). On Google Antigravity, these map to the native tools below.

## Tool Resolution Table

| Abstract Action | Antigravity Native Tool | Notes & Conventions |
| :--- | :--- | :--- |
| **Dispatch Subagent** | `invoke_subagent` | Use built-in (`self`, `research`) or the 29 repository specialists in `.agents/agents/*.md` (e.g. `code-reviewer`). |
| **Subagent Messaging** | `send_message` | Send follow-up tasks or queries to a subagent using its `conversationId`. Never use to message the user. |
| **Subagent Management** | `manage_subagents` | Actions: `list` (inspect active subagents), `kill` (terminate specific subagent), `kill_all`. |
| **Background Processes** | `manage_task` | Inspect/control background commands (`list`, `status`, `send_input`, `kill`). Not a checklist tool. |
| **Timers & Cron** | `schedule` | Schedule one-shot notifications (`DurationSeconds`, `TimerCondition`) or recurring schedules (`CronExpression`). |
| **Command Execution** | `run_command` | Execute commands synchronously or in background. Governed by PreToolUse safety hooks. |
| **File Reading** | `view_file` | Read files with line-range slicing. |
| **File Editing** | `replace_file_content` | Surgical replacements. Exact line matches with `<100` lines per slice. |
| **File Creation** | `write_to_file` | Create new files. Set `Overwrite: true` to overwrite existing files. |
| **Code Search** | `grep_search` / `find_by_name` | Ripgrep-based text search and fd-based file name search. Query knowledge graphs first if available. |

---

## Artifact vs. Code Boundaries

Antigravity enforces strict artifact boundaries:
- **Repository Files (`src/`, `.agents/`, `tests/`)**: NEVER pass `ArtifactMetadata` to `write_to_file`. Doing so triggers an authorization error.
- **Brain Artifacts (`<appDataDir>/brain/<conversation-id>/...`)**: Always pass `ArtifactMetadata` with `Summary`, `UserFacing`, and `RequestFeedback` when generating user-facing plans, diffs, or reports.

---

## Task & Plan Tracking

When a skill prescribes tracking plan tasks:
1. Maintain checkboxes (`- [ ]`, `- [x]`) in implementation plans under `docs/superpowers/plans/` or ephemeral task summaries.
2. Edit progress incrementally using `replace_file_content`.
3. Do not confuse task tracking with `manage_task` (which is exclusively for background process control).
