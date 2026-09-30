---
trigger: model_decision
description: Splitting changes into logical commits and writing evidence-based commit messages.
---

# Commit style

Follow [CONTRIBUTING.md](../../CONTRIBUTING.md#commit-messages) and the
problem-first prose used in repository history before `30c2bce`.

- Split work by one reason to change. A request to commit everything means
  several focused commits when the work has several purposes; use one combined
  commit only when explicitly requested. Order dependent changes coherently.
- Keep implementation, its focused tests, and relevant task/design updates
  together. Put generated Graphify snapshots in a separate refresh commit.
- Use `type(scope): imperative summary`, with a scope when it clarifies the
  affected feature. Keep the subject concrete, lowercase after the colon, and
  within 72 characters. Avoid umbrella subjects and lists of unrelated features.
- Write connected paragraphs: describe the concrete failure or limitation,
  explain the resulting behavior and why that remedy fits, then state relevant
  verification and limitations. Small changes need only a short paragraph.
- Use measured numbers and implementation details only when they explain the
  outcome. Avoid bullet inventories, task-ID dumps, canned introductions,
  marketing language, and artificial line breaks that interrupt sentences.
- Wrap prose at 72 columns between words. Run the commit-message validator;
  satisfy the hooks rather than bypassing them.
- Report only checks that ran. Distinguish validation of a combined working tree
  from validation of an isolated commit, and local results from browser or CI
  evidence. Generated artifacts need provenance, not invented behavior tests.
- Inspect staged changes and stage exact paths. Preserve unrelated work, run
  the required gate before each commit, and inspect the remaining tree afterward.
