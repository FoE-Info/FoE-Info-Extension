---
trigger: model_decision
description: Query graphify knowledge graphs before source search and maintain AST freshness.
---

# Rule: Knowledge Graph Integration (Graphify)

1. **Query-First Protocol**: Always query Graphify before wide text searches or reading multiple source files for architecture, module relationships, or game data. Live telemetry debugging (OpenCLI) does NOT excuse skipping Graphify when inspecting code symbols, state variables, or module relationships.
2. **Query-First Discipline**: Run `rtk npm run graph:<repo>:ast` after code edits, and query the MCP graph before broad searches.
3. **Lazy-Loaded MCP Invocation**: Call `call_mcp_tool` on `graphify-foe-info`, `graphify-metadata-store`, `graphify-forge-hammer`, `graphify-low-tool`, or `graphify-foe-info-original` (`query_graph`, `get_node`, `get_neighbors`, `shortest_path`, `god_nodes`).
   - **Exact `query_graph` Parameter Schema**:
     ```json
     {
       "ServerName": "graphify-foe-info",
       "ToolName": "query_graph",
       "Arguments": {
         "question": "<symbol, method, or concept>",
         "mode": "bfs",
         "depth": 3
       }
     }
     ```
     _(Note: The search parameter is `question`, NOT `query`)._
4. **Autonomous Deep Exploration**: Delegate architectural or comparative mapping to `graph-knowledge-explorer` or peer comparators (`forge-hammer-comparator`, `low-tool-comparator`, `foe-info-original-comparator`).
5. **AST Freshness & Completion Gate**: After modifying code files in `src/`, always run `rtk npm run graph:foe-info:ast` to update the graph AST before committing or claiming task completion.
6. **RTK Compatibility**: The RTK command proxy (`rtk`) is 100% compatible with Graphify CLI scripts. Always prefix with `rtk` (e.g., `rtk npm run graph:foe-info:ast`).

_(See the `graphify` skill for CLI fallback commands, exports, and tool reference)._
