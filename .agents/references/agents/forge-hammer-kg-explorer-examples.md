# forge-hammer-kg-explorer — Worked Examples

On-demand examples for the `forge-hammer-kg-explorer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Forge-Hammer Standalone Query

**Inquiry:** "Inspect Forge-Hammer's approach to packet interception in `graphify-forge-hammer`."
**Reasoning Trace:**

1. Execute `call_mcp_tool` on `graphify-forge-hammer` with `query_graph`:
   - Query: `network` or `interceptor`
2. Follow isolation invariant: Treat Forge-Hammer strictly as its own standalone project; do NOT query `graphify-foe-info` or make comparative claims.
3. Save findings to `./graphify-out/forge-hammer/findings/2026-09-interceptor-architecture.md`.

---
