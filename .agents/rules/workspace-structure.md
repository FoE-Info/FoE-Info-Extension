---
trigger: always_on
description: Directory organization, workspace scoping, and artifact management rules for FoE-Info-Extension.
---

# Rule: Workspace & Repository Organization

This rule defines how agent activities and project repositories are structured within this workspace.

---

## 1. Directory Scoping

* **Workspace & Repository Root (`FoE-Info-Extension`)**:
  - Primary Git repository and root for the active Forge of Empires browser extension.
  - Contains application source code (`src/`), Webpack build configurations, and `package.json`.
  - Hosts agent configurations (`.agents/`), rules, skills, and knowledge graph index (`graphify-out/`).

---

## 2. Agent Operational Directives

1. **Working Directory Scoping**:
   - All builds, formatting, tests, git operations, and scripts execute directly from the active project root (`.` / `process.cwd()`).
2. **Artifact & Agent Management**:
   - `.agents/` and `AGENTS.md` are tracked in Git so all branches and worktrees natively inherit the customization ecosystem.
   - `graphify-out/` and `.worktrees/` are git-ignored in `.gitignore`. Graphify index artifacts reside directly in `graphify-out/`.
3. **Artifact vs. Code Boundaries**:
   - When writing repository files (code, scripts, markdown in `docs/`), **never** pass `ArtifactMetadata` to `write_to_file`.
   - `ArtifactMetadata` is strictly reserved for artifacts located inside the conversation brain directory: `<appDataDir>/brain/<conversation-id>/...`. Passing it for repository paths triggers a cortex permission rejection.
4. **Isolated Git Worktrees (`.worktrees/`) & Parallel Agent Execution**:
   - Worktrees are created under `.worktrees/<branch>` (ignored by `.gitignore`).
   - For parallel feature tasks or multi-agent execution, dispatch subagents with `Workspace: "share"` to isolate branch checkouts and avoid dirty working tree collisions.
   - Node module resolution walks up directory trees automatically to root `node_modules/` (no duplicate `npm install` needed).
   - Headless unit tests (`npm test`) execute independently inside worktrees. Integration and live browser testing via `foe-browser` execute on the root workspace after merging into `development`.
   - Because `.agents/` and `AGENTS.md` are tracked in Git, newly created worktrees automatically inherit all 31 subagents, 16 rules, and 51 skills upon checkout.
5. **No IDE Configuration Files (`.vscode/`, `.idea/`)**:
   - Never create, generate, or restore `.vscode/`, `.idea/`, or IDE-specific configuration files (`tasks.json`, `launch.json`, `settings.json`, `mcp.json`).
   - This workspace is strictly agentic and CLI-driven. Task execution relies exclusively on package task runners and agent tooling.
