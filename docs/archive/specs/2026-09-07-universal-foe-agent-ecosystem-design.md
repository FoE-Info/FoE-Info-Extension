# Universal FoE Agent Ecosystem & Host-Aware Context Injection Design

## 1. Overview & Objective

This design establishes a **Host-Aware, Universally Portable Agent Ecosystem** across Forge of Empires browser extensions (including `FoE-Info-Extension`, `Forge-Hammer`, `FoE-Helper`, `FoE-Extender`).

### The Core Problem

Previously, subagents like `graph-knowledge-explorer` were hardcoded to treat `FoE-Info` as the sole primary codebase and labeled other extensions like `Forge-Hammer` as external "competitors". When the agent setup was used in other repositories, findings and recommendations were skewed toward comparing against FoE-Info rather than actively developing the host extension.

### The Solution

Decouple **Universal FoE Game Domain Intelligence** (pure game mechanics, InnoGames RPC protocol, BigNumber precision formulas, Historical Allies, GB locks, and MetadataStore truth) from **Repository-Specific Context** (active codebase, primary knowledge graph, and local file structure) using lightweight **Host-Aware Context Injection**.

---

## 2. Architecture & Components

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Shared FoE Domain Truth                         │
│   • InnoGames JSON-RPC APIs (StartupService, GreatBuildingsService)    │
│   • Mathematical Formulas (1.9x Arc ceiling rounding, spot locks)      │
│   • Metadata-Store Knowledge Graph (5,400+ entities, eras, allies)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Universal Domain Knowledge
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Host-Aware Workspace Layer                           │
│   • .agents/project.json (identity: name, displayName, primaryGraph)   │
│   • Active Repository (. / process.cwd()) = Primary Target             │
│   • Secondary Graphs = Peer / Reference Benchmarks                     │
│   • Findings Storage = Local ./graphify-out/findings/                  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
   ┌───────────────────────────────┐ ┌───────────────────────────────┐
   │       FoE-Info Extension      │ │     Forge-Hammer Extension    │
   │  primaryGraph:                │ │  primaryGraph:                │
   │    graphify-foe-info          │ │    graphify-forge-hammer      │
   │  peerGraph:                   │ │  peerGraph:                   │
   │    graphify-forge-hammer      │ │    graphify-foe-info          │
   │  source layout: src/js/       │ │  source layout: js/, planner/ │
   └───────────────────────────────┘ └───────────────────────────────┘
```

---

## 3. Minimal Workspace Profile (`.agents/project.json`)

Each repository declares its identity with a 5-line JSON file:

### FoE-Info-Extension (`.agents/project.json`)

```json
{
  "name": "foe-info",
  "displayName": "FoE-Info Extension",
  "primaryGraph": "graphify-foe-info",
  "runtime": {
    "moduleSystem": "esm",
    "bundler": "webpack-5",
    "uiFramework": "bootstrap-5",
    "domTooling": "native-web-api",
    "surface": "devtools-panel",
    "storage": "chrome-storage-local",
    "i18n": "custom-json-t",
    "bigNumber": true
  }
}
```

### Forge-Hammer (`.agents/project.json`)

```json
{
  "name": "forge-hammer",
  "displayName": "Forge-Hammer Extension",
  "primaryGraph": "graphify-forge-hammer",
  "runtime": {
    "moduleSystem": "vanilla-global",
    "bundler": null,
    "uiFramework": "bootstrap-4",
    "domTooling": "jquery",
    "surface": "content-injected-hud",
    "storage": "dexie-indexeddb",
    "i18n": "chrome-locales",
    "bigNumber": false
  }
}
```

### Dynamic Monolith Detection (No Static File Lists)

Monoliths and architectural bottlenecks are identified dynamically:

- Any file exceeding **250 lines** violates the modular architecture rule.
- Graphify `god_nodes` dynamically reports high-degree, highly-coupled orchestrator hubs on every graph update.
- No static lists of filenames in `project.json`.

---

## 4. Subagent Mental Model Updates

### `graph-knowledge-explorer`

1. **Host-Aware Orientation**:
   - Inspects `.agents/project.json` (or falls back to `package.json` / directory name).
   - Treats the active repository as the **primary target under development / investigation**.
   - Queries `primaryGraph` first for all AST traversals, module call-flows, and circular dependency checks.
2. **Peer Reference Graphs**:
   - Treats other extension graphs (`graphify-forge-hammer` when in FoE-Info, `graphify-foe-info` when in Forge-Hammer) as **reference peer implementations** to discover features, examine alternative designs, or verify compatibility.
3. **Game Truth**:
   - Treats `graphify-metadata-store` as the authoritative source for FoE game entity definitions and era progression.
4. **Findings Output**:
   - Saves all persistent exploration dossiers to the host repository's git-ignored `./graphify-out/findings/<topic>.md`.

### FoE Game Domain Specialists (11 Subagents)

- Focus 100% on Forge of Empires mechanics, InnoGames JSON-RPC endpoints, and mathematical precision.
- Adapt dynamically to the host repository's source directories (`src/` in FoE-Info, `js/` and `planner/` in Forge-Hammer) without hardcoding rigid paths.

### Extension Engineering & QA Specialists (10 Subagents)

- Enforce universal quality standards (single responsibility, $\le 250$ lines/file, safe DOM manipulation, CSP compliance, no wildcard permissions).

---

## 5. Rules & Skills Generalization

### Invariant Rules (`.agents/rules/*.md`)

The 15 rules become **100% identical and byte-portable** across all repositories:

1. `monolith-containment.md`: Focuses on the invariant principle — zero inline additions to files $>250$ lines; always extract to modular helpers.
2. `modular-architecture.md`: Hard cap of $\le 250$ lines/file; separates pure calculation logic from UI and network handling.
3. `graphify.md`: Uses `primaryGraph` from `.agents/project.json` (or local `graphify-out/`) as primary graph, with peer graphs as reference benchmarks.
4. `i18n-compliance.md`: Requires localized string bindings; zero hardcoded user-facing strings in templates/DOM builders using host repository's i18n system.
5. `workspace-structure.md`: Anchors working directory to the host repository (`.` / `process.cwd()`).
6. `bignumber-precision.md`: Distinguishes mathematical invariant from host library capability. InnoGames strictly uses ceiling rounding (`ROUND_CEIL`) for 1.9x Arc returns. In modern bundled codebases with `bignumber.js` installed (such as FoE-Info), use `bignumber.js`. In vanilla unbundled environments without BigNumber (such as Forge-Hammer), use native `Math.ceil()` with safe integer arithmetic, and never inject unsupported `BigNumber` imports unless the library is explicitly introduced to the host vendor bundle.

### Skills (`.agents/skills/`)

- Runbooks like `add-rpc-service` describe the canonical 5-step InnoGames RPC handler lifecycle (intercept $\to$ unpack $\to$ update state $\to$ notify UI $\to$ verify mock test), applicable to any FoE project.
- `graphify` uses local `graphify-out/` and updates the active graph.

---

## 6. Verification & Portability Criteria

1. **Zero Drift**: All 31 subagents, 15 rules, and 55 skills can be copied directly between repositories without modifying source code paths.
2. **Test Suite Completeness**: All 28+ agent configuration and hook tests pass in both `FoE-Info-Extension` and `forge-hammer`.
3. **Immediate Portability**: Adding a new FoE extension (e.g. `FoE-Helper`) requires only copying `.agents/` and creating `.agents/project.json`.
