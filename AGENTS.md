# Agent Guidelines & Source Map

## Codebase Knowledge Graph & Source Map

This repository maintains a pre-built knowledge graph in `graphify-out/` detailing codebase architecture, god nodes, community dependencies, and file relationships.

### Rules & Navigation Workflow:
- **Source Map & Architecture**: Reference [`graphify-out/graph.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/graph.json) and [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) as the primary architectural source map for this codebase.
- **Codebase Queries**: For architectural questions, dependency tracing, or module relationships, execute `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for node-to-node path analysis and `graphify explain "<concept>"` for module deep dives.
- **Architecture Overview**: Consult [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) for core abstractions (god nodes), community breakdown, and cross-module couplings.
- **Graph Maintenance**: After introducing or editing code, run `graphify update .` to update the AST graph structure.

## Git & Branching Workflow
- **Development Branch (`development`)**: The primary development and integration branch is `development`. Do not commit directly to `development`. All feature work and bug fixes must fork off `development` in dedicated topic branches (e.g. `fix/<topic-name>` or `feat/<topic-name>`).
- **Branch Lifecycle**:
  1. **Create Branch BEFORE Editing**: Always run `git checkout development && git checkout -b fix/<topic-name>` prior to modifying any source files.
  2. Implement, verify, and commit changes with conventional commit messages (`fix(...)`, `feat(...)`).
  3. Merge back to `development`: `git checkout development && git merge fix/<topic-name>`.
  4. Clean up topic branch after merge: `git branch -d fix/<topic-name>`.

## Environment & Tooling Execution
- **Node / NPM Binary Paths**: Node and NPM are installed via Linuxbrew (`/home/linuxbrew/.linuxbrew/bin`). When executing `npm` or `node` commands, prefix PATH with `export PATH=/home/linuxbrew/.linuxbrew/bin:$PATH` and use `BypassSandbox: true`.

## Extension & DevTools Code Invariants
- **API Scope Guards**: Background-only extension APIs (`chrome.webRequest`, `browser.runtime.onInstalled`) must be guarded before execution inside DevTools panel scripts (`index.js` / `panel.html`).
- **Safe Extension Property Access**: Use optional chaining for DevTools panel properties (`browser?.devtools?.panels?.themeName || 'default'`).
- **HAR & Network Response Parsing**: Always wrap `JSON.parse` on network payload bodies inside `try/catch` blocks, handle `base64` decoded payloads, and use lowercase header matching with optional chaining (`response.headers?.find(h => h.name.toLowerCase() === 'content-type')`).
- **No `.catch()` on Synchronous Iterators**: Never chain `.catch()` on `Array.prototype.forEach` or synchronous iterators (which return `undefined`). Use `try/catch` inside the iterator callback or wrap async promises in `Promise.all(array.map(async ...))`.

