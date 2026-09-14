---
name: github
description: 'Use gh CLI for issues, PRs, checks, and GitHub queries.'
---

# GitHub Skill

Use the `gh` CLI to interact with GitHub. Always specify `--repo owner/repo` when not in a git directory, or use URLs directly.

## When to Use

- When the user asks about GitHub issues, pull requests, workflow runs, or CI failures.
- When you need `gh issue`, `gh pr`, `gh run`, or `gh api` from the command line.

## Pull Requests

Check CI status on a PR:

```bash
gh pr checks 55 --repo owner/repo
```

List recent workflow runs:

```bash
gh run list --repo owner/repo --limit 10
```

View a run and see which steps failed:

```bash
gh run view <run-id> --repo owner/repo
```

View logs for failed steps only:

```bash
gh run view <run-id> --repo owner/repo --log-failed
```

### Debugging a CI Failure

Follow this sequence to investigate a failing CI run:

1. **Check PR status** — identify which checks are failing:
   ```bash
   gh pr checks 55 --repo owner/repo
   ```
2. **List recent runs** — find the relevant run ID:
   ```bash
   gh run list --repo owner/repo --limit 10
   ```
3. **View the failed run** — see which jobs and steps failed:
   ```bash
   gh run view <run-id> --repo owner/repo
   ```
4. **Fetch failure logs** — get the detailed output for failed steps:
   ```bash
   gh run view <run-id> --repo owner/repo --log-failed
   ```

## API for Advanced Queries

The `gh api` command is useful for accessing data not available through other subcommands.

Get PR with specific fields:

```bash
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'
```

## JSON Output

Most commands support `--json` for structured output. You can use `--jq` to filter:

```bash
gh issue list --repo owner/repo --json number,title --jq '.[] | "\(.number): \(.title)"'
```

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
## 5. Record Usage in the Skill Work Log

A skill that only accumulates notes never changes behaviour. Record each real
run and fold the lesson back into this file:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> \
  --outcome pass|fail|partial \
  --lesson '<imperative rule + why>'
```

`--outcome` is `pass`, `fail`, or `partial`, and every `--signal` is a command
that can actually fail. Patch the workflow above with the lesson in the same
change — the worklog is the audit trail, `SKILL.md` is what the next run reads.
See [Skill Work Log & Memory](references/skill-memory.md) for the full loop.

