---
type: "query"
date: "2026-09-27T14:06:09.844241+00:00"
question: "Does graphify's MCP server record exploratory query telemetry into graphify-out/memory/ as the maintain-graph-knowledge skill claims?"
contributor: "graphify"
outcome: "corrected"
correction: "The skill's Emergent Knowledge Synthesis section says the MCP server 'automatically intercepts your exploratory queries... and records them in graphify-out/memory/'. It does not. Agents must call save-result explicitly after each useful exploration, then reflect, or the knowledge base is never built."
---

# Q: Does graphify's MCP server record exploratory query telemetry into graphify-out/memory/ as the maintain-graph-knowledge skill claims?

## Answer

No, and the claim is false for this deployment. graphify-mcp is 'python -m graphify.serve' and exposes only --graph/--transport/--host/--port/--api-key/--path/--json-response/--stateless/--session-timeout. It has no memory, reflect, or save capability. The live server process env carries GRAPHIFY_BACKEND/OPENAI_* but no memory dir. graphify-out/memory/ does not exist. Telemetry requires an explicit 'graphify save-result --question ... --outcome useful|dead_end|corrected' call, which .agents/scripts/graphify.sh:116-118 already wraps. Consequence: with no save-result calls, 'graphify reflect' has nothing to aggregate and graphify-out/reflections/LESSONS.md stays frozen at its last manual write (2026-09-24) no matter how much MCP exploration happens.

## Outcome

- Signal: corrected
- Correction: The skill's Emergent Knowledge Synthesis section says the MCP server 'automatically intercepts your exploratory queries... and records them in graphify-out/memory/'. It does not. Agents must call save-result explicitly after each useful exploration, then reflect, or the knowledge base is never built.