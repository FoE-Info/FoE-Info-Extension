---
trigger: model_decision
description: Requires fresh verification evidence and records grounded skill outcomes before completion.
---

# Rule: Verification Before Completion

No completion claim without fresh verification evidence.

Never say or imply that a task is finished, a bug is fixed, a build succeeds, or tests pass unless you ran the relevant command this turn and read the whole output.

## The gate

1. Identify the command that would prove the claim: `npm run verify` (or `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`).
2. Run it.
3. Read the exit code, error output, and failure counts from stdout and stderr.
4. Confirm the output actually supports the claim: zero errors, zero unexpected failures.
5. Confirm repository hygiene: formatting clean (`npm run check` passes), `docs/STATUS.md` and `docs/HANDOFF.md` updated, and git working tree clean or staged for commit.
6. Optional rule updates: When work reveals a novel, reusable constraint or fixes an operational defect, persist the lesson directly into `.agents/rules/` or recommend native `/learn`.
7. Only then tell the user, citing what you just ran and the commit/checkpoint state.

## Red flags

- Saying code "should work", "probably passes", or "looks good" without running it.
- Celebrating before the terminal agreed. No "Done!", no "Fixed!", no "Great!" until then.
- Trusting a subagent's success report without checking its diff or re-running the check.
- Quoting a test run from before your last edit.
