# Agentic Orchestration & Antigravity SDK Guidelines

Guidelines for AI agents operating within the Google Antigravity (AGY) SDK environment to maximize task autonomy, context efficiency, and execution safety.

## Subagent Delegation & Multi-Agent Architecture

- **Subagent Invocation**: Use `invoke_subagent` for parallel research, doc extraction, audit tasks, or independent multi-file refactoring.
- **Model Selection Strategy**:
  - `Model: 'flash'`: Use for fast codebase lookups, reading multiple files, and quick AST searches.
  - `Model: 'pro'` or `Model: 'inherit'`: Use for complex multi-file refactoring, architectural planning, and deep debugging.
- **Reactive Workflow (Zero Polling)**: When launching background processes or spawning subagents, do NOT poll status in a loop. The Antigravity reactive wakeup system will automatically resume execution upon receiving subagent messages or task completion events.

## Tool Execution & Sandbox Protocol

1. **Command Execution**: Run commands in the standard sandbox first. Chain commands only when later steps must stop after an earlier failure; request elevated execution only after a required command fails because of sandbox restrictions.
2. **Dedicated Branching**: Always create a topic branch (`feat/...` or `fix/...`) off `development` before modifying source files per [`codebase-conventions.md#git--remote-workflow-invariants`](./codebase-conventions.md#git--remote-workflow-invariants).
3. **Precision Editing**: Use the host's patch-based editing tool for surgical changes while preserving existing structure, comments, and docstrings.
4. **Verification Protocol**: Gather concrete empirical runtime verification (`npm run check` and `npm run build`) before declaring task completion.
5. **Path Guardrail**: Use absolute paths for tool-call path parameters when the tool does not establish a working directory. Keep paths inside version-controlled project configuration relative to the repository root so clones remain portable; use absolute paths only when an external tool explicitly requires them.

## Tool Usage & File Operations Guardrails

- **Artifact Metadata Scope**: When writing or updating repository source files with `write_to_file`, DO NOT specify `ArtifactMetadata`. `ArtifactMetadata` is reserved strictly for markdown artifacts located within the conversation artifact directory (`<appDataDir>/brain/<conversation-id>/`).
