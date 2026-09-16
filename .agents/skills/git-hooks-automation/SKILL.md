---
name: git-hooks-automation
description: 'Configure and audit Husky and lint-staged git hooks.'
---

# Git Hooks Automation

Design and maintain repository hooks without silently changing contributor workflows. Prefer the project's existing hook mechanism and keep CI as the authoritative enforcement layer.

## When to Use

- Adding or debugging commit, push, or checkout hooks.
- Aligning local hooks with existing package scripts or CI checks.

## Procedure

1. Inventory the repository's current hook manager, package scripts, and CI gates.
2. Define the event, failure policy, runtime budget, and bypass policy.
3. Call existing scripts instead of duplicating lint or test logic in a hook.
4. Keep hooks deterministic, non-interactive, and secret-free.
5. Exercise success, expected failure, missing-tool, and bypass behavior in isolation.
6. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for implementation variants and migration details.

## Verification

Prove installation and behavior in a disposable Git repository before changing the live workflow.
