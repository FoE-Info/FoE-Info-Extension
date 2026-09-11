# Architecture Specification: Per-World Isolated Storage & Settings Model

**Date**: 2026-09-07  
**Status**: Draft (Approved in Principle)  
**Governing Rules**: `modular-architecture.md`, `scope-control.md`, `verification-before-completion.md`

---

## 1. Overview & Objectives

Currently, FoE-Info stores settings and feature toggles as flat, un-namespaced keys in `chrome.storage.local` (e.g. `showOptions`, `url`, `donationPercent`, `hiddenInvestments`). This creates bleed-through across servers, where settings, webhooks, or hidden Great Buildings on one world inadvertently apply to another.

This architecture refactors the storage and settings subsystem into an isolated, per-world model:

1. **Pristine Factory Defaults**: When a new world is detected or initialized, its settings are cloned directly from a frozen factory default template with zero bleed-through from user overrides on other servers.
2. **Per-World Namespace in `chrome.storage.local`**: Every world stores its toggles, donation preferences, webhooks, and local caches under a isolated key: `world:<worldId>`.
3. **Global Settings Layer**: Cross-world configurations (such as extension language `tool.language`) reside in a dedicated `global:settings` key.
4. **UI Context Binding**: The Options page (`options.html`) auto-detects the active game tab's server (e.g. `en7`) and automatically binds the controls to that world. If opened from a non-game page or `chrome://extensions`, it falls back to the most recently active world or first registered server.
5. **Interactive Server Switching**: An interactive world selector dropdown (`<select id="worldSelector">`) in the options UI allows switching between configured servers on the fly without page reload.
6. **Live Runtime Synchronization**: Settings updates persist immediately and propagate via `chrome.storage.onChanged` listeners to all active DevTools panels in real-time without requiring a game reload.

---

## 2. Storage Topology & Data Schema

### A. Top-Level Storage Keys in `chrome.storage.local`

```text
chrome.storage.local
├── "global:settings"
│     ├── language: "en"
│     ├── knownWorlds: ["en7", "en16", "de12"]
│     └── lastActiveWorld: "en7"
│
├── "world:en7"
│     ├── showOptions: { showStats: true, showGBInfo: true, ... }
│     ├── donation: { percent: 190, suffix: "", hideUnsafe: true, targets: "", targetText: "" }
│     ├── webhooks: { discordTargetURL: "", sheetGuildURL: "" }
│     ├── toolOptions: { minSize: 0 }
│     └── caches: { hiddenInvestments: [], ... }
│
└── "world:en16"
      └── (Identical schema, isolated values)
```

### B. Pristine Factory Defaults (`src/js/state/factoryDefaults.js`)

A dedicated, immutable module providing fresh out-of-the-box defaults:

```javascript
export const FACTORY_WORLD_SETTINGS = Object.freeze({
  showOptions: Object.freeze({
    showBonus: true,
    showIncidents: true,
    showGVG: true,
    showStats: true,
    showGBInfo: true,
    showGBRewards: true,
    showGBDonors: true,
    showInvested: true,
    showDonation: true,
    showFriends: true,
    showGuild: true,
    showHood: true,
    showBattleground: true,
    showBattlegroundChanges: false,
    showExpedition: true,
    showTreasury: true,
    showVisit: true,
    showSettlement: true,
    showArmy: true,
    showGoods: true,
    showLeaderboard: false,
    showGBGrewards: true,
    GBGprovinceTime: true,
    GBGshowSC: true,
    showGErewards: true,
    showRewards: true,
    showLogs: true,
    showContributions: true,
    showGuildPosition: false,
    hideUnsafe: true,
    buildingCosts: false,
    collectionTimes: false,
    clipboard: true,
  }),
  donation: Object.freeze({
    percent: 190,
    suffix: '',
    targets: '',
    targetText: '',
  }),
  webhooks: Object.freeze({
    discordTargetURL: '',
    sheetGuildURL: '',
  }),
  toolOptions: Object.freeze({
    minSize: 0,
  }),
  caches: Object.freeze({
    hiddenInvestments: [],
  }),
});

export const FACTORY_GLOBAL_SETTINGS = Object.freeze({
  language: 'en',
  knownWorlds: [],
  lastActiveWorld: null,
});

export function createFreshWorldSettings() {
  return JSON.parse(JSON.stringify(FACTORY_WORLD_SETTINGS));
}
```

