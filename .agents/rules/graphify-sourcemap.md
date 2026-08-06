# Codebase Knowledge Graph & Source Map Rules

This repository maintains a pre-built knowledge graph in `graphify-out/` detailing codebase architecture, god nodes, community dependencies, and file relationships.

## Rules & Navigation Workflow

- **Source Map & Architecture**: Reference [`graphify-out/graph.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/graph.json) and [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) as the primary architectural source map for this codebase.
- **Codebase Queries**: For architectural questions, dependency tracing, or module relationships, execute `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for node-to-node path analysis and `graphify explain "<concept>"` for module deep dives.
- **Architecture Overview**: Consult [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) for core abstractions (god nodes), community breakdown, and cross-module couplings.
- **Graph Maintenance**: After introducing or editing code, run `graphify update .` to update the AST graph structure.
- **Git Staging & Ignored Artifacts**: `graphify-out/` is excluded by `.gitignore`. Never pass `graphify-out/` to `git add` during commits; run `graphify update .` locally to keep the knowledge graph synchronized without staging it into git index.
