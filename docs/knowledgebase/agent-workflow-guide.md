# Agentic Workflow & Codebase Maintenance Guide

Comprehensive cheatsheet, operational reference, and workflow guide for AI Coding Agents and developers working on **`FoE-Info-Extension`**.

---

## 1. Environment & Runtime Context

### Environment & Tool Auto-Loading

The local repository environment is managed cross-platform via `mise` and `direnv`:

- **`.mise.toml`**: Configures Node.js 22, Python 3.12, the latest `uv`, project-local executable paths, and `.env`/`.env.local` loading.
- **`.envrc`**: Enables `direnv` integration where available.
- **`.agents/env.sh`**: Resolves the repository root, activates `mise`/local executable paths, and loads `.env` followed by `.env.local` for non-interactive agent shells.

### Command Execution

Always run task scripts via `mise run <task>` or standard `npm run <task>` invocations:

```bash
# Environment Setup
mise run setup        # Installs toolchains via mise & dependencies via npm

# Verification & Quality Checks
npm run check         # Prettier formatting check
npm run format        # Auto-format codebase
npm run build         # Production Webpack compilation & ZIP packaging
npm run dev           # Watch mode development build
npm run graphify-update # AST knowledge graph synchronization via uvx
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
   - Only use `BypassSandbox: true` when executing host system binaries or accessing non-sandboxed tools (e.g. `uvx --from "graphifyy[gemini,mcp]" graphify ...`).

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

## 4. Graphify Knowledge Graph Protocol

The codebase maintains a persistent knowledge graph in [`graphify-out/`](../../graphify-out). Source code is extracted deterministically through AST analysis; changed documentation, papers, and images can add semantic nodes and inferred relationships.

### CLI & MCP Tools

Before modifying codebase logic, query the knowledge graph to understand symbol dependencies and community clusters:

- **MCP Lazy Tools (`graphify`)**:
  - `query_graph`: Natural language search across AST nodes and edges.
  - `god_nodes`: Inspect top central nodes in the codebase.
  - `get_community`: Inspect related clusters of modules.
  - `shortest_path`: Trace relationship pathways between functions/files.

- **CLI Commands**:
  ```bash
  # Query architecture or function relationships
  uvx --from "graphifyy[gemini,mcp]" graphify query "how does GreatBuildingsService process donations"

  # Incrementally update code changes through deterministic AST extraction
  uvx --from "graphifyy[gemini,mcp]" graphify update .

  # Incrementally extract semantic content with richer inferred relationships
  uvx --from "graphifyy[gemini,mcp]" graphify extract . --mode deep

  # Refresh communities, the report, and the interactive visualization
  uvx --from "graphifyy[gemini,mcp]" graphify cluster-only .

  # Preserve curated labels and fill only missing community names
  uvx --from "graphifyy[gemini,mcp]" graphify label . --missing-only

  # Keep docs queryable while omitting local docs from surprise ranking
  npm run graphify-filter-surprises
  ```

### Interpreting Graph Results

Graphify combines deterministic source extraction with model-assisted semantic extraction. Use the graph as a navigation aid and verify architectural conclusions against source code:

- Treat `INFERRED` edges as hypotheses until their source relationship is confirmed.
- A file that produces no semantic nodes is not evidence that the file is irrelevant; Graphify keeps empty extractions eligible for later retries.
- A dropped hyperedge means its referenced node IDs did not resolve in the built graph. The underlying concepts or source files may still be present under different canonical IDs.
- Prefer source locations and deterministic call/import edges when graph output conflicts with implementation details.
- Review extraction, graph-health, deduplication, and missing-node warnings before treating an update as complete.
- After any command that regenerates `GRAPH_REPORT.md`, run `npm run graphify-filter-surprises`. The standard `npm run graphify-update` and `mise run graphify-update` tasks do this automatically.
- Interpret the filtered **Surprising Connections** section as exploration, not a defect verdict. The repository adds only the local `docs/` exclusion; Graphify's normal candidate and ranking rules remain in effect.
- Keep generated metrics in [`GRAPH_REPORT.md`](../../graphify-out/GRAPH_REPORT.md) instead of copying them into long-lived documentation where they can become stale.

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
   uvx --from "graphifyy[gemini,mcp]" graphify update .
   ```
5. **Merge & Branch Cleanup**:
   ```bash
   git checkout development && git merge feat/<feature-name>
   git branch -d feat/<feature-name>
   ```
