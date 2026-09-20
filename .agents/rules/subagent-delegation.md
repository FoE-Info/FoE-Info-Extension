---
trigger: model_decision
description: Delegate bounded specialist work through the canonical subagent roster.
---

# Rule: Proactive Subagent Delegation

Before deep investigation, implementation, or review, check whether a canonical project subagent owns a bounded part of the task.

1. Read [subagent-routing.md](../references/subagent-routing.md).
2. Delegate when a specialist can produce an independent artifact or verdict without owning orchestration.
3. Include the exact scope, files, constraints, expected output, and verification in the dispatch.
4. For profile-driven agents, name the graph, comparison, or mechanics profile explicitly.
5. Keep final integration, requirement reconciliation, and completion verification with the main agent.
6. Verify a subagent's claims from the actual diff, files, or command output before accepting them.

Dispatch via Antigravity's native `invoke_subagent` per [Environment Reference](../references/antigravity-environment.md).

### Subagent Execution Capabilities & Write Invariant
- **Read-Only Default**: Predefined subagents launched via `invoke_subagent` inherit read-only inspection tools by default.
- **Verification & Command Execution**: When delegating work that requires running shell commands, executing tests, or modifying files:
  1. Delegate via `invoke_subagent` using `TypeName: "self"` with `Role: "<subagent-name>"` and the specialist's system instructions, which inherits all parent write and command tools (`run_command`, `replace_file_content`, `write_to_file`).
  2. Or define dynamically via `define_subagent` with `enable_write_tools: true`.

Do not delegate merely to avoid a simple direct task, and do not let parallel writers modify the same checkout or files.
