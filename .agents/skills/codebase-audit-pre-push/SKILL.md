---
name: codebase-audit-pre-push
description: 'Pre-push audit for dead code, logs, and security issues.'
---

# Codebase Audit Before Push

Run a bounded pre-push audit over the actual diff, repository gates, and release-sensitive surfaces. This skill does not authorize staging, committing, or pushing.

## When to Use

- Before a requested commit or push.
- After a broad refactor or release preparation.

## Procedure

1. Inspect branch, status, and scoped diff; distinguish pre-existing changes.
2. Map changed files to architecture, security, test, documentation, and release risks.
3. Run narrow tests first, then repository verification.
4. Scan added lines for credentials, unsafe execution, path escapes, and debug residue.
5. Confirm every claim against tool output and leave unrelated files untouched.
6. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for the complete audit matrix and report format.

## Verification

Return blockers, non-blocking findings, commands and exit codes, and the exact remaining side effects requiring user approval.
