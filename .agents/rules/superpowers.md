---
trigger: always_on
description: Proactive skill-first execution loop requiring skill consultation and declaration before code modifications.
---

# Rule: Superpowers & Skill-Driven Development

To ensure rigor, architectural consistency, and prevent eager-action mistakes, agents must actively consult available specialized skills (`<skills>`) before starting non-trivial development tasks.

---

## 1. The Skill-First Invariant

Before modifying code, designing architecture, debugging an issue, or refactoring:
1. **Consult `<skills>` Catalog**: Check whether a specialized procedure or runbook exists for the task.
2. **Announce Active Skill**: Explicitly declare before execution:
   > `"Using [skill] to [purpose]"`
3. **Follow the Skill Workflow**: If the skill defines a checklist, sequence, or test-first requirement (e.g., `test-driven-development`, `service-extractor`, `systematic-debugging`), adhere to it strictly.

---

## 2. Cognitive Routing Matrix (Skill $\to$ Subagent $\to$ Rule)

When approaching development tasks, route execution through the appropriate runbook, specialist, and governing invariant:

| Task Intent | Skill Runbook | Delegated Subagent | Governing Workspace Rule |
| :--- | :--- | :--- | :--- |
| **Codebase & Subsystem Exploration** | `graphify` / `call_mcp_tool` | `graph-knowledge-explorer` | [Knowledge Graph Integration](graphify.md) |
| **Requirements & Intent Alignment** | `brainstorming` | Primary / Orchestrator | [Small Incremental Changes](small-incremental-changes.md) |
| **Implementation Planning** | `writing-plans` | Primary / Orchestrator | [Small Incremental Changes](small-incremental-changes.md) |
| **Pure Algorithmic & Math Logic** | `test-driven-development` | `javascript-expert` / FoE Expert | [BigNumber Precision](bignumber-precision.md) |
| **InnoGames RPC Services** | `add-rpc-service` / `service-extractor` | `foe-game-data-expert` | [Monolith Containment](monolith-containment.md) |
| **UI Components & DevTools Cards** | `add-feature-panel` / `ui-ux-pro-max` | `ui-design-system-architect` | [i18n Compliance](i18n-compliance.md) |
| **Bug Fixing & Root-Cause Analysis** | `systematic-debugging` | Domain Specialist Subagent | [Small Incremental Changes](small-incremental-changes.md) |
| **Monolith Decomposition (`index.js`)** | `refactor-index-slice` | `monolith-refactoring-specialist` | [Modular Architecture](modular-architecture.md) |
| **Live Browser & CDP Diagnostics** | `browser-testing` / `chrome-devtools` | `cdp-test-engineer` | [Browser Hygiene](browser-environment-hygiene.md) |
| **Memory Leaks & Heap Snapshots** | `audit-memory-leaks` | `performance-memory-profiler` | [Browser Hygiene](browser-environment-hygiene.md) |
| **Parallel Independent Slices** | `subagent-driven-development` | Subagents (`Workspace: "share"`) | [Subagent Delegation](subagent-delegation.md) |
| **Pre-Merge Invariant Code Review** | `requesting-code-review` / `brooks-lint` | `code-reviewer` | All Workspace Rules |
| **Verification Gate & Proof** | `verification-before-completion` | Primary / Orchestrator | [Verification Before Completion](verification-before-completion.md) |
| **Conventional Commits & Release** | `unslop-commit` / `package-release` | `extension-release-engineer` | [Unslop Commits](unslop-commit.md) |
| **Agent Ecosystem Authoring** | `writing-skills` / `writing-agents` / `writing-rules` / `writing-hooks` | Primary / Customization Author | [Workspace Structure](workspace-structure.md) |

---

## 3. Red Flags & Rationalizations

These internal monologues mean **STOP** — you are rationalizing undisciplined execution:

| Rationalization | Reality & Correct Action |
| :--- | :--- |
| *"This is just a simple question"* | Questions are tasks. Check `<skills>` before answering. |
| *"I need more context first"* | Skill checks come **BEFORE** clarifying questions or searching. |
| *"Let me explore the codebase first"* | Skills tell you **HOW** to explore systematically without thrashing. |
| *"I can check git/files quickly"* | Files lack conversation context and invariants. Check skills first. |
| *"Let me gather information first"* | Skills define the information gathering standard. Consult first. |
| *"This doesn't need a formal skill"* | If a specialized runbook exists, using it is mandatory. |
| *"I remember this skill from before"* | Skills evolve and contain precise checklists. Read current instructions. |
| *"This doesn't count as a task"* | Any code or architecture action is a task. Check for skills. |
| *"The skill is overkill for this"* | Simple changes trigger regressions. The runbook prevents them. |
| *"I'll just do this one thing first"* | Invariants require checking skills **BEFORE** doing anything. |
| *"This feels productive"* | Undisciplined rapid action creates technical debt. Skills prevent it. |
| *"I know what that means conceptually"* | Knowing a concept is not following the runbook. Invoke and follow it. |

---

## 4. Precedence Hierarchy

1. **User Explicit Directives**: Specific instructions from the user always take highest priority.
2. **Workspace Rules (`.agents/rules/`)**: Always-on invariants strictly govern code safety and architectural constraints.
3. **Skill Runbooks (`.agents/skills/`)**: Prescribe step-by-step procedures when active.
4. **Default Model Behavior**: Fallback only when no user directive, rule, or skill applies.
