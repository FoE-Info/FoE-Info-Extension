---
type: "query"
date: "2026-09-27T14:11:10.677672+00:00"
question: "What does the maintain-graph-knowledge skill actually require to build the knowledge base?"
contributor: "graphify"
outcome: "corrected"
correction: "Do not rely on MCP telemetry existing. Save-result explicitly, snapshot LESSONS.md before reflecting, and search brief() by subject rather than id."
---

# Q: What does the maintain-graph-knowledge skill actually require to build the knowledge base?

## Answer

Corrected on 2026-09-27. The skill's step 4 claimed the MCP server 'automatically intercepts your exploratory queries... and records them in graphify-out/memory/'. It does not: graphify-mcp is python -m graphify.serve with no memory/reflect/save flags, and the live process env carries no memory dir. The real procedure is explicit — 'graphify.sh <target> save-result --question ... --answer ... --outcome useful|dead_end|corrected' per exploration, then 'reflect' to aggregate. SKILL.md step 4 has been rewritten to say so, plus the two operational traps: reflect is a destructive whole-file overwrite of LESSONS.md (it regenerated a 23k file down to 2.7k on this run, unrecoverably, because graphify-out/ is gitignored and the backup dirs never contain reflections/), and decision-log brief() renders '- [kind] subject: verdict' while omitting the row id, so it must be searched by subject.

## Outcome

- Signal: corrected
- Correction: Do not rely on MCP telemetry existing. Save-result explicitly, snapshot LESSONS.md before reflecting, and search brief() by subject rather than id.