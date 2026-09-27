---
type: "query"
date: "2026-09-27T14:06:09.639691+00:00"
question: "Which src/ modules import upward across architectural layers into ui/?"
contributor: "graphify"
outcome: "useful"
---

# Q: Which src/ modules import upward across architectural layers into ui/?

## Answer

Layer direction is NOT enforced and NOT documented as a rule. ARCHITECTURE.md:50-57 assigns per-layer responsibilities but states no import-direction prohibition; line 42 is the pipeline diagram, not a rule. Verified upward imports: protocol/gameVersionTracker.js:16 requires ui/gameVersionStatus.js (inside try/catch, fail-soft), protocol/indexBridgeSetup.js imports ui/cardVisibility.js, ui/panelDispatcher.js, ui/playerTooltip.js, ui/renderGuildPanel.js (composition root, legitimate), state/storageWorldSettings.js:122 requires ui/themeManager.js (try/catch, fail-soft). Layers otherwise flow protocol -> msg -> {state,calc} -> ui -> utils.

## Outcome

- Signal: useful