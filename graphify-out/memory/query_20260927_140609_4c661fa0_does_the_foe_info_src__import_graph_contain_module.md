---
type: "query"
date: "2026-09-27T14:06:09.741125+00:00"
question: "Does the FoE-Info src/ import graph contain module-level cycles?"
contributor: "graphify"
outcome: "useful"
---

# Q: Does the FoE-Info src/ import graph contain module-level cycles?

## Answer

No. Tarjan SCC over all src/ file-level import edges (imports, imports_from, dynamic_import, re_exports) yields 0 cycles. The LAYER graph does contain a cycle: msg->state (57 edges) and state->msg (2 edges), but both state->msg edges originate solely from state/indexEntityDefs.js, which no msg/ module imports back. Layer cycle without module cycle.

## Outcome

- Signal: useful