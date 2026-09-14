# monolith-refactoring-specialist — Worked Examples

On-demand examples for the `monolith-refactoring-specialist` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Monolith Slice Extraction

**Scenario:** Extracting an RPC handler from `StartupService.js` (500 lines) into `src/js/msg/`.
**Reasoning Trace:**

1. Characterization test: Confirm tests exist in `tests/msg/startup-service.test.mjs`.
2. Extract slice: Create `src/js/state/playerScoreResolver.js` (<100 lines), inject dependencies and scoped logger `createLogger('PlayerScoreResolver')`.
3. Wire call site: Replace the inline 40-line extraction block in `StartupService.js` with a single delegated call: `resolvePlayerScore(...)`.
4. Verification check: Run `git diff --stat` to verify `StartupService.js` shrunk; run `npm run verify` to ensure zero regressions.

---
