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
5. For each project skill or subagent actually used, record the grounded outcome:
   ```sh
   node .agents/scripts/skill-memory.mjs log \
     --skill <name> \
     --outcome pass|fail|partial \
     --signal "<verification command>" \
     [--lesson "<verified reusable rule + why>"]
   ```
   Add `--lesson` only when evidence revealed reusable guidance. The helper
   deduplicates and promotes a novel lesson into the canonical definition.
6. Only then tell the user, citing what you just ran.

See [Skill Work Log & Memory](../references/skill-memory.md) for persistence,
promotion, synchronization, and curation details.

## Red flags

- Saying code "should work", "probably passes", or "looks good" without running it.
- Celebrating before the terminal agreed. No "Done!", no "Fixed!", no "Great!" until then.
- Trusting a subagent's success report without checking its diff or re-running the check.
- Quoting a test run from before your last edit.
