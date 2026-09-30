---
trigger: model_decision
description: Directory organization, workspace scoping, worktrees, and artifact boundaries.
---

# Rule: Workspace & Repository Organization

This rule defines how agent activities and project repositories are structured within this workspace.

---

## 1. Directory Scoping

- **Active Repository (`FoE-Info-Extension`)**:
  - The primary open-source Chrome MV3 extension repository.
  - Houses source code (`src/`), test suites (`tests/`), Webpack configs, and local tooling.
  - Houses shared `.agents/`, `.omp/`, and `.codex/` harness sources, plus the optional Python virtual environment (`.venv/`). Agent definitions, configuration, tests, and plans are shared; the installed environment is excluded. AGENTS.md is the canonical entrypoint.

- **Sibling & Peer Repositories**:
  - `FoE-Info-Extension-original`: Frozen v1 historical reference.
  - `forge-hammer`: Active peer extension and data tool.
  - `metadata-store`: Offline entity schemas and RPC captures (read-only lab).

---

## 2. Agent Operational Directives

1. **Working Directory Scoping**:
   - All extension builds, formatting, tests, and scripts execute directly from the repository root.

2. **Shared Harness Sources (`.gitignore`)**:
   - Agent directories, plans, and backlog remain publishable and participate in reference, format, lint, and test checks. Only credentials, installed environments, and generated runtime artifacts are excluded. The published reference auditor rejects accidentally publishable credential/runtime files.
   - `graphify-out/` uses an explicit publication allowlist in `.gitignore`: graph JSON, viewer, report, incremental manifest, and portable label/signature state are shared. Other generated output stays local. [CONTRIBUTING.md](../../CONTRIBUTING.md#rebasing-and-the-tracked-graph) owns the artifact policy.
3. **Isolated Git Worktrees (`.worktrees/`)**:
   - Worktrees are created under `.worktrees/<branch>` when parallel branching is required.
   - Headless unit tests (`npm test`) execute independently inside worktrees.

4. **No IDE Configuration Sprawl (`.vscode/`, `.idea/`)**:
   - Do not generate IDE-specific configuration files (`tasks.json`, `launch.json`, `.idea/`).
   - Development relies on npm scripts, standard configurations, and agent tools.
