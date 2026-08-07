# Agentic Workflow & Codebase Maintenance Guide

Comprehensive cheatsheet, operational reference, and workflow guide for AI Coding Agents and developers working on **`FoE-Info-Extension`**.

---

## 1. Environment & Runtime Context

### Environment & Tool Auto-Loading
The local repository environment is managed cross-platform via `mise` and `direnv`:
- **`.mise.toml`**: Configures required versions for `node` (v22.x) and `uv`.
- **`.envrc`**: Enables `direnv` integration to auto-load `.env`.
- **`.env`**: Sets project execution variables (`NODE_ENV`).

### Command Execution
Always run task scripts via `mise` or standard `npm` invocations:
```bash
# Verification & Quality Checks
npm run check         # Prettier formatting check
npm run format        # Auto-format codebase
npm run build         # Production Webpack compilation & ZIP packaging
npm run dev           # Watch mode development build
```

---

## 2. Antigravity Agent Orchestration & Customizations

### Agentic Orchestration Principles
When operating within the Google Antigravity (AGY) SDK environment:
1. **Subagent Delegation**:
   - Use `Model: 'flash'` for rapid, read-only research, file inspection, and AST lookups.
   - Use `Model: 'pro'` or `Model: 'inherit'` for complex multi-file refactoring, architectural planning, and deep debugging.
2. **Reactive Zero-Polling Execution**:
   - When launching background processes or spawning subagents, do **NOT** poll status in a loop.
   - The Antigravity reactive wakeup system will automatically resume agent execution upon event completion or subagent response.
3. **Sandbox Protocol**:
   - Run commands in Standard Sandbox mode first.
   - Only use `BypassSandbox: true` when executing host system binaries or accessing non-sandboxed tools (e.g. `mise exec -- graphify ...`).

### Workspace Customization Structure (`.agents/`)
The workspace exposes agent behaviors via standard customization roots:
- **Rules (`.agents/rules/*.md`)**:
  - [`agentic-orchestration.md`](../../.agents/rules/agentic-orchestration.md): Subagent delegation, model selection, and zero-polling rules.
  - [`codebase-conventions.md`](../../.agents/rules/codebase-conventions.md): Git push approval requirements, service architecture, and documentation hierarchy.
  - [`environment-paths.md`](../../.agents/rules/environment-paths.md): Tool resolution paths via `mise` shims and MCP config standards.
  - [`extension-architecture.md`](../../.agents/rules/extension-architecture.md): Chrome Manifest V3 entry points and security invariants.
  - [`graphify.md`](../../.agents/rules/graphify.md): Knowledge graph query protocols.
  - [`webpack-build.md`](../../.agents/rules/webpack-build.md): Webpack compilation checklist.
- **Skills (`.agents/skills/`)**: Specialized domain cheatsheets (`css-expert`, `html-expert`, `javascript-expert`, `jquery-expert`, `nodejs-expert`, `webpack-expert`).
- **Plugins (`.agents/plugins/`)**:
  - `chrome-devtools-plugin`: Browser automation, a11y, LCP, and memory leak debugging skills.
  - `google-antigravity-sdk`: Agent design, orchestration, subagent delegation, and safety policy reference docs.
  - `modern-web-guidance-plugin`: Manifest V3 extension guidelines and Webstore publishing tools.

---

## 3. Model Context Protocol (MCP) Integration

The extension project connects to MCP servers configured in [`.agents/mcp_config.json`](../../.agents/mcp_config.json):

### Server Naming & Configuration Standards
1. **Naming Invariant**: Server keys MUST use underscored identifiers matching system definitions (e.g., `chrome_devtools`) to prevent duplicate registration.
2. **Executable Resolution**: Use `npx` or `~/.local/share/mise/shims/npx` rather than version-specific absolute paths.
3. **Chrome DevTools MCP Flags**: Include required feature flags for full capability:
   - `--experimentalMemory`: Enables heap snapshot inspection and memory leak analysis.
   - `--experimentalScreencast`: Enables visual UI screencasting and interactive testing.

---

## 4. Graphify AST Knowledge Graph Protocol

The codebase maintains a persistent AST knowledge graph in [`graphify-out/`](../../graphify-out).

### CLI & MCP Tools
Before modifying codebase logic, query the knowledge graph to understand symbol dependencies and community clusters:

* **MCP Lazy Tools (`graphify`)**:
  - `query_graph`: Natural language search across AST nodes and edges.
  - `god_nodes`: Inspect top central nodes in the codebase.
  - `get_community`: Inspect related clusters of modules.
  - `shortest_path`: Trace relationship pathways between functions/files.

* **CLI Commands**:
  ```bash
  # Query architecture or function relationships
  mise exec -- graphify query "how does GreatBuildingsService process donations"
  
  # Update AST graph after code modifications (AST-only, zero API cost)
  mise exec -- graphify update .
  ```

---

## 5. Git Branching & Verification Lifecycle

Follow the strict branching lifecycle defined in [`git-workflow.md`](../../.agents/rules/git-workflow.md):

1. **Topic Branch Creation**:
   ```bash
   git checkout development && git checkout -b feat/<feature-name>
   ```
2. **Precision Editing**:
   Use `replace_file_content` / `multi_replace_file_content` for surgical modifications while preserving comments and docstrings.
3. **Runtime Verification**:
   ```bash
   npm run check
   npm run build
   ```
4. **Graph Synchronization**:
   ```bash
   mise exec -- graphify update .
   ```
5. **Merge & Branch Cleanup**:
   ```bash
   git checkout development && git merge feat/<feature-name>
   git branch -d feat/<feature-name>
   ```
