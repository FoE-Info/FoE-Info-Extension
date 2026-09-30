---
trigger: model_decision
description: Strict prohibition against static metadata or JSON dumps in src/.
---

# Rule: Pure Dynamic Runtime Metadata (No Static Metadata Dependencies)

Forge of Empires continuously updates its game entity schemas, eras, units, and buildings. To ensure the extension remains lightweight, forward-compatible, and never falls out of sync with game updates, the browser extension runtime (`src/`) must be **100% dynamically driven** by live InnoGames network payloads (JSON-RPC and CDN lookups).

---

## 1. Core Invariants

1. **Strict Offline Boundary (`metadata-store/`)**:
   - The metadata store is strictly an **offline analysis lab, reverse-engineering sandbox, and Graphify index**. Two scripts default to different locations: `npm run metadata:download` (`scripts/download-offline-metadata.mjs`) writes **inside the repo** at `metadata-store/`, while the `metadata-store` target of `scripts/graphify/graphify.sh` builds the graph in the **sibling** `../metadata-store/`. Both honour `METADATA_STORE_DIR` / `METADATA_DIR`; check which one you are about to use before querying a graph.
   - Code inside `src/` must **NEVER** import, require, or depend on files in `metadata-store/`.
2. **Zero Preseeded Game JSON in `src/`**:
   - Never commit, bundle, or preseed entity `.json` dumps (such as `defaultUnits.json`, `city_entities.json`, `items.json`) into `src/`.
   - The rule is about **game metadata** JSON. Permitted: browser extension manifests (`src/chrome/manifest*.json`), UI localization dictionaries (`src/i18n/*.json`), and generated build assets that carry no game data (for example `src/fonts/icons-subset.json`, written by `npm run fonts:subset`). Prohibited: entity, era, boost, or item dumps.
3. **Pure Dynamic Ingestion**:
   - All entity models, unit stats, eras, boosts, and inventory counts must be parsed directly from live InnoGames network payloads (`msg.responseData` from `ServerRequest` RPC envelopes or dynamic CDN metadata endpoints).
   - Defensive fallbacks for unknown or not-yet-fetched entities must use heuristic inference (e.g., era name extraction from ID, title casing) or dynamic fetching via `resolveMissingCityEntities()`, never static baked-in JSON dictionaries.
4. **Testing Hygiene**:
   - Unit tests that require mock data must register mock entities or units programmatically (e.g., via `metadataStore.registerUnits([...])` or RPC fixture files loaded strictly within `tests/`), rather than coupling `src/` to static files.
