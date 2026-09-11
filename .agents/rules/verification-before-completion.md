---
trigger: always_on
description: Mandates fresh terminal verification evidence before claiming task completion or test success.
---

# Rule: Verification Before Completion

## 1. The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

Never state, imply, or assume that a task is finished, a bug is fixed, a build succeeds, or tests pass without having executed the relevant verification command in the current turn and inspected the full output.

---

## 2. The Verification Gate

Before declaring success or claiming any completed status:
1. **IDENTIFY**: What command or test specifically proves the claim? (e.g. `npm test`, `npm run verify`, `npm run check`, `npm run i18n:check`, `npm run build:dev`).
2. **RUN**: Execute the complete verification command in the terminal.
3. **READ**: Inspect the exit code, error logs, and failure counts directly from stdout/stderr.
4. **VERIFY**: Confirm that the actual terminal output confirms the claim with 0 errors and 0 unexpected failures.
5. **ONLY THEN**: Make the claim to the user, citing the fresh evidence.

---

## 3. Prohibited Red Flags

- Claiming code "should work", "probably passes", or "looks good" without executing it.
- Expressing satisfaction ("Done!", "Great!", "Fixed!") before terminal verification.
- Trusting subagent success reports without checking the output diff or re-verifying.
- Relying on previous test runs when subsequent code edits have been made.
