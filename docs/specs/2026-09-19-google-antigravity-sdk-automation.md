# Google Antigravity SDK — Automation & Integration Design

**Date**: 2026-09-19  
**Status**: Proposal / Draft  
**Scope**: Exploration of developer tooling, CI/CD pipelines, reverse-engineering, and offline analysis workflows powered by the Google Antigravity Python SDK (`google-antigravity`).

---

## 1. Architectural Boundary & Invariants

Before adopting any agent SDK capabilities, the operational boundary between the Chrome extension and developer tooling must remain strictly intact:

| Domain                                                    | Runtime                                   | Invariants                                                                                                                                     |
| :-------------------------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **In-Browser Extension** (`src/`)                         | Chrome MV3 (Node/Webpack, JS/TS)          | Strictly deterministic math (`bignumber.js`), passive DevTools RPC interception, zero game mutation/botting, zero client-side AI dependencies. |
| **Developer & Tooling Pipeline** (`scripts/`, `.agents/`) | Python 3.12+ (managed via `uv`), Node 24+ | Knowledge graphs (Graphify), offline metadata ingestion, RPC contract validation, automated test triage, and subagent orchestration.           |

The Google Antigravity SDK operates purely within the **tooling, analysis, and CI/CD pipeline**.

---

## 2. The Four Automation Pillars

### Pillar 1: Automated Game Metadata & HAR Reverse-Engineering

- **Context**: InnoGames releases frequent game updates that introduce new Great Buildings, Historical Allies, Quantum Incursions features, or modified event mechanics. The extension relies on live dynamic metadata, offline ingestion scripts ([`scripts/download-offline-metadata.mjs`](../../scripts/download-offline-metadata.mjs), [`scripts/ingest-hars-to-metadata.mjs`](../../scripts/ingest-hars-to-metadata.mjs)), and JSON-RPC contracts ([`scripts/rpc-contract.config.json`](../../scripts/rpc-contract.config.json)).
- **SDK Automation**:
  - **Payload Ingestion**: Build an agent utilizing `periodic_trigger` or a CLI script to watch for new `.har` capture files or CDN asset drops.
  - **Schema Drift Detection**: The agent diffs incoming RPC response payloads against known service contracts (`MessageDispatcher` routes).
  - **Contract Generation**: Using Pydantic structured output (`StructuredOutput`), the agent generates or updates schema contracts in `scripts/rpc-contract.config.json` and creates new entity nodes in the metadata knowledge graph.

### Pillar 2: Programmatic CI/CD Execution of Project Subagents

- **Context**: The repository defines rich specialized subagent personas in [`.agents/agents/`](../../.agents/agents/) (such as `code-reviewer`, `foe-economy-analyst`, `foe-combat-analyst`, and `cross-codebase-comparator`). Currently, these agents operate primarily during interactive Antigravity CLI sessions.
- **SDK Automation**:
  - **Headless PR Code Review**: Run the `code-reviewer` agent non-interactively in GitHub Actions. The agent inspects PR diffs to enforce repository rules: the 600-line modular ceiling, BigNumber arithmetic invariants, and DOM XSS prevention.
  - **Continuous Peer Codebase Comparator**: Run `cross-codebase-comparator` as a scheduled workflow comparing FoE-Info against peer tools (`forge-hammer`, `low-tool`) to highlight newly reverse-engineered RPC structures or game formulas.

### Pillar 3: Contextual i18n Synchronization Across 7 Languages

- **Context**: The extension supports 7 locales (`en`, `de`, `fr`, `es`, `it`, `pl`, `ru`) in `src/i18n/`. Keys are audited via [`scripts/audit-i18n.mjs`](../../scripts/audit-i18n.mjs). Traditional generic machine translation often misinterprets Forge of Empires domain terminology (e.g. Great Building names, boost types, Attrition, Blue Galaxy charges).
- **SDK Automation**:
  - **Domain-Grounded Translation**: An agent equipped with MCP tools to query the metadata store (`graphify-metadata-store`) translates missing dictionary keys while strictly preserving in-game terminology.
  - **Structured Dictionaries**: Emits validated JSON matching existing locale files without altering interpolation tokens (e.g., `__COUNT__`, `{{value}}`).

### Pillar 4: Headless CDP / Browser Test Triage & Regression Analysis

- **Context**: [`cdp-test-engineer`](../../.agents/agents/cdp-test-engineer.md) and OpenCLI validate DevTools panel rendering and mock RPC pipelines.
- **SDK Automation**:
  - **Test Run Triage**: During headless Chrome/CDP test runs, an agent captures console errors, uncaught exceptions, and unhandled RPC envelopes.
  - **Root-Cause Reports**: Correlates runtime failures against recent git commits or RPC contract changes, outputting structured triage summaries for maintainers.

---

## 3. SDK Capabilities & Enablers

| SDK Feature                                        | Role in FoE-Info Tooling                                                                                           |
| :------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **MCP Integration** (`mcp_servers`)                | Native connectivity to `graphify-foe-info`, `graphify-metadata-store`, and `github-mcp`.                           |
| **Local Model Support** (`LiteRT` / `LocalOpenAI`) | Zero-cost, privacy-preserving execution on local developer machines using on-device Gemma or Ollama.               |
| **Safety Policies & Predicates**                   | Enforce game rules: hard limits preventing write actions or automated gameplay, guaranteeing read-only boundaries. |
| **Structured Output** (`Pydantic`)                 | Guarantees strict JSON schema conformance for RPC contracts, i18n tables, and test reports.                        |
| **Hooks & Lifecycle Events**                       | Budget caps, token tracking, and structured logging for automated CI/CD runs.                                      |

---

## 4. Phased Adoption Roadmap

1. **Phase 1 (Opt-in Dependency)**: Add `google-antigravity` to [`pyproject.toml`](../../pyproject.toml) via `uv add google-antigravity` when authoring the first automated script.
2. **Phase 2 (HAR & RPC Generator)**: Implement a standalone script in `scripts/` that ingests raw HAR files and proposes updates to `scripts/rpc-contract.config.json`.
3. **Phase 3 (i18n Sync Tool)**: Create a localized translation assistant script referencing game metadata for missing i18n keys.
4. **Phase 4 (CI/CD Quality Gate)**: Integrate headless subagent code-review into GitHub Actions workflows.
