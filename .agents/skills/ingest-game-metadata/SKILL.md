---
name: ingest-game-metadata
description: 'Ingest InnoGames metadata and update offline graphs.'
---

# Workflow: Ingest Game Metadata & Update Knowledge Graph

Use this skill to ingest new raw game metadata from InnoGames releases, update offline datasets, rebuild `graphify-out/metadata/graph.json`, and ensure 100% relational integrity.

---

## Phase 1: Capture & Download Raw Metadata

1. Launch Chromium and authenticate into the game:
   ```bash
   foe-browser
   ```
2. Trigger the automated offline metadata extraction:
   ```bash
   npm run metadata:download
   ```
   - Downloads startup definitions, building configurations, historical allies, castle levels, and translation catalogs into `../metadata-store/`.

---

## Phase 2: Build & Validate Knowledge Graph

1. Regenerate the metadata graph:
   ```bash
   npm run graph:metadata:update
   ```
   - Builds `../metadata-store/graphify-out/graph.json` spanning BuildingEntity, HistoricalAlly, Technology, SelectionKit, and MilitaryUnit nodes.
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

1. Update metadata knowledge graph:
   ```bash
   npm run graph:metadata:update
   ```
2. Run automated test suite:
   ```bash
   npm test
   ```
## 5. Record Usage in the Skill Work Log

A skill that only accumulates notes never changes behaviour. Record each real
run and fold the lesson back into this file:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> \
  --outcome pass|fail|partial \
  --lesson '<imperative rule + why>'
```

`--outcome` is `pass`, `fail`, or `partial`, and every `--signal` is a command
that can actually fail. Patch the workflow above with the lesson in the same
change — the worklog is the audit trail, `SKILL.md` is what the next run reads.
See [Skill Work Log & Memory](references/skill-memory.md) for the full loop.

