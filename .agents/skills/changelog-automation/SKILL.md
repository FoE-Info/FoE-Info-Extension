---
name: changelog-automation
description: 'Generate release notes from commits and pull requests.'
---

# Changelog Automation

Patterns and tools for automating changelog generation, release notes, and version management following industry standards.

## Use this skill when

- Setting up automated changelog generation
- Implementing conventional commits
- Creating release note workflows
- Standardizing commit message formats
- Managing semantic versioning

## Do not use this skill when

- The project has no release process or versioning
- You only need a one-time manual release note
- Commit history is unavailable or unreliable

## Instructions

- Select a changelog format and versioning strategy.
- Enforce commit conventions or labeling rules.
- Configure tooling to generate and publish notes.
- Review output for accuracy, completeness, and wording.
- If detailed examples are required, open `references/implementation-playbook.md`.

## Safety

- Avoid exposing secrets or internal-only details in release notes.

## Resources

- `references/implementation-playbook.md` for detailed patterns, templates, and examples.

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

