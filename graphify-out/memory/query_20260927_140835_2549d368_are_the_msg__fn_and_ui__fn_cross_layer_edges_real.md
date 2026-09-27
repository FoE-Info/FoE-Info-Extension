---
type: "query"
date: "2026-09-27T14:08:35.165354+00:00"
question: "Are the msg->fn and ui->fn cross-layer edges real architectural violations?"
contributor: "graphify"
outcome: "useful"
---

# Q: Are the msg->fn and ui->fn cross-layer edges real architectural violations?

## Answer

No. src/js/fn/ and src/js/vars/ are legacy re-export shim layers, not real modules. src/js/fn/i18n.js:1-7 is literally headed 'Legacy compatibility shim / Re-exports from src/js/utils/i18n.js' and its body is 'module.exports = require("../utils/i18n.js")'. An edge into fn/ or vars/ is an alias of the real target, so msg->fn and ui->fn must not be read as layer violations; resolve through the shim to the real target first. The graph models these as relation 're_exports' (38 edges) when it catches them at all.

## Outcome

- Signal: useful