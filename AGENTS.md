# Agent Instructions

## Scope

- Root instructions apply repository-wide.
- Load the relevant `.agents/instructions/` file before editing its scope.
- Preserve unrelated working-tree changes.

## Modular Instructions

| Scope        | Instructions                         |
| ------------ | ------------------------------------ |
| `src/**`     | `.agents/instructions/source.md`     |
| `src/chrome` | `.agents/instructions/chrome.md`     |
| `src/css`    | `.agents/instructions/css.md`        |
| `src/js`     | `.agents/instructions/javascript.md` |

- Path-specific instructions supplement `source.md`.

## Package Manager

- Use npm 12 with Node.js 24+: `npm install`, `npm run dev`, `npm run build`.
- Treat `package-lock.json` as authoritative; do not add another lockfile.

## File-Scoped Commands

| Task             | Command                                   |
| ---------------- | ----------------------------------------- |
| Check formatting | `npx --yes prettier@3.9.6 --check <file>` |
| Format           | `npx --yes prettier@3.9.6 --write <file>` |

- No application linter, type checker, or test runner is configured.
- Run `npm run build` after source, manifest, dependency, or Webpack changes.

## Key Conventions

- This is a Manifest V3 DevTools extension; Webpack entries live in `webpack.common.js`.
- Use Graphify before broad codebase searches when `graphify-out/graph.json` exists.
- Run `graphify update .` after code changes; treat `graphify-out/` as generated.
- See `README.md` for setup and `docs/INDEX.md` for maintained documentation.

## Commit Attribution

- AI commits MUST include:

```text
Co-Authored-By: (the agent model's name and attribution byline)
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
