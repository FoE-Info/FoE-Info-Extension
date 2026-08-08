# FoE-Info-Extension Documentation Index

Welcome to the **FoE-Info-Extension** documentation hub. This directory contains comprehensive documentation for developers, maintainers, and AI coding agents working on the repository.

---

## 1. Top-Level Overviews (`docs/`)

High-level architectural, service, and utility overviews designed for onboarding and system understanding:

- **[System Architecture Guide](system-architecture.md)**
  - Chrome Manifest V3 security boundaries & permissions rationale.
  - Out-of-band network request interception lifecycle (`browser.devtools.network.onRequestFinished`).
  - Webpack 5 development and production build pipeline architecture.
  - High-level Mermaid.js component interaction and execution diagrams.

- **[Domain Message Services Reference](domain-services.md)**
  - Functional overview of all 11 domain service modules in `src/js/msg/`.
  - Overview of domain state tracking (Great Buildings, Guild Battlegrounds, Guild Expedition, Army units, City production, Resources).

- **[Helper Utilities Catalog](helper-utilities.md)**
  - Overview of DOM rendering, overlay collapsibility, clipboard formatting, and precision math helpers in `src/js/fn/`.

---

## 2. Internal Knowledgebase (`docs/knowledgebase/`)

Granular technical specifications, function-by-function manuals, agent workflow protocols, and static codebase audits:

- **[Codebase Technical Manual](knowledgebase/codebase-technical-manual.md)**
  - Function-by-function breakdown of content scripts, DevTools initialization, options controllers, and popup fallbacks.
  - Catalog of utility functions in `src/js/fn/*`.
  - Feature flag state lifecycle management (`showOptions.js`).

- **[Agentic Workflow & Maintenance Guide](knowledgebase/agent-workflow-guide.md)**
  - AI coding agent standards for Google Antigravity (AGY) SDK integration.
  - Workspace customization layout (`.agents/rules/`, `.agents/skills/`, hooks, and MCP configuration).
  - MCP server configurations (`chrome_devtools`, `graphify`).
  - Graphify AST knowledge graph commands and query protocols.
  - Git branching lifecycle (`feat/*`, `fix/*`) and verification standards (`npm run check && npm run build`).

- **[Service Dispatch & JSON Payload Specs](knowledgebase/service-dispatch.md)**
  - Low-level JSON payload structure specifications and event dispatching tables for intercepted Innogames API requests.

- **[UI Injection & Panel Rendering Manual](knowledgebase/ui-injection.md)**
  - Technical manual for DevTools panel mounting, Bootstrap 5 styling, and jQuery DOM manipulation rules.

- **[Circular Dependency Audit](knowledgebase/circular-dependencies.md)**
  - Analysis of module import graphs and strategies for preventing circular dependency cycles.

### Static Codebase Audits (`docs/knowledgebase/audit-*.md`)

The Chrome extension, CSS/HTML, JavaScript/jQuery, and Node.js/Webpack audits were
re-verified on 2026-08-08. Each records its commands, measured bundle sizes, confirmed
defects, and the boundary between static findings and browser testing still required.

- [Chrome DevTools Audit](knowledgebase/audit-chrome-devtools.md)
- [Chrome Extension MV3 Audit](knowledgebase/audit-chrome-extension.md)
- [CSS & HTML Audit](knowledgebase/audit-css-html.md)
- [JavaScript & jQuery Audit](knowledgebase/audit-javascript-jquery.md)
- [Node.js & Webpack Audit](knowledgebase/audit-nodejs-webpack.md)

---

## 3. Knowledge Graph Analysis

The repository generates a local automated knowledge graph in `graphify-out/`. The directory is ignored by Git; source code is indexed deterministically through AST extraction, while documentation and other semantic content can contribute concepts and inferred relationships through Gemini.

- **`GRAPH_REPORT.md`**: Visual breakdown of central god nodes, module communities, and cohesion scores.
- **`graph.html`**: Interactive browser visualization for exploring nodes, relationships, and communities.
- **`graph.json`**: Machine-readable graph data for queries and downstream analysis.

The graph is refreshed incrementally and its current node, edge, community, cohesion, and token-cost metrics are recorded in local `graphify-out/GRAPH_REPORT.md`. After code-only changes, run `mise run graphify-update` (or `npm run graphify-update`). For semantic documentation updates with richer inferred relationships, run:

```bash
graphify extract . --mode deep
graphify cluster-only .
graphify label . --missing-only
npm run graphify-filter-surprises
```

The labeling command preserves existing curated names and fills only missing or placeholder community labels. The final repository-local reporting pass retains documentation, agent configuration, build tooling, repository metadata, and non-code assets in `graph.json` for queries, but recreates the entire `GRAPH_REPORT.md` runtime-architecture view from code nodes under `src/` only. Its metrics, hubs, communities, cycles, hyperedges, knowledge gaps, surprising connections, and suggested questions therefore describe extension implementation rather than the wider knowledge corpus.
