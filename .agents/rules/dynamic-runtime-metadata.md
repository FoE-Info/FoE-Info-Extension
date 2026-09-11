---
trigger: always_on
description: Strict prohibition against introducing static metadata or entity JSON dumps into src/; extension runtime must remain 100% dynamically driven by live InnoGames network RPC payloads.
---

# Rule: Pure Dynamic Runtime Metadata (No Static Metadata Dependencies)

Forge of Empires continuously updates its game entity schemas, eras, units, and buildings. To ensure the extension remains lightweight, forward-compatible, and never falls out of sync with game updates, the browser extension runtime (`src/`) must be **100% dynamically driven** by live InnoGames network payloads (JSON-RPC and CDN lookups).

---

## 1. Core Invariants

1. **Strict Offline Boundary (`metadata-store/`)**:
   - `metadata-store/` is strictly an **offline analysis lab, reverse-engineering sandbox, and Graphify index**.
   - Code inside `src/` must **NEVER** import, require, or depend on files in `metadata-store/`.
2. **Zero Preseeded Game JSON in `src/`**:
   - Never commit, bundle, or preseed entity `.json` dumps (such as `defaultUnits.json`, `city_entities.json`, `items.json`) into `src/`.
   - The only valid JSON files permitted in `src/` are browser extension manifests (`src/chrome/manifest*.json`) and UI localization dictionaries (`src/i18n/*.json`).
3. **Pure Dynamic Ingestion**:
   - All entity models, unit stats, eras, boosts, and inventory counts must be parsed directly from live InnoGames network payloads (`msg.responseData` from `ServerRequest` RPC envelopes or dynamic CDN metadata endpoints).
   - Defensive fallbacks for unknown or not-yet-fetched entities must use heuristic inference (e.g., era name extraction from ID, title casing) or dynamic fetching via `resolveMissingCityEntities()`, never static baked-in JSON dictionaries.
4. **Testing Hygiene**:
   - Unit tests that require mock data must register mock entities or units programmatically (e.g., via `metadataStore.registerUnits([...])` or RPC fixture files loaded strictly within `tests/`), rather than coupling `src/` to static files.
