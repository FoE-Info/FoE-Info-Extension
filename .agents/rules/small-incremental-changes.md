---
trigger: always_on
description: Mandate small incremental edits (<100 lines), surgical blast radius, and stop-the-line debugging.
---

# Rule: Small & Incremental Codebase Changes

## 1. Core Mandates
1. **Smallest Workable Slice**: Never implement large features in a single pass. Limit modifications to ~100 lines or less per pass.
2. **Working State Invariant**: Every completed increment must leave the codebase building, type-safe, and test-passing.
3. **Stop-the-Line Rule**: If a test, build, or runtime check fails, freeze feature additions immediately and resolve root causes before proceeding.

---

## 2. Surgical Blast Radius (Karpathy Invariants)
1. **Touch Only What You Must**: Never "improve", reformat, or refactor adjacent unrelated code, comments, or styling simply because you encountered them.
2. **Clean Up Only Your Own Mess**: If your changes introduce orphaned imports, unused variables, or dead helpers, remove them immediately. Do NOT touch pre-existing dead code unless explicitly requested.
3. **Traceability**: Every single changed line in the git diff must trace directly back to the user's explicit request.
4. **Simplicity First**: Prefer direct, naive implementations over premature abstractions. If an approach is over-engineered or 50 lines would do instead of 200, push back and rewrite it simply. No speculative features or configurability.

---

## 3. Increment Cycle & Slicing
1. **Implement**: Code minimal logic required for the current slice.
2. **Verify & Test**: Run `npm test` and type/build checks.
3. **Checkpoint**: Commit or save progress with a clear, concise message.
4. **Next Slice**: Proceed to the next increment on top of green checks.

---

## 4. Stop-the-Line Protocol
On build failure, test breakage, or runtime error:
1. **Freeze**: Stop adding new features immediately.
2. **Reproduce & Localize**: Isolate into a minimal failing test or trace to upstream data providers.
3. **Fix Root Cause**: Eliminate defect at its source without symptom patching, artificial sleep delays, or swallowed errors.
4. **Guard**: Add a regression test, verify clean build/tests, then resume.
