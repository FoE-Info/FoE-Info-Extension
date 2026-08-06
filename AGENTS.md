# Agent Guidelines & Source Map Index

This repository decouples project guidelines into modular rules located in `.agents/rules/`.

## Modular AGENTS.md Architecture

- **Root AGENTS.md as Source Map Index**: `AGENTS.md` at the project root must remain a lightweight index referencing modular markdown rules located in `.agents/rules/`.
- **Modular Rule Scoping**: Keep specific domain guidelines (Graphify, Git workflow, Webpack build tooling, extension invariants, conventions) separated in individual `.agents/rules/*.md` files for maintainability.

## Modular Rules Directory

- [`graphify-sourcemap.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/graphify-sourcemap.md): Knowledge Graph architecture, Graphify navigation, query tools, and git-staging rules.
- [`git-workflow.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/.agents/rules/git-workflow.md): Development branch branching lifecycle, commit conventions, topic branch cleanup, and Linuxbrew tool paths.
