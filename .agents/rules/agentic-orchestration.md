# Agentic Orchestration & Graphify Guidelines

Guidelines for AI agents working on this repository to maximize context precision, code safety, and workflow autonomy.

## AST Knowledge Graph First Workflow

- **Architectural Lookups**: Before modifying any JS modules, execute `graphify query "<feature_or_module>"` or call MCP lazy tools (`query_graph`, `god_nodes`, `shortest_path`) on the `graphify-foe-info` server.
- **Dependency Awareness**: Inspect circular dependencies documented in `graphify-out/GRAPH_REPORT.md` before refactoring imports between `index.js`, `msg/*Service.js`, and `fn/*.js`.
- **Graph Updates**: After adding or modifying source code, run `npm run graphify-update` (or `graphify update .`) to update the AST graph. Do not stage `graphify-out/` into git commits.

## Subagent Task Delegation

- Use Antigravity subagent invocation (`invoke_subagent`) for large research or parallel tasks (e.g. `webpack-expert` review, `chrome-extensions` compliance check).
- When initializing background tasks, rely on system notifications instead of polling loops.

## Codebase Modification Protocol

1. Create a dedicated git topic branch (`feat/...` or `fix/...`) off `development` before editing files per [`git-workflow.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/git-workflow.md).
2. Edit source files with precision tools (`replace_file_content` / `multi_replace_file_content`).
3. Run verification checks (`npm run check` and `npm run build-foe-info`).
4. Update Graphify AST graph (`npm run graphify-update`).
