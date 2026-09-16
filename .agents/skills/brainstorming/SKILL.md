---
name: brainstorming
description: 'Explore requirements, user intent, and architecture options.'
---

# Brainstorming Ideas Into Designs

Turn an idea into an approved spike, bounded design, or architectural specification before implementation begins.

## Procedure

1. Inspect current project context and classify the request as spike, bounded, or architectural.
2. State the classification so the user can correct it.
3. Ask only questions that change scope, behavior, interfaces, or acceptance criteria.
4. For a spike, agree on the probe and report a recommendation; discard throwaway code.
5. For bounded work, present a short in-chat design and wait for explicit approval.
6. For architectural work, compare approaches, obtain section-by-section approval, write the specification, and route next to `writing-plans`.
7. Upgrade the path if hidden complexity appears; never silently downgrade it.
8. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for the full approval flow, visual companion policy, and examples.

## Stop Conditions

Stop before implementation until the selected path's approval gate is satisfied. Stop and decompose work when one specification cannot bound the independent subsystems.
