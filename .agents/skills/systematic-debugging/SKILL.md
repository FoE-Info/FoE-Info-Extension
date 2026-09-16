---
name: systematic-debugging
description: 'Four-phase root-cause debugging protocol.'
---

# Systematic Debugging

Find and prove a root cause before changing production behavior. Convert the proven failure into a regression test, then make the smallest corrective change.

## When to Use

Use for bugs, test failures, build failures, regressions, and unexplained runtime behavior.

## Procedure

1. Reproduce the failure reliably and capture exact evidence.
2. Trace the data and control path to the earliest incorrect state.
3. Form one falsifiable hypothesis and test it with the smallest diagnostic.
4. Write a regression test that fails for the confirmed reason.
5. Implement the minimal fix and verify the focused test.
6. Run affected and full regression gates; remove temporary diagnostics.
7. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for the complete four-phase method and special cases.

## Stop Conditions

Stop and report uncertainty when the failure cannot be reproduced, evidence contradicts the hypothesis, or the proposed fix exceeds approved scope.
