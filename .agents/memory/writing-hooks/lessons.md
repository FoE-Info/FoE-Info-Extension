# Lessons

## 2026-09-13

- Deleting a hook, plugin, or script requires pruning every reference in the same change: tests, docs, rules, and references/ files. The obsolete-path test only catches protocol paths, so grep the deleted filename before committing.
