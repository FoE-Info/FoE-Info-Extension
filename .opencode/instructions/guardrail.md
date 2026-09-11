# Workspace guardrail reminder (monolith-guardrail parity)

Baked into instructions because opencode has no PreInvocation hook event;
the source of truth is `.agents/scripts/pre-invocation-reminder.mjs`.

Before acting on this task, check fit against the 36 subagents in
`.agents/agents/` (thin shims in `.opencode/agents/`). If a
domain/UI/math/QA specialist matches, delegate via the Task tool
(`subagent_type: <name>`). If the task does NOT fit any subagent role
(meta-agent config, cross-squad, general tasks), execute directly as main
agent.

Always consult the available-skills catalog (`.agents/skills/`) and announce
the active skill (`Using [skill] to [purpose]`) before code execution. Verify
with fresh terminal evidence before completion, query Graphify before wide
searches, keep slices <= 100 lines and files <= 600 lines, preserve BigNumber
precision, and never bundle static game metadata into runtime source code.
