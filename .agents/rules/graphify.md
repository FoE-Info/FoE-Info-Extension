---
trigger: always_on
description: Query graphify knowledge graphs before source search and maintain AST freshness.
---

# Rule: Knowledge Graph Integration (Graphify)

1. **Query-First Protocol**: Always query Graphify before wide text searches or reading multiple source files for architecture, module relationships, or game data.
2. **Query-First Discipline**: Run `npm run graph:<repo>:ast` after code edits and query the MCP graph before broad searches. The mechanical guard hooks were removed (overzealous auto-sync, burned context); the pipeline is manual via `npm run graph:*:ast|update|reindex`.
3. **Lazy-Loaded MCP Invocation**: Call `call_mcp_tool` on `graphify-foe-info`, `graphify-metadata-store`, `graphify-forge-hammer`, `graphify-low-tool`, or `graphify-foe-info-original` (`query_graph`, `get_node`, `get_neighbors`, `shortest_path`, `god_nodes`).
4. **Autonomous Deep Exploration**: Delegate architectural or comparative mapping to `graph-knowledge-explorer` or peer comparators (`forge-hammer-comparator`, `low-tool-comparator`, `foe-info-original-comparator`).
5. **AST Freshness**: After modifying code files, run `npm run graph:foe-info:ast` to update the graph AST.

_(See the `graphify` skill for CLI fallback commands, exports, and tool reference)._
