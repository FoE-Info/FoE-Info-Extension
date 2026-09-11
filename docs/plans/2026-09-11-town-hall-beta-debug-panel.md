# Task Plan: Town Hall / Beta Debug Panel Height & Scroll Refactor

**Target Harness**: OpenCode (Dual-Harness Task)  
**Status**: Complete (2026-09-11)  
**Target File**: `src/js/ui/betaDebugPanel.js`  
**Associated Test**: `tests/ui/beta-debug-panel.test.mjs`

---

## 1. Background & Context

In `src/js/ui/betaDebugPanel.js`, the Town Hall / Beta Debug panel (`#betaText`) currently uses:

- Hardcoded inline style: `style="max-height: 20em !important; overflow-y: auto !important;"`.
- Conflicting event listeners: an inline Bootstrap attribute `data-bs-toggle="collapse"` plus a redundant manual event listener `document.getElementById('betaicon')?.addEventListener('click', toggleBeta)` that causes toggle desynchronization.
- Lack of height persistence: unlike `#armyText`, `#goodsText`, and `#treasuryText`, it does not integrate with `bindResizableCollapse` in `src/js/ui/panelResize.js` or save user-resized heights across sessions.

---

## 2. Requirements & Acceptance Criteria

1. **Clean Toggle Event Model**:
   - Standardize collapse behavior with `src/js/ui/collapseIconsAndTitles.js` / Bootstrap 5 collapse standards without dual listener conflicts.
2. **Standard CSS Resizable Container**:
   - Remove inline `style="max-height: 20em !important; overflow-y: auto !important;"`.
   - Use CSS classes `.resize.collapse` and let SCSS / `panelResize.js` govern sizing.
3. **Height Persistence**:
   - Connect `#betaText` with `bindResizableCollapse` (`panelResize.js`) using storage key `'beta:height'`.
   - Default height: 250px (matching default resizable card standards).
4. **Unit Test Coverage**:
   - Verify panel rendering, collapse toggling, and text appending in `tests/ui/beta-debug-panel.test.mjs`.

---

## 3. Checklist for OpenCode

- [x] Inspect `src/js/ui/betaDebugPanel.js` and `src/js/ui/panelResize.js`.
- [x] Refactor `renderBetaPanel` to remove hardcoded inline styles and duplicate listeners.
- [x] Bind resize retention using `bindResizableCollapse('betaText', 'beta:height', 250)`.
- [x] Add unit tests in `tests/ui/beta-debug-panel.test.mjs`.
- [x] Run `npm test` and verify clean execution.
- [x] Mark this task complete in `docs/STATUS.md`.
