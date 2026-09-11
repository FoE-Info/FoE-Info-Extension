---
trigger: always_on
description: Mandate small incremental edits (<100 lines), continuous test/build verification, and stop-the-line debugging.
---

# Rule: Small & Incremental Codebase Changes

## 1. Core Mandates
1. **Smallest Workable Slice**: Never implement large features in a single pass. Limit modifications to ~100 lines or less per pass.
2. **Working State Invariant**: Every completed increment must leave the codebase building, type-safe, and test-passing.
3. **Stop-the-Line Rule**: If a test, build, or runtime check fails, freeze feature additions immediately and resolve root causes before proceeding.

## 2. Increment Cycle & Slicing
1. **Implement**: Code minimal logic required for the current slice.
2. **Verify & Test**: Run `npm test` and type/build checks.
3. **Checkpoint**: Commit or save progress with a clear, concise message.
4. **Next Slice**: Proceed to the next increment on top of green checks.
- **Rule 0 (Simplicity First)**: Prefer direct, naive implementations over premature abstractions. Never engineer for speculative future needs.

## 3. Stop-the-Line Protocol
On build failure, test breakage, or runtime error:
1. **Freeze**: Stop adding new features immediately.
2. **Reproduce & Localize**: Isolate into a minimal failing test or trace to upstream data providers.
3. **Fix Root Cause**: Eliminate defect at its source without symptom patching, artificial sleep delays, or swallowed errors.
4. **Guard**: Add a regression test, verify clean build/tests, then resume.

