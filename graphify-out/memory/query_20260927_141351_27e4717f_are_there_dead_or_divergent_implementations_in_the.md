---
type: "query"
date: "2026-09-27T14:13:51.335784+00:00"
question: "Are there dead or divergent implementations in the intake path?"
contributor: "graphify"
outcome: "useful"
---

# Q: Are there dead or divergent implementations in the intake path?

## Answer

Yes, two verified. (1) DIVERGENT DEDUP: DedupCache (dedupCache.js) is the live policy — MessageDispatcher.js:51-54 constructs it with windowMs=1000, maxSize=500, isDuplicate() at :133-135 is called at rawDispatchPipeline.js:55. networkListener.js:106-151 holds a SECOND, inert policy (processedPayloadCache, TTL_MS=3000, MAX_CACHE_SIZE=300, isDuplicatePayload at :118) that is exported at :595,:615 but has NO src/ call site; its only references are two test files, so the suite is green while covering code production never reaches. getType() at :161 is dead the same way (exported :625, no callers). (2) FAIL-OPEN WS BRANCH: xhrInterceptor.js:145 posts a LITERAL synthesized url window.location.origin + '/game/json?source=ws'; attachWsListener(ws) never reads ws.url, so every WebSocket the page opens to ANY host is relabeled as same-origin /game/json and passes the networkListener.js:460 origin gate tautologically. Body filter is only startsWith('[') or '{' (:131-132). This is a data-integrity bug whose security dimension is subsumed by the already-documented page-spoofable baseline (SECURITY.md; contentBridge.js:46 is satisfiable by any page script), but it needs NO attacker: a legitimate third-party WebSocket is silently injected into the state pipeline as trusted game traffic.

## Outcome

- Signal: useful