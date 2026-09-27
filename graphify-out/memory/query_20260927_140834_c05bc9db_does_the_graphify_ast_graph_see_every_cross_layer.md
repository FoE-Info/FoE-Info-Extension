---
type: "query"
date: "2026-09-27T14:08:34.947837+00:00"
question: "Does the Graphify AST graph see every cross-layer import in src/?"
contributor: "graphify"
outcome: "corrected"
correction: "A graph query for cross-layer dependencies returns an undercount, not the truth. Source truth is the only reliable measure for import-direction questions; the graph is reliable for symbol-level call structure but not for module edges expressed as soft requires."
---

# Q: Does the Graphify AST graph see every cross-layer import in src/?

## Answer

No — 135 cross-layer require sites are absent from graph.json. The extractor only binds DECLARATION form: 107 sites match 'const|let|var X = require(...)' and all 56 cross-layer ones are present. The 159 BARE-ASSIGNMENT sites of the form 'let X = null; try { X = require(...) } catch {}' are systematically not extracted. The discriminator is the binding form, NOT try-wrapping, destructuring, or member access: gbNaming.js:22 'const { createLogger } = require("../utils/logger.js")' IS captured while gbNaming.js:10 'metadataStore = require("../state/MetadataStore.js").metadataStore' and gbNaming.js:16 'stateModule = require(...)' are BOTH missed; gameVersionTracker.js:16 and storageWorldSettings.js:122 are try-wrapped const declarations and ARE captured. Consequence: every architectural claim derived from the graph's import edges is a LOWER BOUND, and the soft-dependency idiom that this codebase uses pervasively is invisible to it.

## Outcome

- Signal: corrected
- Correction: A graph query for cross-layer dependencies returns an undercount, not the truth. Source truth is the only reliable measure for import-direction questions; the graph is reliable for symbol-level call structure but not for module edges expressed as soft requires.