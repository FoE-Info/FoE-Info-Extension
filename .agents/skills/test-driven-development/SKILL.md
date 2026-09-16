---
name: test-driven-development
description: 'Write failing unit tests before implementation code.'
---

# Test-Driven Development

Apply RED-GREEN-REFACTOR to one observable behavior at a time. A test that never failed does not prove it protects the requested behavior.

## When to Use

Use for production behavior changes, bug fixes, refactors, and new executable helpers.

## Procedure

1. Write one focused test describing the desired behavior.
2. Run it and confirm it fails for the missing behavior, not a test error.
3. Write the minimum implementation needed to pass.
4. Re-run the focused test, then affected tests.
5. Refactor only while green.
6. Repeat vertically for the next behavior; do not batch all tests before all implementation.
7. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for examples, anti-patterns, and troubleshooting.

## Verification

Record RED and GREEN commands, confirm no regressions, and state any behavior not covered.
