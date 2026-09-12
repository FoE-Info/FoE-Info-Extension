# Antigravity → opencode tool translation

Canonical content in `.agents/skills/`, `.agents/rules/`, and `.agents/agents/`
was authored for Antigravity and uses tool names opencode does not expose. When
loaded content uses a token below, translate it — never emit the literal
Antigravity call.

| Antigravity token                          | opencode equivalent                                               |
| :----------------------------------------- | :---------------------------------------------------------------- |
| `run_command` / `CommandLine`              | `bash`                                                            |
| `view_file`                                | `read`                                                            |
| `replace_file_content` / `write_to_file`   | `edit` / `write`                                                  |
| `grep_search` / `find_by_name`             | `grep` / `glob`                                                   |
| `invoke_subagent <TypeName>`               | `task` tool with `subagent_type: <name>`                          |
| `define_subagent`                          | create a `.opencode/agents/<name>.md` shim; no runtime define     |
| `call_mcp_tool`                            | call the MCP tool directly (`<server>_<tool>`)                    |
| `Workspace: "share"` / `"branch"`          | create a worktree under `.worktrees/<branch>`; set the writer cwd |
| `ArtifactMetadata` / `<appDataDir>/brain/` | plans in `docs/plans/`; scratch in git-ignored `graphify-out/`    |
| `PreInvocation` / `Stop` / `force_ask`     | unavailable; see `writing-hooks/references/opencode-plugins.md`   |

The full dual-harness mapping (subagent dispatch, worktree isolation, rules
activation, skills/slash, hooks, artifacts) is authored once in
[`.agents/references/harness-adapters.md`](../../.agents/references/harness-adapters.md);
load it when a skill step differs by harness.

Known source files carrying these tokens (adapt on load):

- Skills: `audit-memory-leaks`, `codebase-modernization-planner`,
  `modern-web-guidance`, `requesting-code-review`, `subagent-driven-development`,
  `writing-agents`, `writing-hooks`.
- Rules: `graphify`, `subagent-delegation`, `workspace-structure`.
- Agents: `codebase-modernization-architect`, `code-reviewer`.

When an Antigravity-only step cannot be reproduced, choose the opencode
equivalent or report the gap; do not fabricate the missing tool.
