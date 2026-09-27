---
type: "query"
date: "2026-09-27T14:13:51.228523+00:00"
question: "What are the two intake paths into the extension and where do they converge?"
contributor: "graphify"
outcome: "useful"
---

# Q: What are the two intake paths into the extension and where do they converge?

## Answer

Two transports converge on ONE function: handleRawNetworkEntry at src/js/protocol/networkListener.js:444, called with a positional 5-tuple (reqUrl, headers, body, encoding, request) plus deps. PATH A (DevTools): devtools.js:165 onRequestFinished -> isRelevantRequest origin gate (:166, evaluateRequestOrigin at :24) -> request.getContent (:217) -> forwardOrBufferEntry (:206, 500-cap buffer at :64) -> postNetworkEntry (devtoolsBridge.js:62) -> postToWindow (:42, fails closed at :47-51 if extensionOrigin unresolved) -> targetWindow.postMessage (:54) -> installPanelBridge.onMessage (:124, source-authenticated at :132) -> convergence. PATH B (MAIN-world, manifest.json:13 document_start): xhrInterceptor patches XHR.open/send (:47,:52), fetch (:91), WebSocket (:195,:190) -> window.postMessage FOE_INFO_XHR (:72) -> contentBridge (manifest.json:17 ISOLATED world) validates event.source===window and origin (:46) -> browser.runtime.sendMessage FOE_INFO_NET_DATA (:86) -> networkListener activeMessageListener (:539) with sender.tab.id === inspectedWindow.tabId guard (:541) -> convergence. Origin policy is a leaf module utils/intakePolicy.js and is FAIL-CLOSED (https-only, suffix-match forgeofempires.com, CDN allowlist, path prefix) but is applied at TWO gates: devtools.js:24 and networkListener.js:460, re-applied after the cross-window transport. Passive-observation invariant HONORED: the interceptor never calls the originals with modified arguments (xhrInterceptor.js:49,:88,:92,:192). KEY STRUCTURAL LIMIT the graph cannot express: path B hardcodes headers=[] and encoding='' at networkListener.js:562-564, so the header-dependent game-version branch at :466-472 is permanently dead for content-bridge traffic; URL-only routing still works. The graph also cannot represent window.postMessage -> runtime.sendMessage -> onMessage, so it shows NO edge from xhrInterceptor to contentBridge to networkListener, and its shortest_path from attachWsListener to dispatchRaw is a FALSE route through fn/post.js postData().

## Outcome

- Signal: useful