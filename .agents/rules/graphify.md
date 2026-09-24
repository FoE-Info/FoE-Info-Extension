---
trigger: model_decision
description: Query graphify knowledge graphs before source search and maintain AST freshness.
---

# Rule: Knowledge Graph Integration (Graphify)

1. **Query-First Protocol**: Always query Graphify before wide text searches or reading multiple source files for architecture, module relationships, or game data. Using native search tools (`grep_search`, `find_by_name`) or shell search commands (`rtk grep`, `rtk find`, `rtk rg`) as a first step is strictly forbidden. Live telemetry debugging does NOT excuse skipping Graphify when inspecting code symbols, state variables, or module relationships.
2. **Query-First Discipline**: Run `npm run graph:<repo>:ast` after code edits, and query the MCP graph before broad searches.
3. **Lazy-Loaded MCP Invocation**: Call `call_mcp_tool` on `graphify-foe-info`, `graphify-metadata-store`, `graphify-forge-hammer`, `graphify-low-tool`, or `graphify-foe-info-original` (`query_graph`, `get_node`, `get_neighbors`, `shortest_path`, `god_nodes`).
   - **Exact Argument Schemas**:
     - `query_graph`: `{"question": "<concept>", "mode": "bfs"|"dfs", "depth": 3}` _(Parameter is `question`, NOT `query`)_.
     - `get_node`: `{"label": "<exact node label or ID>"}` _(Parameter is `label`, NOT `name` or `symbol`)_.
     - `get_neighbors`: `{"label": "<exact node label or ID>", "relation_filter": "<optional>"}`.
     - `shortest_path`: `{"source": "<concept>", "target": "<concept>", "undirected": false}`.
     - `god_nodes`: `{"top_n": 10, "exclude_hubs_percentile": 95}`.
     - `get_community`: `{"community_id": 0}`.
4. **Autonomous Deep Exploration**: Delegate architectural or comparative mapping to `graph-knowledge-explorer` or peer comparators (`forge-hammer-comparator`, `low-tool-comparator`, `foe-info-original-comparator`).
5. **AST Freshness & Completion Gate**: After modifying code files in `src/`, always run `npm run graph:foe-info:ast` to update the graph AST before committing or claiming task completion.
6. **CLI Compatibility**: Graphify CLI scripts run directly (`npm run graph:foe-info:ast`).

_(See the `graphify` skill for CLI fallback commands, exports, and tool reference)._
