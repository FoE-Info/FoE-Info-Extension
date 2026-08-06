# Agent Guidelines & Source Map

## Codebase Knowledge Graph & Source Map

This repository maintains a pre-built knowledge graph in `graphify-out/` detailing codebase architecture, god nodes, community dependencies, and file relationships.

### Rules & Navigation Workflow:

- **Source Map & Architecture**: Reference [`graphify-out/graph.json`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/graph.json) and [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) as the primary architectural source map for this codebase.
- **Codebase Queries**: For architectural questions, dependency tracing, or module relationships, execute `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for node-to-node path analysis and `graphify explain "<concept>"` for module deep dives.
- **Architecture Overview**: Consult [`graphify-out/GRAPH_REPORT.md`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/graphify-out/GRAPH_REPORT.md) for core abstractions (god nodes), community breakdown, and cross-module couplings.
- **Graph Maintenance**: After introducing or editing code, run `graphify update .` to update the AST graph structure.
- **Git Staging & Ignored Artifacts**: `graphify-out/` is excluded by `.gitignore`. Never pass `graphify-out/` to `git add` during commits; run `graphify update .` locally to keep the knowledge graph synchronized without staging it into git index.

## Git & Branching Workflow

- **Development Branch (`development`)**: The primary development and integration branch is `development`. Do not commit directly to `development`. All feature work and bug fixes must fork off `development` in dedicated topic branches (e.g. `fix/<topic-name>` or `feat/<topic-name>`).
- **Branch Lifecycle**:
  1. **Create Branch BEFORE Editing**: Always run `git checkout development && git checkout -b fix/<topic-name>` prior to modifying any source files.
  2. Implement, verify, and commit changes with conventional commit messages (`fix(...)`, `feat(...)`).
  3. Merge back to `development`: `git checkout development && git merge fix/<topic-name>`.
  4. Clean up topic branch after merge: `git branch -d fix/<topic-name>`.

## Environment & Tooling Execution

- **Node / NPM Binary Paths**: Node and NPM are installed via Linuxbrew (`/var/home/linuxbrew/.linuxbrew/bin` and `/home/linuxbrew/.linuxbrew/bin`). When executing `npm` or `node` commands, prefix PATH with `export PATH=/var/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/bin:$PATH` and use `BypassSandbox: true`.

## Build & Tooling Invariants

- **Modular Webpack Setup**: Webpack configuration uses `webpack-merge` to combine `webpack.common.js` with `webpack.dev.js` (for dev builds) and `webpack.prod.js` (for production webstore builds and ZIP creation). Do not recreate monolithic `webpack-dev.config.js` or `foe-info-webstore.config.js`.
- **Webpack 5 Asset Modules**: Use native Webpack 5 Asset Modules (`type: 'asset/resource'`) for image assets rather than deprecated `file-loader`.
- **Cross-Platform NPM Scripts**: Use `cross-env` for setting `NODE_ENV` in `package.json` scripts.
- **Webpack SplitChunks Vendor Optimization**: Configure `optimization.splitChunks` for shared vendor dependencies (`node_modules`) to eliminate bundle duplication across multi-entrypoint setups (app, options, popup, devtools) and keep asset JS sizes under Webpack performance warning limits (< 244 KiB).

## Extension & DevTools Code Invariants

- **API Scope Guards**: Background-only extension APIs (`chrome.webRequest`, `browser.runtime.onInstalled`) must be guarded before execution inside DevTools panel scripts (`index.js` / `panel.html`).
- **Safe Extension Property Access**: Use optional chaining for DevTools panel properties (`browser?.devtools?.panels?.themeName || 'default'`).
- **HAR & Network Response Parsing**: Always wrap `JSON.parse` on network payload bodies inside `try/catch` blocks, handle `base64` decoded payloads, and use lowercase header matching with optional chaining (`response.headers?.find(h => h.name.toLowerCase() === 'content-type')`).
- **No `.catch()` on Synchronous Iterators**: Never chain `.catch()` on `Array.prototype.forEach` or synchronous iterators (which return `undefined`). Use `try/catch` inside the iterator callback or wrap async promises in `Promise.all(array.map(async ...))`.
- **FoE FP Calculations & Arc Rounding**: Always use Rounding UP (`BigNumber.ROUND_CEIL` / `.dp(0, 2)` or `Math.ceil`) for Arc bonus rewards and spot lock calculations to match FoE game mechanics. Never hardcode static multipliers like `1.9` where dynamic percentages (`currentPercent / 100`) apply.
- **Live State Synchronization**: When processing game contribution events (e.g. `contributeForgePoints`), immediately synchronize state totals (`GBselected.current`) via payload data (`invested_forge_points`) or ranking diffs so remaining counts and spot safety re-evaluate live without window reloads.
- **Network Interception & Debounced Storage**: Network packet listeners (`chrome.devtools.network.onRequestFinished`) must never invoke `chrome.storage.local.set` synchronously on incoming events. Always debounce storage writes for cumulative definitions (`CityEntityDefs`).
- **Metadata Type Guards**: `processMetadataEntry` and payload parsers must strictly validate entity attributes before assigning `.id` keys or storing objects in definition maps. Never recurse over un-guarded object keys to avoid recursive state tree pollution.
- **Proxy & Alias Key Deduplication**: When managing large entity definition lookup maps with alias prefixes or alternate IDs (e.g. `CityEntityDefs`), avoid duplicating full payload objects under multiple keys in memory and `chrome.storage`. Store canonical objects in a primary map (`rawCityEntityDefs`), maintain an `entityAliasMap`, and use an ES6 `Proxy` with `get`/`has` traps to dynamically resolve alias variations. When persisting to extension storage, always serialize the underlying raw object target (`rawCityEntityDefs`), not the Proxy wrapper.
- **Concurrent Mirror CDN Fetching**: When fetching static game assets or metadata definitions across mirror CDNs, execute parallel requests using `Promise.any()` rather than sequential fallback iterations to eliminate startup latency overhead.
- **Per-Key Storage Debouncing Queue**: Use a centralized per-key debouncing queue for storage updates (`storage.set`) so rapid network events or batch handlers collapse duplicate storage write operations into scheduled, debounced flushes.
- **DOM Batching & Memory Leak Prevention**: Never use repeated string appends (`container.innerHTML += ...`) inside network event handlers or packet interception callbacks (`handleRequestFinished`). Use `document.createElement` and `appendChild` scheduled via `requestAnimationFrame` to avoid continuous DOM re-parsing, memory growth, and main-thread UI freezing.

