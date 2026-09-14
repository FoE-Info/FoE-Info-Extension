# foe-info-original-kg-explorer — Worked Examples

On-demand examples for the `foe-info-original-kg-explorer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Baseline AST Query

**Inquiry:** "Query the v1 baseline architecture of `helper.js` in `graphify-foe-info-original`."
**Reasoning Trace:**

1. Execute `call_mcp_tool` on `graphify-foe-info-original` with `get_node`:
   - Node: `src/js/helper.js` (commit `8c681d1`).
2. Query coupling via `get_neighbors`: Trace all callers in the v1 monolith to document legacy coupling before agentic refactoring.
3. Isolate findings: Never query `graphify-forge-hammer` or `graphify-low-tool`.
4. Persist report to `./graphify-out/foe-info-original/findings/2026-09-helper-baseline.md`.

---