### C. One-Time Legacy Migration Bridge

On startup:

1. Check if `global:settings` exists.
2. If absent, check for legacy flat keys (`showOptions`, `url`, `tool`, `donationPercent`).
3. If legacy keys are detected:
   - Determine current world (default `'en7'`).
   - Deep-merge legacy keys into `world:en7`.
   - Initialize `global:settings` with `language: legacyTool.language || 'en'`, `knownWorlds: ['en7']`, and `lastActiveWorld: 'en7'`.
   - Leave legacy keys intact (or deprecate) so older code paths continue functioning safely.

---

## 3. Storage Layer (`src/js/utils/storage.js`)

The storage module is refactored into a world-aware storage manager:

### Public API Contract

- `storage.setWorld(worldId)`: Sets the active world context for the current process/panel.
- `storage.getCurrentWorld()`: Returns the currently bound world ID (e.g. `'en7'`).
- `storage.getWorldSettings(worldId)`: Retrieves settings for a world, seeding from `FACTORY_DEFAULTS` if missing.
- `storage.saveWorldSettings(worldId, partialSettings)`: Updates settings for a world atomically.
- `storage.resetWorldSettings(worldId)`: Resets a world back to `FACTORY_DEFAULTS`.
- `storage.getGlobalSettings()` / `storage.saveGlobalSettings(partial)`: Manages global settings.
- `storage.registerKnownWorld(worldId, worldName)`: Dynamically registers a newly encountered world.
- `storage.onWorldSettingsChange(callback)`: Registers a listener for live settings changes.

### Backward-Compatibility Layer

- `storage.get(name)`, `storage.set(name, val)`, `storage.getSync(name)`, and `storage.remove(name)` automatically proxy reads/writes to the active world's namespace (or global settings for `language`). Existing consumers (`renderInvestedPanel.js`, `index.js`, etc.) require zero breaking changes.

---

## 4. Options UI Refactoring (`options.html` & `options.js`)

### A. Context Detection

1. On `DOMContentLoaded`, `options.js` queries `browser.tabs.query({ active: true, currentWindow: true })`.
2. If the active tab URL matches `https://([a-z0-9]+)\.forgeofempires\.com/game/.*`, it extracts `worldId` (e.g. `en7`).
3. If no active FoE tab is found, it queries all open tabs for any FoE game tab.
4. If still no game tab is open, it reads `global:settings.lastActiveWorld` or the first entry in `knownWorlds`.
5. Defaults to `'en7'` if storage is completely uninitialized.

### B. Interactive World Selector UI

- Mounted at the top of `options.html`:
  ```html
  <div class="card bg-light mb-3">
    <div class="card-body d-flex align-items-center gap-2 flex-wrap">
      <label for="worldSelector" class="fw-bold mb-0"
        >Active Server / World:</label
      >
      <select
        id="worldSelector"
        class="form-select form-select-sm"
        style="width: auto; min-width: 200px;"
      ></select>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        id="addWorldBtn"
      >
        + Add World
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-danger ms-auto"
        id="resetWorldBtn"
      >
        Reset to Factory Defaults
      </button>
    </div>
  </div>
  ```
- Selecting a different world in `#worldSelector`:
  1. Saves current form values to the currently selected world.
  2. Loads the target world's settings and updates all checkboxes and input fields.
  3. Updates `global:settings.lastActiveWorld`.

### C. Immediate Persistence & Status Feedback

- Checkboxes and inputs save immediately on `change` / `input` (debounced) with a subtle "Settings saved" alert.
- The "Save" button remains available for manual visual confirmation.

---

## 5. Live Runtime Synchronization

- `storage.js` registers a global `browser.storage.onChanged` listener.
- When `world:<worldId>` changes:
  - If the active DevTools panel's bound world matches `<worldId>`:
    1. Updates in-memory `showOptions` object.
    2. Dispatches local event `foe_options_updated`.
    3. Triggers immediate DOM visibility updates (`showStats`, `showInvested`, `showIncidents`, etc.) without page reload.
- When `global:settings` changes:
  - Updates in-memory language or registered worlds.
