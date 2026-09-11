---
trigger: always_on
description: Query graphify knowledge graphs (MCP or CLI) for codebase architecture, module relationships, or FoE entity questions.
---

## graphify

This project integrates Graphify knowledge graphs at `graphify-out/`.

Rules:
- Query-First Protocol: For codebase or architecture questions, always consult Graphify BEFORE performing wide grep searches or reading multiple source files.
- **Mechanical Hook Enforcement**: When invoked by its host, `.agents/scripts/graphify-guard.mjs` blocks broad source searches without a shared filesystem stamp younger than 1800 seconds. Its pre-tool handler also stamps Graphify commands, including updates; this is not proof of a successful query in the current session.
- **MCP Invocation (Lazy Loaded)**: Call via `call_mcp_tool` with `ServerName: "graphify-foe-info"` (or `graphify-metadata-store` / `graphify-forge-hammer`):
  - `query_graph`: semantic context & broad question answering (`{"question": "<question>"}`)
  - `get_node`: inspect symbol/class/function definition and details (`{"label": "<name>"}`)
  - `get_neighbors`: inspect immediate callers, callees, and dependencies (`{"label": "<name>"}`)
  - `shortest_path`: trace connection path between two modules (`{"source": "<A>", "target": "<B>"}`)
  - `god_nodes`: identify core high-degree architectural hubs (`{"top_n": 10}`)
  - `get_community`: inspect architectural clusters and boundaries (`{"community_id": <id>}`)
  - `graph_stats`: inspect graph density, total nodes, and edge counts
  - `list_prs` / `get_pr_impact` / `triage_prs`: PR impact and blast radius analysis
- **CLI Fallbacks**: When MCP is unavailable, run `graphify query "<q>"`, `graphify explain "<concept>"`, `graphify path "<A>" "<B>"`, or `graphify stats` via `run_command` in the project root.
- **Available Graph Datasets**:
  - **Host Target Graph**: `graphify-foe-info` (FoE-Info AST, module dependencies, call graphs).
  - **FoE Game Ground Truth**: `graphify-metadata-store` (5,400+ game entities, eras, resources, technologies, Great Buildings, Historical Allies).
  - **Peer Reference Graphs**: `graphify-forge-hammer` (peer extension graph for cross-extension pattern discovery and compatibility checks).
- **Autonomous Deep Exploration & Comparison Delegation**:
  - Whenever the user requests host graph exploration, architectural investigation, or subsystem mapping, delegate to `graph-knowledge-explorer` (treats FoE-Info as an independent project, saving findings to `./graphify-out/foe-info/findings/`).
  - Whenever the user requests comparison or benchmarking against Forge-Hammer, delegate to `forge-hammer-comparator` (saves comparative findings strictly to `./graphify-out/forge-hammer/findings/` without modifying Forge-Hammer).
- After modifying code files in this session, run `npm run graph:foe-info:ast` (or the host's graph update command) to keep the AST current.
- Tool Installation Invariant: Always install or upgrade graphify using `uv tool install "graphifyy[mcp,openai,watch,svg]" --force` to preserve MCP, local LLM, file watching, and visual rendering dependencies.
