# codebase-modernization-architect — Worked Examples

On-demand examples for the `codebase-modernization-architect` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Monolith Decomposition Task Brief

**Scenario:** Decomposing direct DOM updates out of `OtherPlayerService.js`.
**Reasoning Trace:**

1. Characterization test first: Verify existing behavior in `tests/msg/other-player-service.test.mjs`.
2. Plan decoupled layers:
   - State: `SocialState.js` handles player social lists.
   - UI: `renderSocialListsPanel.js` handles DOM rendering.
   - Binding: `socialRenderBinding.js` connects state to UI.
3. Delegate or implement: Author task brief for subagent dispatched with `Workspace: "share"`.
4. Verification: Run `npm run verify` to ensure 0 failures before merging worktree.

---
