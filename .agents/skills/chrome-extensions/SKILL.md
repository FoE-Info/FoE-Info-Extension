---
name: chrome-extensions
description: 'Manifest V3 lifecycle, service workers, and packaging.'
---

# Chrome Extensions

Build and debug Manifest V3 Chrome extensions with correct permissions, lifecycle, messaging, storage, and browser API usage. Store listing and submission work belongs to `chrome-web-store-publishing`.

## When to Use

- Creating or changing extension manifests, service workers, content scripts, side panels, popups, messaging, or Chrome APIs.
- Diagnosing extension runtime and permission behavior.

## Procedure

1. Identify the extension context and minimum required permissions.
2. Load [Reference catalog](references/README.md) and only the API references needed by the task.
3. Load `references/development-guide.md` for the complete Manifest V3 implementation workflow.
4. Implement explicit lifecycle, messaging, storage, and error behavior.
5. Check `references/output-checklist.md` before delivery.
6. Verify in Chrome plus repository tests; do not infer runtime behavior from build success alone.

## Invariants

- No remote executable code or unsafe `eval`.
- Service-worker state must survive suspension through supported storage.
- Permissions and host access remain least-privilege.
- User-triggered actions remain explicit and error handling is observable.
