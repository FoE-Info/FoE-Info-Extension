# Graphify Knowledge Graph Rules

This project maintains an AST knowledge graph at `graphify-out/`.

Rules:
- For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `mise exec -- graphify query "<question>"` (CLI) or `query_graph` (MCP). Use `mise exec -- graphify path "<A>" "<B>"` / `shortest_path` for relationships and `mise exec -- graphify explain "<concept>"` / `get_node` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- Run Graphify CLI commands using `uvx --from "graphifyy[gemini,mcp]" graphify ...` to ensure zero-install portable execution across all environments and subshells.
- Always run Graphify commands against the repository root `.` (e.g., `uvx --from "graphifyy[gemini,mcp]" graphify update .`). Do NOT target subdirectories (e.g. `docs/`), as this creates redundant nested `graphify-out/` directories.
- After modifying code files in this session, run `uvx --from "graphifyy[gemini,mcp]" graphify update .` to keep the graph current (AST-only, no API cost).


