# Agentic Orchestration & Antigravity SDK Guidelines

Guidelines for AI agents operating within the Google Antigravity (AGY) SDK environment to maximize task autonomy, context efficiency, and execution safety.

## Subagent Delegation & Multi-Agent Architecture

- **Subagent Invocation**: Use `invoke_subagent` for parallel research, doc extraction, audit tasks, or independent multi-file refactoring.
- **Model Selection Strategy**:
  - `Model: 'flash'`: Use for fast codebase lookups, reading multiple files, and quick AST searches.
  - `Model: 'pro'` or `Model: 'inherit'`: Use for complex multi-file refactoring, architectural planning, and deep debugging.
- **Reactive Workflow (Zero Polling)**: When launching background processes or spawning subagents, do NOT poll status in a loop. The Antigravity reactive wakeup system will automatically resume execution upon receiving subagent messages or task completion events.

## Tool Execution & Sandbox Protocol

1. **Command Chaining**: Combine sequential build/test/check steps into single chained shell commands (e.g. `npm run check && npm run build && npm run graphify-update`) with `BypassSandbox: true` when accessing system binaries.
2. **Dedicated Branching**: Always create a topic branch (`feat/...` or `fix/...`) off `development` before modifying source files per [`codebase-conventions.md#git--remote-workflow-invariants`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/codebase-conventions.md).
3. **Precision Editing**: Modify source files using `replace_file_content` / `multi_replace_file_content`. Preserving existing code structure and docstrings.
4. **Verification Protocol**: Gather concrete empirical runtime verification (`npm run check` and `npm run build`) before declaring task completion.

## Tool Usage & File Operations Guardrails

- **Artifact Metadata Scope**: When writing or updating repository source files with `write_to_file`, DO NOT specify `ArtifactMetadata`. `ArtifactMetadata` is reserved strictly for markdown artifacts located within the conversation artifact directory (`<appDataDir>/brain/<conversation-id>/`).
