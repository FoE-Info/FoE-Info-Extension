# FoE-Info Refactor Roadmap (Phased)

This roadmap re-establishes the full multi-phase plan, including the product phases that are not part of the TypeScript-only track.

## Phase 1: Handler Extraction and Stabilization (Completed)

Goals:
- Extract request handling into dedicated handler modules.
- Keep behavior parity with existing extension flow.

Done:
- Request handlers split and wired.
- Regression tests introduced for core handler paths.

## Phase 2: TypeScript Migration and Strictness (Completed)

Goals:
- Migrate JS modules to TS.
- Remove all `@ts-nocheck` usage.
- Resolve strict type errors.

Done:
- All `src/js` migration commits completed.
- `@ts-nocheck` removed from migrated files.
- Type-hardening pass performed on handlers.

## Phase 3: Styling Update (Next)

Goals:
- Refresh extension UI consistency across panel, popup, options, and devtools.
- Consolidate theme tokens and remove ad-hoc color/style duplication.
- Preserve existing UX behavior while improving clarity and density.

Scope:
- `src/css/_variables.scss`
- `src/css/main.scss`
- `src/css/custom.scss`
- `src/css/options.scss`
- `src/chrome/panel.html`, `src/chrome/popup.html`, `src/chrome/options.html`

Deliverables:
- Unified token palette (semantic color and spacing variables).
- Reduced inline styling in HTML templates.
- Updated component-level classes for alerts, tables, controls, and icon actions.
- Visual smoke-check in dev build.

Commit slices:
1. Token and variable cleanup.
2. Panel styling pass.
3. Popup + options styling pass.
4. Final polish and cleanup.

## Phase 4: Merge FoE-Extension Stream (Planned)

Goals:
- Merge upstream/target FoE extension changes with minimal regressions.
- Resolve code and style conflicts using the Phase 3 baseline.

Inputs required:
- Source branch or repository reference for the merge target.
- Merge strategy decision (single merge commit vs staged cherry-pick batches).

Deliverables:
- Conflict resolution notes.
- Post-merge verification checklist.
- Follow-up fix commits grouped by feature area.

## Phase 5: Documentation Update (Planned)

Goals:
- Bring project documentation in sync with new architecture and workflow.

Scope:
- `README.md`
- Add architecture notes for request handlers and message flow.
- Add migration notes (TS, testing, and known assumptions).
- Add contributor workflow guidance (build, test, release).

Deliverables:
- Updated setup/build/test sections.
- Handler map and data-flow summary.
- Changelog-style migration summary.

## Phase 6: Security/Permissions and Release Readiness (Planned)

Goals:
- Execute staged permission audit safely.
- Prepare release candidate with reproducible checks.

Scope:
- `PERMISSIONS_AUDIT.md`
- Source manifests under `src/chrome/`.

Deliverables:
- One commit per permission stage (reversible).
- Smoke test evidence for each permission reduction.
- Final release checklist.

## Phase 7: QA and Release (Planned)

Goals:
- Final validation across feature flows and browser targets.

Deliverables:
- Type-check, test, and manual smoke-test pass.
- Tagged release candidate branch and notes.

## Current Position

- Completed: Phases 1-2.
- Next active focus: Phase 3 (Styling Update).
- Pending: Phases 4-7.
