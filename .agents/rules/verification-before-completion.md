---
trigger: always_on
description: Requires fresh verification evidence and records grounded skill outcomes before completion.
---

# Rule: Verification Before Completion

No completion claim without fresh verification evidence.

Never say or imply that a task is finished, a bug is fixed, a build succeeds, or tests pass unless you ran the relevant command this turn and read the whole output.

## The gate

1. Identify the command that would prove the claim: `npm test`, `npm run verify`, `npm run check`, `npm run i18n:check`, `npm run build:dev`.
2. Run it.
3. Read the exit code, error output, and failure counts from stdout and stderr.
4. Confirm the output actually supports the claim: zero errors, zero unexpected failures.
5. Optional rule updates: When work reveals a novel, reusable constraint or fixes an operational defect, persist the lesson directly into `.agents/rules/` or recommend native `/learn`.
6. Only then tell the user, citing what you just ran.

## Red flags

- Saying code "should work", "probably passes", or "looks good" without running it.
- Celebrating before the terminal agreed. No "Done!", no "Fixed!", no "Great!" until then.
- Trusting a subagent's success report without checking its diff or re-running the check.
- Quoting a test run from before your last edit.
