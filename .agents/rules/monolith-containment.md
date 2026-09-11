---
trigger: model_decision
description: Apply when modifying, refactoring, or adding features to monolithic orchestrators (src/js/index.js, StartupService.js).
---

# Monolith Containment Rule (src/js/index.js & StartupService.js)

`src/js/index.js` and `StartupService.js` are legacy orchestrator files with historical mixed concerns across DOM management, game state, calculation logic, and network handling.

## 1. No New Inline Features
- Do NOT append large, new feature blocks directly into `src/js/index.js` or `StartupService.js`.
- When adding a new capability, implement the core logic in a dedicated module under `src/js/calc/` / `src/js/fn/` (for calculation logic), `src/js/ui/` (for DOM rendering), or `src/js/msg/` (for game RPC service handlers).
- In `index.js` and `StartupService.js`, only add minimal invocation wiring that delegates to the new module.

## 2. Extraction on Modification (Boy Scout Rule)
- When modifying an existing feature in `index.js` or `StartupService.js`, look for self-contained helper functions or calculation algorithms that can be safely extracted into separate files.
- Ensure any extracted functions are cleanly imported at the top of the file.

## 3. Preservation of Invariant Signatures
- Global properties and legacy event signatures bound to `window` or jQuery events must be preserved to avoid breaking unrefactored sections of the panel.

## 4. Debuggability by Design on Extraction
- Every service, calculator, or UI renderer carved out of a monolith must instantiate `createLogger('<ModuleName>')` from `src/js/utils/logger.js`.
- Extracted logic must emit structured debug statements (`logger.debug(...)`) covering inbound payloads, computed intermediate values, cache mutations, and rendered outputs when debug mode is enabled.
- Under standard mode (debug off), extracted modules must remain completely silent to avoid polluting the developer console.

