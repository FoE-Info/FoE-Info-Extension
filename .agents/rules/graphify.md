---
trigger: always_on
description: Query graphify knowledge graphs before source search and maintain AST freshness.
---

# Rule: Knowledge Graph Integration (Graphify)

1. **Query-First Protocol**: Always query Graphify before wide text searches or reading multiple source files for architecture, module relationships, or game data.
2. **Mechanical Hook Enforcement**: `.agents/scripts/graphify-guard.mjs` blocks broad source searches without a shared filesystem query stamp (<1800s).
3. **Lazy-Loaded MCP Invocation**: Call `call_mcp_tool` on `graphify-foe-info`, `graphify-metadata-store`, `graphify-forge-hammer`, `graphify-low-tool`, or `graphify-foe-info-original` (`query_graph`, `get_node`, `get_neighbors`, `shortest_path`, `god_nodes`).
4. **Autonomous Deep Exploration**: Delegate architectural or comparative mapping to `graph-knowledge-explorer` or peer comparators (`forge-hammer-comparator`, `low-tool-comparator`, `foe-info-original-comparator`).
5. **AST Freshness**: After modifying code files, run `npm run graph:foe-info:ast` to update the graph AST.

*(See the `graphify` skill for CLI fallback commands, exports, and tool reference).*
