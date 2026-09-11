---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ (via MCP query_graph or CLI) for codebase architecture, relationships, or entity topology questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Query-First Protocol: For codebase or architecture questions, always consult Graphify BEFORE performing wide grep searches or reading multiple source files.
- **MCP Invocation (Lazy Loaded)**: Call via `call_mcp_tool` with `ServerName: "graphify-foe-info"` (or `graphify-metadata-store` / `graphify-forge-hammer`) and `ToolName: "query_graph"` (e.g., `Arguments: {"question": "<query>"}`). Companion tools: `get_node`, `shortest_path`, `god_nodes`, `get_neighbors`.
- **CLI Fallback**: When MCP is unavailable, run `GRAPHIFY_OUT=graphify-out/foe-info graphify query "<question>"` via `run_command`.
- **Available Graph Datasets**:
  - `graphify-foe-info`: FoE-Info Extension codebase AST & architecture graph (`graphify-out/foe-info/graph.json`).
  - `graphify-foe-info-original`: Original pre-agentic v1 baseline AST graph (`graphify-out/foe-info-original/graph.json`, commit 8c681d1).
  - `graphify-forge-hammer`: Competitor browser extension codebase graph (`/var/home/kronikpillow/Projects/Forge-Hammer/forge-hammer/graphify-out/graph.json`) for diagnosing compatibility conflicts and discovering feature/implementation ideas.
  - `graphify-metadata-store`: Forge of Empires game entity & topology graph (`graphify-out/metadata/graph.json`, 5,412 nodes, 13,877 edges) covering buildings, eras, resources, technologies, GBs, and military units.
- If `graphify-out/foe-info/wiki/index.md` or `graphify-out/metadata/wiki/index.md` exists, navigate it instead of reading raw files
- **Autonomous Deep Exploration Delegation**: Whenever the user requests graph exploration, architectural investigation, or subsystem mapping, automatically delegate to the `graph-knowledge-explorer` subagent via `invoke_subagent`. The subagent executes the 5-stage cognition loop (traverse, question, explain, reflect, and document persistent findings in `graphify-out/<graph>/findings/`).
- After modifying code files in this session, run `npm run graph:foe-info:update` to keep the graph current (AST-only, no API cost)
- Full Re-scan & Labeling Pipeline: Run `npm run graph:foe-info:reindex` to handle local OpenAI extraction, community labeling, and export generation (`wiki`, `callflow-html`, `obsidian`, `svg`, `html`, `tree`) using `qwen2.5-vl-7b` (automatically managing ephemeral `llama-swap` on-demand and freeing GPU VRAM on completion).
- Tool Installation Invariant: Always install or upgrade graphify using `uv tool install "graphifyy[mcp,openai,watch,svg]" --force` to preserve MCP, local LLM, file watching, and visual rendering dependencies.
