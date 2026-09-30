---
name: ingest-game-metadata
description: 'Ingest InnoGames metadata and update offline graphs.'
---

# Workflow: Ingest Game Metadata & Update Knowledge Graph

Use this skill to ingest new raw game metadata from InnoGames releases, update offline datasets, rebuild the metadata graph (via `bash scripts/graphify/graphify.sh metadata-store metadata-build`), and ensure 100% relational integrity. The metadata graph is built from entity JSON and has no AST tier. Two different defaults are in play: raw downloads land in `metadata-store/` **inside** this repo (`npm run metadata:download`, overridable with `METADATA_STORE_DIR`), while `bash scripts/graphify/graphify.sh metadata-store metadata-build` builds and reads the graph in the **sibling** `../metadata-store/` (overridable with `METADATA_DIR`). Query the graph the runner actually built, not the one you just downloaded into.

---

## Phase 1: Capture & Download Raw Metadata

1. **Workspace Context**: Execute extension commands from `FoE-Info-Extension/`.
2. **Live Session Ingestion**: If an active Forge of Empires browser session is open:
   ```bash
   npm run metadata:download
   ```
3. **Offline Ingestion Alternative**: If live browser session is unavailable, ingest captured network archives:
   ```bash
   npm run metadata:extract-hars
   ```

---

## Phase 2: Build & Validate Knowledge Graph

1. Regenerate the metadata graph via the canonical graphify runner:
   ```bash
   bash scripts/graphify/graphify.sh metadata-store metadata-build
   ```
   - This emits a `graph.json` for the configured metadata store, spanning BuildingEntity, HistoricalAlly, Technology, SelectionKit, and MilitaryUnit nodes. Verify the artifact path from `METADATA_DIR`, or the default sibling `../metadata-store/graphify-out/`, before querying it — a different store from the in-repo `metadata-store/` the download step writes to, unless both are pointed at the same directory.
2. Run topological integrity audit:
   ```bash
   npm run metadata:query -- audit
   ```
   - Asserts 0 dangling edges and 100% resolved links across all relational edges (`UPGRADED_BY`, `BELONGS_TO_ERA`, `ASSIGNED_TO_INSTANCE`, etc.).

---

## Phase 3: Inspect & Query New Entities

1. Inspect topological distribution:
   ```bash
   npm run metadata:query -- stats
   ```
2. Verify specific new buildings or allies:
   ```bash
   npm run metadata:query -- search "<NewBuildingOrAllyName>"
   npm run metadata:query -- lookup <nodeId>
   ```

---

## Phase 4: Synchronize Knowledge Base

1. Rebuild and synchronize metadata knowledge graph:
   ```bash
   bash scripts/graphify/graphify.sh metadata-store metadata-build
   ```
2. Run automated test suite:
   ```bash
   npm test
   ```
