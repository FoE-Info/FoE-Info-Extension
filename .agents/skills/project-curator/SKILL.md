---
name: project-curator
description: 'Audit and curate shared skills from grounded usage.'
---

# Project Curator

Maintain the Git-tracked `.agents/` library shared by Antigravity, OpenCode,
Hermes, Codex, and Claude. Deterministic checks may promote already-recorded
lessons; deletion, merging, archiving, and semantic rewrites require human review.

## When to Use

- Reviewing skill and subagent usage, stale entries, or duplicated guidance.
- Repairing stored lessons that were logged but not promoted into definitions.
- Running a periodic, read-only health check over the shared `.agents/` library.

Do not use this skill to maintain profile-local Hermes skills. Do not create a
second writable copy of `.agents/skills/` under another harness.

## Commands

Run from the repository root:

```sh
npm run curator:status
npm run curator:run
npm run curator:apply
npm run test:agents
```

- `curator:status` and `curator:run` are read-only JSON audits.
- `curator:apply` promotes stored lessons missing from their canonical definition.
- No command deletes, merges, archives, or rewrites duplicate/stale definitions.

## Procedure

1. Run `npm run curator:status` and inspect `counts`, `usage`, `candidates`, and
   `warnings`. Stop on malformed markers, duplicate definition names, symlinks,
   or paths escaping `.agents/`.
2. Treat `missingStoredLessons` as a repair queue. Confirm each lesson came from
   grounded task evidence, then run `npm run curator:apply`; verify
   `lessonsPromoted` and `changedDefinitions` match the intended scope.
3. Treat `duplicateLessons` and `duplicateReferences` as exact-match leads, not
   automatic merge instructions. Compare triggers, responsibilities, and users;
   preserve separate writing-* skills and any skills with distinct triggers.
4. Treat `staleDefinitions` as review candidates only. Check Git history and
   current host registrations before proposing removal. Never create archive or
   backup copies in the repository; Git history is the recovery mechanism.
5. For semantic overlap not detectable by exact hashes, dispatch independent
   reviewers with the candidate definitions as data. Produce a proposed patch
   and rationale; do not apply a merge, deletion, or broad rewrite without user
   approval.
6. After any approved change, run `npm run test:agents`, then inspect
   `git diff -- .agents package.json tests/agents docs`. Every changed file must
   be intentional and no unrelated workspace changes may be staged or reverted.

## Periodic Operation

Automation must run `npm run curator:status` only. It may report candidates, but
must not call `curator:apply` or mutate lifecycle state unattended. Apply repairs
in an interactive session where the resulting diff and tests can be reviewed.

## Pitfalls

- A worklog or lessons journal is evidence; future behavior changes only when the
  canonical skill or subagent definition contains the rule.
- Exact duplicate text does not prove two skills have the same trigger or owner.
- A definition with no valid usage timestamp is untracked, not automatically stale.
- `--stale-days 0` intentionally marks every tracked definition with a past
  timestamp as stale; it still performs no mutation.

## Verification

Completion requires all of the following:

- `npm run curator:status` exits zero and emits valid JSON.
- `npm run test:agents` passes.
- `npm run curator:apply` is idempotent when repeated.
- The scoped Git diff contains no deletion, merge, archive, or unrelated change
  unless explicitly approved.

<!-- skill-memory:lessons:start -->
## Learned Improvements

<!-- skill-memory:lessons:end -->
