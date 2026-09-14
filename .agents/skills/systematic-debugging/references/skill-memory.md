# Skill Work Log & Memory

Every skill and subagent can accumulate evidence about its own usage. Two files
under `.agents/memory/<name>/` hold it:

| File           | Format      | Written by | Purpose                                        |
| -------------- | ----------- | ---------- | ---------------------------------------------- |
| `worklog.jsonl` | JSON Lines | `skill-memory.mjs log` | One object per run: outcome, ground signals, lesson |
| `lessons.md`   | Markdown   | `skill-memory.mjs log` (dedupes) | Prose lessons folded into one dated list |

Both are additive. The worklog keeps every run for statistics; `lessons.md`
keeps one copy of each distinct lesson so a reader is not re-taught the same
failure.

## Recording a run

```bash
node .agents/scripts/skill-memory.mjs log \
  --skill <name> \
  --outcome pass|fail|partial \
  [--task <id>] \
  [--signal "<ground command>"]... \
  [--lesson "<what the failure taught>"] \
  [--note "<context>"]
```

- `--outcome` must be `pass`, `fail`, or `partial`. `fail` is the useful one —
  a skill only improves if its failures land in the log.
- `--signal` records the *grounded* check you actually ran (a test command, a
  lint, a script exit code). Prefer exit-code-bearing commands; a signal that
  cannot fail carries no information.
- `--lesson` is the durable takeaway. Write it as an imperative rule with the
  reason attached, not as a narration of what happened. The script rejects
  duplicates, so re-running a task does not bloat `lessons.md`.

## Reading memory before acting

```bash
node .agents/scripts/skill-memory.mjs lessons --skill <name>   # prior lessons
node .agents/scripts/skill-memory.mjs stats                    # run/failure counts
```

Load `lessons.md` when starting work a skill covers: the prior failure is
cheaper to read than to rediscover.

## The self-improvement loop

The skill memory layer is the persistence half of a Generator → Reflector →
Curator loop:

1. **Generator** — the skill (or the subagent following it) produces an attempt.
2. **Reflector** — a grounded check runs: the tests, linter, or script named in
   the skill's own verification section. No verdict without a signal.
3. **Curator** — `skill-memory.mjs log --outcome fail --lesson '<rule>'`
   records it, then the skill's `SKILL.md` is patched with the same rule. The
   worklog is the audit trail; `SKILL.md` is what the next run actually reads.

A lesson recorded only in the worklog never changes behaviour. Patch the skill
and log the run in the same change — that pairing is what makes the loop
converge instead of merely accumulating notes.

## Promotion signal

`stats` exposes the pattern worth acting on:

- Repeated `fail` for one skill with the same lesson → the lesson has not been
  written into `SKILL.md` yet. Do that first.
- A skill whose failures all fall in one narrow area → that area is a candidate
  for its own reference file (progressive disclosure), not a longer SKILL.md.
- Sustained `pass` with no new lessons → the skill is stable; leave it alone.
