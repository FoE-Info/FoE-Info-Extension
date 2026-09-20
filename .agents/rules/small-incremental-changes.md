---
trigger: always_on
description: Mandate small incremental edits (<100 lines), surgical blast radius, and stop-the-line debugging.
---

# Rule: Small and Incremental Changes

## Core mandates

Work in the smallest slice that can stand on its own. Around 100 lines per pass is the ceiling, not the goal.

Every increment leaves the codebase building, type-safe, and test-passing.

If a test, build, or runtime check fails, stop adding features and fix the cause first.

## Blast radius

Touch only what the task requires. Do not improve, reformat, or refactor adjacent code, comments, or styling just because you walked past it.

Clean up your own mess (orphaned imports, unused variables, dead helpers you created). Leave pre-existing dead code alone unless the user asked for it.

Every changed line should trace back to the user's request.

Prefer the direct implementation over a premature abstraction. If 50 lines would do instead of 200, or an approach is over-engineered, say so and write the simpler version. No speculative features, no configurability nobody asked for.

## Increment cycle

1. **Implement**: Minimal logic for the slice (<100 lines budget).
2. **Format**: Use `npm run format` (or `npx prettier --write <files>`). Never invoke unverified script names like `npm run fix:format`.
3. **Verify**: Run `npm test` and `npm run verify`.
4. **Synchronize Docs**: Update `docs/STATUS.md` and `docs/HANDOFF.md` to reflect completed items and active next slice.
5. **Checkpoint & Commit**: Request user approval and commit with an unslop commit message. Never leave dirty uncommitted work across session boundaries.
6. **Session Handoff**: If concluding the turn or increment, provide the exact copy-pasteable command/prompt to resume in a fresh session (e.g. `/boost Resume active modernization work from docs/HANDOFF.md and docs/STATUS.md.`).

## Stop the line

On a build failure, a broken test, or a runtime error:

1. Freeze. No new features.
2. Reproduce and localize. Get it into a minimal failing test, or trace it back to the upstream data provider.
3. Fix the root cause. No symptom patching, no sleep delays papering over a race, no swallowed errors.
4. Guard it with a regression test, verify a clean build and test run, then resume.
