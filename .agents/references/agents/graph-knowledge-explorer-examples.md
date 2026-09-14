# graph-knowledge-explorer — Worked Examples

On-demand examples for the `graph-knowledge-explorer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Graphify Investigation

**Inquiry:** "Trace dependencies of `CityStatsCalculator.js` to verify calculation purity."
**Reasoning Trace:**

1. Execute `call_mcp_tool` on `graphify-foe-info` with `get_node`:
   - Node: `src/js/calc/CityStatsCalculator.js`
2. Query outbound neighbors via `get_neighbors`:
   - Outbound edges: `src/js/utils/formatters.js`, `bignumber.js`.
   - Invariant check: Verify 0 inbound/outbound edges to `src/js/ui/` or `document/window` globals.
3. Check AST freshness: If files were modified, run `npm run graph:foe-info:ast` before analyzing.
4. Save report to `graphify-out/foe-info/findings/2026-09-city-stats-purity.md`.

---
