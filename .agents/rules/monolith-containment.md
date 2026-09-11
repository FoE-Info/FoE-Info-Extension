---
trigger: always_on
description: Apply when modifying, refactoring, or adding features to the monolithic src/js/index.js file.
---

# Monolith Containment Rule (src/js/index.js)

`src/js/index.js` is a legacy orchestrator file (reduced from >3,500 lines to ~2,820 lines, ~98 KB through ongoing modularization) with historical mixed concerns across DOM management, game state, calculation logic, and network handling.

## 1. No New Inline Features
- Do NOT append large, new feature blocks directly into `src/js/index.js`.
- When adding a new capability, implement the core logic in a dedicated module under `src/js/fn/` (for utilities and calculation logic) or `src/js/msg/` (for game RPC service handlers).
- In `index.js`, only add minimal invocation wiring that delegates to the new module.

## 2. Extraction on Modification (Boy Scout Rule)
- When modifying an existing feature in `index.js`, look for self-contained helper functions or calculation algorithms that can be safely extracted into separate files.
- Ensure any extracted functions are cleanly imported at the top of `index.js`.

## 3. Preservation of Invariant Signatures
- Global properties and legacy event signatures bound to `window` or jQuery events must be preserved to avoid breaking unrefactored sections of the panel.
