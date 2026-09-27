---
type: "query"
date: "2026-09-27T14:08:35.055637+00:00"
question: "Which lower-layer src/ modules import ui/, and does protocol/networkListener.js import ui/?"
contributor: "graphify"
outcome: "corrected"
---

# Q: Which lower-layer src/ modules import ui/, and does protocol/networkListener.js import ui/?

## Answer

Yes, networkListener.js:51 does: 'defaultCardVisibility = require("../ui/cardVisibility.js")' in a try/catch. But it is consumed ONLY as an injectable default at :363 ('applyCardVisibility: defaultCardVisibility?.applyCardVisibility') and never called directly, so it is a module-load edge without a call. Verified ui/-importing sites from lower layers: (1) protocol/networkListener.js:51 -> ui/cardVisibility.js, injectable default only, NOT in graph; (2) protocol/gameVersionTracker.js:16 -> ui/gameVersionStatus.js, soft, in graph; (3) protocol/indexBridgeSetup.js -> ui/cardVisibility.js, panelDispatcher.js, playerTooltip.js, renderGuildPanel.js, legitimate composition root, in graph; (4) state/viewState.js:10 -> ui/cardVisibility.js, DIRECTLY CALLED at :15 via cardVis.setCurrentView(view), not in graph — the strongest real violation; (5) state/storageWorldSettings.js:122 -> ui/themeManager.js, soft, in graph.

## Outcome

- Signal: corrected