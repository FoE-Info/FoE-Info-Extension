# Agentic Workflow & Codebase Maintenance Guide

Cheatsheet and reference guide for AI Coding Agents working on `FoE-Info-Extension`.

---

## 1. Environment & Execution Context

### Tool & Environment Auto-Load

The local repository environment is managed via:

- `.mise.toml`: Configures `mise` tool versions (`node`, `uv`) and `PATH`.
- `.envrc`: Configures `direnv` integration and environment variables.
- `.env`: Defines project environment variables (`PATH`, `NODE_ENV`).
- `.vscode/settings.json`: Injects PATH into integrated terminal sessions.

### Command Execution

When running shell commands via agent tools (`run_command`), set `BypassSandbox: true` to access system Homebrew binaries (`/var/home/linuxbrew/.linuxbrew/bin`) seamlessly.

---

## 2. Graphify AST Knowledge Graph Protocol

Always query the knowledge graph before editing codebase logic:

### MCP Server Lazy Tools

Use lazy MCP tools on server `graphify-foe-info`:

- `query_graph`: Natural language search across AST nodes and edges.
- `god_nodes`: Inspect top central nodes in the codebase.
- `get_community`: Inspect related clusters of modules.
- `shortest_path`: Trace relationship pathways between functions/files.

### CLI Commands

```bash
# Update AST graph after code modifications
npm run graphify-update
# or
graphify update .

# Query graph architecture via CLI
graphify query "how does GreatBuildingsService process donations"
```

---

## 3. Git Branching & Verification Lifecycle

Follow the strict branching lifecycle defined in [`git-workflow.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/git-workflow.md):

1. **Branch Creation**:
   ```bash
   git checkout development && git checkout -b feat/<feature-name>
   ```
2. **Editing**:
   Use `replace_file_content` / `multi_replace_file_content` for surgical modifications.
3. **Verification**:
   ```bash
   npm run check
   npm run build-foe-info
   ```
4. **Graph Synchronization**:
   ```bash
   npm run graphify-update
   ```
5. **Merge & Topic Branch Cleanup**:
   ```bash
   git checkout development && git merge feat/<feature-name>
   git branch -d feat/<feature-name>
   ```
