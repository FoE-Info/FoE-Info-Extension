# low-tool-kg-explorer — Worked Examples

On-demand examples for the `low-tool-kg-explorer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: LoW-Tool Standalone AST Exploration

**Inquiry:** "Inspect the closed-source LoW-Tool AST for legacy Great Building calculation formulas in `graphify-low-tool`."
**Reasoning Trace:**

1. Execute `call_mcp_tool` on `graphify-low-tool` with `get_node`:
   - Node: `src/js/GreatBuildingsService.js` in LoW-Tool.
2. Follow isolation invariant: Treat LoW-Tool strictly as its own standalone project; do NOT query `graphify-foe-info` or make comparative claims.
3. Save findings to `./graphify-out/low-tool/findings/2026-09-gb-math-ast.md`.

---
