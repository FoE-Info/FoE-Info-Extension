# Permissions Audit (Reversible Plan)

This document tracks current permissions and proposes staged, reversible changes.

## Scope

- Current source manifests:
  - src/chrome/manifest.json
  - src/chrome/manifest_release.json
  - src/chrome/manifest_firefox.json
- Current build target: Chrome first.

## Current Baseline (After Stage 1)

### permissions

- storage
- unlimitedStorage
- clipboardWrite
- webRequest

### host_permissions

- https://_.forgeofempires.com/game/_
- https://_.google.com/_
- https://\*.googleusercontent.com/
- https://discord.com/api/webhooks/*
- https://_.innogamescdn.com/_

## Proposed Staged Changes

Stage 1 is complete. Use the remaining sequence for future milestones.

### Stage 1: Remove legacy Discord domain if telemetry confirms no usage (Completed)

- Candidate removal:
  - host_permissions: https://discordapp.com/api/webhooks/*
- Reason:
  - Legacy domain; modern webhook endpoint is discord.com.
- Validation performed:
  - Runtime webhook defaults and examples in source were migrated to discord.com.
  - Source manifests no longer include discordapp.com host permissions.
  - Handler regression tests and type checks passed after change.
- Rollback:
  - Re-add exact host pattern in all source manifests.

### Stage 2: Narrow Google host patterns (if feature usage allows)

- Candidates to narrow/remove:
  - `host_permissions`: `https://*.google.com/*`
  - `host_permissions`: `https://*.googleusercontent.com/`
- Reason:
  - Broad host permissions increase warning surface.
- Validation before change:
  - Confirm exact Google APIs/endpoints used by sheets integration.
  - Replace with minimal concrete host patterns only after endpoint mapping.
  - Confirm user-configured sheet URLs are still supported by the narrowed scope.
- Rollback:
  - Re-add original wildcard hosts in all source manifests.

### Stage 3: Re-evaluate webRequest permission

- Candidate removal:
  - permissions: webRequest
- Reason:
  - If not used in extension contexts that require explicit webRequest API access.
- Validation before change:
  - Verify DevTools network listener path and confirm whether manifest webRequest is still required.
  - Full smoke test of request capture and message parsing.
- Rollback:
  - Re-add webRequest to permissions in all source manifests.

## Change Control Rules

- Apply permission updates in one dedicated commit per stage.
- Keep manifest.json, manifest_release.json, and manifest_firefox.json in sync unless a browser-specific exception is intentional and documented.
- Include explicit rollback notes in each PR description.
- If any smoke test fails, revert only the permission commit for that stage.
