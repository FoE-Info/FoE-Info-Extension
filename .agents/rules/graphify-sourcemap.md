# Codebase Knowledge Graph & Source Map Rules

This repository enforces the Graphify Knowledge Graph in `graphify-out/` as the **mandatory primary sourcemap** for codebase architecture, god nodes, community dependencies, and file relationships.

## Rules & Navigation Workflow

- **Primary Architectural Sourcemap**: AI agents MUST reference [`graphify-out/graph.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/graph.json) and [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) as the primary architectural sourcemap before conducting broad codebase file searches.
- **Graphify Navigation & MCP Queries**: For architectural questions, dependency tracing, or module relationships:
  - **MCP Tools**: Query `graphify-foe-info` MCP tools (`query_graph`, `god_nodes`, `shortest_path`, `get_community`, `get_neighbors`) FIRST for zero-token AST lookups.
  - **CLI Tools**: Execute `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` when analyzing call chains or module boundaries.
- **Architecture Overview**: Consult [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) for core abstractions (god nodes), community breakdown, and cross-module couplings.
- **Graph Freshness & Maintenance**: Compare graph build commit in `GRAPH_REPORT.md` with `git rev-parse HEAD`. After introducing or editing source code, execute `npm run graphify-update` (or `graphify update .`) to update the AST graph structure.
- **Git Staging Invariant**: `graphify-out/` is git-ignored. NEVER pass `graphify-out/` to `git add` during commits; keep the graph updated locally without committing `graphify-out/` artifacts.
