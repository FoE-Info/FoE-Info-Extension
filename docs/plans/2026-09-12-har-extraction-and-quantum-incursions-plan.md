# Plan: HAR Metadata Extraction & Quantum Incursions (QI) Feature Architecture

**Date**: 2026-09-12  
**Harness**: OpenCode Execution Task  
**Delegation Target**: OpenCode Agent (Domain & Metadata Specialist)  
**Safety Invariant**: `docs/har/*.har` must **NEVER** be tracked or committed to Git (`.gitignore` enforced).

---

## 1. Context & Objective

The user captured 39 live network `.har` files (2.0 GB total) in `docs/har/` with descriptive filenames covering core gameplay actions:

- **Quantum Incursions (QI)**: map entry, settlement harvest, rankings, member contributions, scoreboard, node focus/stop signals.
- **Guild Battlegrounds (GBG)**: building creation/destruction, diamond camp rush, sector targeting, stop signs.
- **Guild & Treasury**: guild overview, member lists, treasury bags, 10 pages of treasury donation history.
- **Player Visits & City Maps**: 13 high-era player cities.
- **Login & Social**: startup sequence, marketplace trades, conversation categories.

### Goals for OpenCode:

1. **Extract Network Traffic to Offline Metadata**:
   - Ingest all 39 HAR files into `../metadata-store/` (`raw_rpc_capture.json`, `rpc/`, `entities/`).
   - Extract targeted QI RPC contracts into `tests/fixtures/rpc/` for offline mock testing.
2. **Reverse Engineer the QI Domain Model**:
   - Document InnoGames `GuildRaids*` RPC request/response schemas.
3. **Architect the Quantum Incursions Extension Support**:
   - Design the protocol routing, state caching, calculation engines, and UI panels.

---

## 2. InnoGames QI Protocol Mapping (from Captures)

Reverse-engineered from the captured HAR network logs:

| InnoGames Service              | Method                      | Payload Contents & Domain Role                                                                               |
| :----------------------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **`GuildRaidsService`**        | `getState`                  | Current season ID, raid difficulty (1–10), action point balance & cap, quantum shard bank, raid status.      |
| **`GuildRaidsService`**        | `getMemberActivityOverview` | Guild member leaderboard: player names, total actions spent, node progress points, contribution score.       |
| **`GuildRaidsMapService`**     | `getOverview`               | Active incursion map topology: node IDs, node types (combat, negotiation, donation, boss), clearance status. |
| **`GuildRaidsMapService`**     | `getNodeExtendedInfo`       | Specific node trial details: enemy army composition, negotiation good requirements, reward bundles.          |
| **`GuildRaidsMapService`**     | `setNodeTarget`             | Focus signals: low focus, medium focus, high focus, stop sign (`targetType`, `nodeId`, `guildId`).           |
| **`GuildRaidsOutpostService`** | `getOutpost`                | Quantum Settlement city map: buildings, production state, shard costs, expansion grid.                       |

---

## 3. Execution Phase 1: Automated HAR Ingestion & Metadata Store Update

OpenCode should create a dedicated script `scripts/ingest-hars-to-metadata.mjs` to parse all `.har` files:

```bash
node scripts/ingest-hars-to-metadata.mjs
```

### Extraction Specifications:

1. **`../metadata-store/rpc/`**:
   - For every RPC in `har.log.entries` matching `/game/json`:
     - Save response payload to `../metadata-store/rpc/<requestClass>.<requestMethod>.json`.
     - Specifically capture all `GuildRaidsService.*`, `GuildRaidsMapService.*`, and `GuildRaidsOutpostService.*`.
2. **`../metadata-store/entities/`**:
   - Extract building entities from `CityMapService.getCityMap` and `CityMapService.getEntities` across all visited cities.
   - Index missing buildings into `../metadata-store/manifest.json`.
3. **`tests/fixtures/rpc/`**:
   - Save clean, anonymized test fixtures for QI services:
     - `tests/fixtures/rpc/GuildRaidsService.getState.json`
     - `tests/fixtures/rpc/GuildRaidsMapService.getOverview.json`
     - `tests/fixtures/rpc/GuildRaidsService.getMemberActivityOverview.json`
     - `tests/fixtures/rpc/GuildRaidsOutpostService.getOutpost.json`
4. **Re-index Metadata Graph**:
   ```bash
   npm run graph:metadata:update
   ```

---

## 4. Execution Phase 2: Quantum Incursions (QI) Feature Architecture

To support QI cleanly under our **Modular Architecture** ($\le 600$ lines/file, pure calc, decoupled UI):

```text
src/js/
├── msg/
│   ├── GuildRaidsService.js          # Inbound RPC handler for getState & getMemberActivityOverview (<= 350 lines)
│   ├── GuildRaidsMapService.js       # Map overview, node state & target generator signals (<= 350 lines)
│   └── GuildRaidsOutpostService.js   # Settlement city grid & production tracking (<= 250 lines)
├── calc/
│   ├── QuantumIncursionsCalculator.js# Pure math: Action point regen time, shard economics, member rankings
│   └── QuantumSettlementCalculator.js# Production density per tile, quantum goods balance
├── protocol/routes/
│   └── guildRaidsRoutes.js           # Route table registered in legacyBridge / MessageDispatcher
├── state/
│   └── quantumState.js               # Reactive in-memory state for active QI season
└── ui/
    ├── renderQuantumOverviewPanel.js # Panel 1: Season status, AP timer countdown, Shard counter
    ├── renderQuantumTargetPanel.js   # Panel 2: Priority target nodes, stop signs, boss clearance
    └── renderQuantumLeaderboardPanel.js # Panel 3: Guild member contribution table (sortable by progress)
```

---

## 5. Verification Gate & Invariants for OpenCode

1. **Zero HAR Git Pollution**:
   - Run `git status` and verify `docs/har/` remains untracked.
   - Never run `git add -f` on any `.har` file.
2. **Purity & Line Caps**:
   - All newly created modules in `src/js/msg/`, `calc/`, `ui/` must be $\le 600$ lines.
   - Pure math in `src/js/calc/` must have zero DOM or jQuery references.
3. **Test-Driven Verification**:
   - Add unit tests for `GuildRaidsService`, `GuildRaidsMapService`, and `QuantumIncursionsCalculator` under `tests/msg/` and `tests/calc/` reading from `tests/fixtures/rpc/`.
   - Run full 5-stage gate:
     ```bash
     npm run verify
     ```
