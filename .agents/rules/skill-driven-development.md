---
trigger: always_on
description: Proactive skill-first execution loop requiring skill consultation and declaration before code modifications.
---

# Rule: Skill-Driven Development

Consult the specialized skills before starting non-trivial work, and say out loud which one you are following. This exists to stop eager-action mistakes, not to add ceremony.

## The skill-first invariant

Before you modify code, design architecture, debug, or refactor:

1. Check the `<skills>` catalog for a procedure covering the task.
2. Announce it: `Using [skill] to [purpose]`.
3. Follow the skill's sequence, checklist, or test-first requirement.

## Which skill for what

- Exploring code: `graphify`, or the knowledge graph skills, before manual searches.
- Implementing: domain specialists for calculations. `add-rpc-service` or `service-extractor` for protocol handlers. `add-feature-panel` or `ui-ux-pro-max` for UI.
- Debugging: `browser-testing` or `chrome-devtools` for runtime panel checks.
- Workflow: native `/plan` or `/grill-me` for design and architecture, `unslop-commit` for commits, `verification-before-completion` before you call anything finished.

The catalog has the complete list of runbooks and their triggers.

## Precedence

1. The user's explicit directive.
2. Workspace rules in `.agents/rules/`, which govern code safety and architecture.
3. Active skill runbooks from `.agents/skills/`.
4. Default model behavior, only when nothing above applies.
