---
trigger: always_on
description: Delegate bounded specialist work through the canonical subagent roster and target profiles.
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

Do not delegate merely to avoid a simple direct task, and do not let parallel writers modify the same checkout or files.
