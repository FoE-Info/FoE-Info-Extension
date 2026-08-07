# Agent Guidelines & Source Map Index

This repository decouples project guidelines into modular rules located in `.agents/rules/`.

## Modular AGENTS.md Architecture

- **Root AGENTS.md as Source Map Index**: `AGENTS.md` at the project root must remain a lightweight index referencing modular markdown rules located in `.agents/rules/`.
- **Modular Rule Scoping**: Keep specific domain guidelines (Graphify, Git workflow, Webpack build tooling, extension invariants, conventions) separated in individual `.agents/rules/*.md` files for maintainability.

## Modular Rules Directory

- [`graphify-sourcemap.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/graphify-sourcemap.md): Knowledge Graph architecture, Graphify navigation, query tools, and git-staging rules.
- [`environment-paths.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/environment-paths.md): OSTree / Silverblue path resolution, environment auto-activation, and direct MCP tool execution.
- [`git-workflow.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/git-workflow.md): Development branch branching lifecycle, commit conventions, topic branch cleanup, and Linuxbrew tool paths.
- [`extension-architecture.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/extension-architecture.md): Chrome Manifest V3 extension guidelines, content script execution, permissions, and extension storage.
- [`webpack-build.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/webpack-build.md): Webpack 5 bundling, dev vs webstore builds, and environment execution.
- [`codebase-conventions.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/codebase-conventions.md): jQuery DOM injection, network request dispatching, BigNumber precision math, and service interfaces.
- [`agentic-orchestration.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/agentic-orchestration.md): Google Antigravity SDK workflows, subagent delegation, model selection strategy, reactive execution, and verification protocols.
