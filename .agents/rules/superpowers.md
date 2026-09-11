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
3. **Follow the Skill Workflow**: Adhere strictly to the skill's defined sequence, checklist, or test-first requirement.

---

## 2. Skill Discovery & Routing Principles

- **Code Exploration**: Consult `graphify` / knowledge graph skills before manual searches.
- **Implementation**: Pair `test-driven-development` with domain specialists for calculations; use `add-rpc-service` / `service-extractor` for protocol handlers; use `add-feature-panel` / `ui-ux-pro-max` for UI.
- **Debugging & QA**: Follow `systematic-debugging` for defects; run `browser-testing` / `chrome-devtools` for runtime panel checks.
- **Workflow & Governance**: Use `writing-plans` for architecture, `subagent-driven-development` for parallel work, `unslop-commit` for commits, and `verification-before-completion` before finishing.

*(Consult `<skills>` catalog for complete runbooks and triggers).*

---

## 3. Red Flags & Rationalizations

Never skip skill consultation based on these internal excuses:
- *"This is just a simple question/check"* $\to$ Check `<skills>` before answering or searching.
- *"I need more context or need to explore first"* $\to$ Skills define how to gather context systematically.
- *"The skill is overkill or I remember it"* $\to$ Skills contain evolving checklists. Read current instructions.
- *"I'll just do this one quick thing first"* $\to$ Invariants require checking skills **BEFORE** taking action.

---

## 4. Precedence Hierarchy

1. **User Explicit Directives**: Always take highest priority.
2. **Workspace Rules (`.agents/rules/`)**: Always-on invariants strictly govern code safety and architecture.
3. **Skill Runbooks (`.agents/skills/`)**: Prescribe step-by-step procedures when active.
4. **Default Model Behavior**: Fallback only when no user directive, rule, or skill applies.
