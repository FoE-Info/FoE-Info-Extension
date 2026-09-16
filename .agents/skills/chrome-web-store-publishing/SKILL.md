---
name: chrome-web-store-publishing
description: Prepare and validate Chrome Web Store submissions.
---

# Chrome Web Store Publishing

Prepare store metadata, privacy disclosures, permission justifications, and review-ready artifacts for an existing Chrome extension. This skill does not authorize upload, publication, or account actions.

## When to Use

- Preparing a new Chrome Web Store listing.
- Updating privacy, permissions, screenshots, or reviewer notes.
- Diagnosing a store rejection.

## Procedure

1. Verify the extension itself with `chrome-extensions` before preparing listing claims.
2. Read [Reference catalog](references/README.md).
3. Load `references/publishing-guide.md` for the complete listing and disclosure workflow.
4. Cross-check every permission justification against the current manifest and user-triggered behavior.
5. Ensure privacy claims match actual data collection, storage, transfer, and retention.
6. Run the package and release checks required by the repository.
7. Stop before upload or publication unless the user explicitly authorizes the external action.

## Deliverable

Return completed listing text, disclosure/permission rationale, artifact paths, verification output, and any unresolved review risk.
