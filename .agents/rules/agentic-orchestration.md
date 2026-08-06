# Agentic Orchestration & Graphify Guidelines

Guidelines for AI agents working on this repository to maximize context precision, code safety, and workflow autonomy.

## AST Knowledge Graph First Workflow

- **Architectural Lookups**: Before modifying any JS modules, query lazy MCP tools on the `graphify-foe-info` server (`query_graph`, `god_nodes`, `shortest_path`, `get_community`) for zero-cost in-memory AST context. Use `npm run graphify-update` for CLI updates.
- **Dependency Awareness**: Inspect circular dependencies documented in [`docs/knowledgebase/circular-dependencies.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/docs/knowledgebase/circular-dependencies.md) and `graphify-out/GRAPH_REPORT.md` before refactoring imports between `index.js`, `msg/*Service.js`, and `fn/*.js`.
- **Graph Updates**: After adding or modifying source code, run `npm run graphify-update` to update the AST graph. Do not stage `graphify-out/` into git commits.

## Subagent Task Delegation & Model Selection

- **Subagent Invocation**: Use `invoke_subagent` for parallel research, audit tasks, or multi-file refactoring.
- **Model Selection Strategy**:
  - `Model: 'flash'`: Use for rapid codebase searches, file reading, and AST graph lookups.
  - `Model: 'pro'` or `Model: 'inherit'`: Use for complex multi-file refactoring, architectural planning, and debugging.
- **Async Execution**: Rely on reactive system notifications when background tasks finish; do not poll status in a loop.

## Tool Execution Efficiency & Protocol

1. **Command Chaining**: Combine sequential build/test/check steps into single chained shell commands (e.g. `npm run check && npm run build-foe-info && npm run graphify-update`) with `BypassSandbox: true`.
2. **Dedicated Branching**: Always create a topic branch (`feat/...` or `fix/...`) off `development` before modifying source files per [`git-workflow.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/git-workflow.md).
3. **Precision Editing**: Modify source files using `replace_file_content` / `multi_replace_file_content`.
4. **Verification**: Run `npm run check` and `npm run build-foe-info` after changes.
