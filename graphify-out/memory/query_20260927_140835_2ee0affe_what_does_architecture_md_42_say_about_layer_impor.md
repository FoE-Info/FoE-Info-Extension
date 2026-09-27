---
type: "query"
date: "2026-09-27T14:08:35.274746+00:00"
question: "What does ARCHITECTURE.md:42 say about layer import direction?"
contributor: "graphify"
outcome: "corrected"
correction: "Cite ARCHITECTURE.md:50-57 (the layer table) for layer responsibilities, and treat the :14-46 diagram as the only statement of intended flow. Do not cite :42 as a prohibition."
---

# Q: What does ARCHITECTURE.md:42 say about layer import direction?

## Answer

Nothing. Line 42 is a single line of the Core Data Pipeline ASCII diagram: 'Modular UI Renderers (src/js/ui/render*Panel.js)'. The Architectural Layers table at :50-57 assigns each layer a Responsibility and an Invariants cell, but states NO import-direction prohibition anywhere in the file. docs/TODO.md:99 and the recorded decision 'network-listener-world-switch' both cite 'ARCHITECTURE.md:42' as if it were a rule; that citation is inaccurate. The layering constraint is real as an intent expressed by the diagram, not as a written rule, which is why cross-layer requires have accumulated unchallenged.

## Outcome

- Signal: corrected
- Correction: Cite ARCHITECTURE.md:50-57 (the layer table) for layer responsibilities, and treat the :14-46 diagram as the only statement of intended flow. Do not cite :42 as a prohibition.