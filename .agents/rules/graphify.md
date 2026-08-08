# Graphify Knowledge Graph Rules

This project maintains an AST knowledge graph at `graphify-out/`.

Rules:
- For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `uvx --from "graphifyy[gemini,mcp]" graphify query "<question>"` (CLI) or `query_graph` (MCP). Use `uvx` (or `pipx run` / `graphify` fallback) for portable query execution.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context
- Run Graphify CLI commands using `uvx` with `pipx run` and local binary fallbacks (`command -v uvx >/dev/null 2>&1 && uvx --from "graphifyy[gemini,mcp]" graphify ... || (command -v pipx >/dev/null 2>&1 && pipx run --spec "graphifyy[gemini,mcp]" graphify ... || graphify ...)`).
- Always run Graphify commands against the repository root `.` (e.g., `uvx --from "graphifyy[gemini,mcp]" graphify update .`). Do NOT target subdirectories (e.g. `docs/`), as this creates redundant nested `graphify-out/` directories.
- After modifying code or documentation, run `npm run graphify-update` or `mise run graphify-update` to keep the graph current. Code-only updates use deterministic AST extraction and have no semantic-model cost; changed documents, papers, or images may require semantic extraction.

