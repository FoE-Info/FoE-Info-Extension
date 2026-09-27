---
type: "query"
date: "2026-09-27T17:37:48.492600+00:00"
question: "Which lower-layer src/ modules import ui/, and does protocol/networkListener.js import ui/?"
contributor: "graphify"
outcome: "corrected"
correction: "Judge a lower-layer ui/ import by whether it is CALLED, not by whether the require exists. networkListener.js:51 is an injectable default consumed at :363 and is legitimate; state/viewState.js:10 calls cardVis.setCurrentView(view) at :15 and is the real violation. A module-load edge without a call is not a dependency."
---

# Q: Which lower-layer src/ modules import ui/, and does protocol/networkListener.js import ui/?

## Answer

Yes, networkListener.js:51 does: 'defaultCardVisibility = require("../ui/cardVisibility.js")' in a try/catch. But it is consumed ONLY as an injectable default at :363 and never called directly, so it is a module-load edge without a call. Verified ui/-importing sites from lower layers: (1) protocol/networkListener.js:51 -> ui/cardVisibility.js, injectable default only, NOT in graph; (2) protocol/gameVersionTracker.js:16 -> ui/gameVersionStatus.js, soft, in graph; (3) protocol/indexBridgeSetup.js -> ui/cardVisibility.js, panelDispatcher.js, playerTooltip.js, renderGuildPanel.js, legitimate composition root, in graph; (4) state/viewState.js:10 -> ui/cardVisibility.js, DIRECTLY CALLED at :15 via cardVis.setCurrentView(view), not in graph - the strongest real violation; (5) state/storageWorldSettings.js:122 -> ui/themeManager.js, soft, in graph.

## Outcome

- Signal: corrected
- Correction: Judge a lower-layer ui/ import by whether it is CALLED, not by whether the require exists. networkListener.js:51 is an injectable default consumed at :363 and is legitimate; state/viewState.js:10 calls cardVis.setCurrentView(view) at :15 and is the real violation. A module-load edge without a call is not a dependency.