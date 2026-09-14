---
trigger: always_on
description: Proactively delegate domain, UI, QA, and review tasks to the 36 specialized subagents via invoke_subagent.
---

# Rule: Proactive Subagent Delegation

The workspace maintains 36 specialized domain subagents in 4 squads (FoE Game Domain, Extension Architecture/QA, Web Engineering, Knowledge Graphs), registered under `.agents/agents/` and discoverable via `<subagents>`. The primary agent acts as orchestrator and tech lead, delegating role-matched work via `invoke_subagent` rather than doing everything in one thread.

Routing table: [subagent-routing.md](../references/subagent-routing.md). Agent names and full prompt descriptions: `<subagents>` catalog.

## Delegation protocol

Before you modify code or dig into a domain question, check whether a specialist covers it. If one does, hand the slice to that specialist.

If the specialist is not pre-registered as an active type in `<subagents>` (Antigravity runtime resolution):

1. Define it dynamically with `define_subagent`, using the frontmatter and prompt from `.agents/agents/<name>.md`.
2. Or invoke `self` with `Role: "<name>"` and that specialist's system prompt.

## When the main agent executes directly

The main agent is permitted, and expected, to do the work itself when:

1. No subagent fits. The task falls outside the 36 defined roles.
2. Workspace and agent meta-engineering. Maintaining `.agents/` configuration, `AGENTS.md`, rules, skills, lifecycle hooks, and project documentation.
3. Cross-squad orchestration and synthesis. Multi-domain coordination where splitting into single-domain subagents would cause thrashing or architectural fragmentation.
4. Pipeline and gate verification. Routine terminal commands (`npm test`, `npm run verify`, `git diff`, `git status`) and the reports that come out of them.
5. Parallel feature development. When running 2 or more independent coding tasks at once, dispatch subagents with `Workspace: "share"` so each gets its own git worktree under `.worktrees/` and nobody collides on dirty state.
