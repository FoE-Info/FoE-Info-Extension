---
trigger: always_on
description: Proactively delegate domain, UI, QA, and review tasks to the 36 specialized subagents via invoke_subagent.
---

# Rule: Proactive Subagent Delegation

The workspace maintains a roster of 36 specialized domain subagents across 4 squads (FoE Game Domain, Extension Architecture/QA, Web Engineering, and Knowledge Graphs) registered under `.agents/agents/` and discoverable via `<subagents>`. The primary agent acts as orchestrator and tech lead, proactively delegating tasks matching domain expertise via `invoke_subagent` rather than executing everything in a single thread.

---

## 1. Squad Domains

- **FoE Game Mechanics & Data (15)**: Math, calculations, game data, and combat analysts.
- **Extension Architecture, Security & QA (9)**: CDP testing, security audits, code reviews, and releases.
- **Web Engineering & UI (4)**: Bootstrap 5.3 layouts, TypeScript, JavaScript, and Webpack.
- **Knowledge Graphs & Architecture (8)**: Graphify navigation, refactoring, and peer comparisons.

*(See `<subagents>` catalog for individual agent names, roles, and full prompt descriptions).*

---

## 2. Delegation & Execution Protocol

### A. Role Match Check (Delegation First)
- Before executing code modifications or deep investigations, check whether the task fits any of the 36 specialized subagents in `<subagents>` or `.agents/agents/` (e.g. Bootstrap UI, Great Buildings math, RPC network handlers, CDP browser testing).
- **If a subagent role fits**: The main agent must act as Tech Lead / Orchestrator and delegate the execution slice to that specialist via `invoke_subagent`.
- **Runtime Resolution in Antigravity**: If the specialist is not pre-registered as an active type in `<subagents>`, either:
  1. Define it dynamically via `define_subagent` using the frontmatter and prompt from `.agents/agents/<name>.md`.
  2. Or invoke `self` with `Role: "<name>"` and the specialist's system prompt instructions.

### B. When the Main Agent Executes Directly
The main agent is explicitly permitted and expected to execute tasks directly when:
1. **No Subagent Fits**: The task falls outside the defined roles of the 36 specialists.
2. **Workspace & Agent Meta-Engineering**: Maintaining `.agents/` configurations, `AGENTS.md`, rules, skills, lifecycle hooks, and project documentation.
3. **Cross-Squad Orchestration & Synthesis**: Multi-domain coordination where separating into single-domain subagents would cause thrashing or architectural fragmentation.
4. **Pipeline & Gate Verification**: Running routine terminal verification commands (`npm test`, `npm run verify`, `git diff`, `git status`) and synthesizing reports for the user.
5. **Parallel Feature Development**: When executing 2+ independent coding tasks simultaneously, always dispatch subagents with `Workspace: "share"` so each agent operates in an isolated git worktree under `.worktrees/` without dirty-state collisions.
