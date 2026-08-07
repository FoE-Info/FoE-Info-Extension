# FoE-Info-Extension: DOM Manipulation & UI Injection Catalog

**Source Files**: `src/js/fn/`, `src/js/vars/`  

---

## 1. Overview

The FoE-Info-Extension renders all analytical dashboards inside a **Chrome DevTools Panel** environment (not a traditional webpage). The root container is `src/chrome/panel.html`, which hosts the Bootstrap 5 layout. All UI injection is performed through direct DOM mutation from JavaScript — services import DOM node references from `src/js/index.js` and write HTML strings into `innerHTML` of specific anchor elements.

**Key design patterns:**

- **DOM node handles** are declared as named variables in `src/js/index.js` (e.g. `donationDIV`, `incidents`, `alerts`, `debug`) and imported by services and UI helpers via ES module imports.
- **Bootstrap 5** provides all visual components: cards, tables, collapse panels, badges, popovers, and tooltips.
- **jQuery** is used selectively for legacy DOM queries; most modern UI helpers use `document.getElementById` and direct `innerHTML` mutation.
- **UI helpers** in `src/js/fn/` are stateless utility modules generating HTML string fragments consumed by services in `src/js/msg/`.

---

## 2. DOM Architecture & Panel Structure

### 2.1 Chrome DevTools Panel Root

| File                       | Role                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `src/chrome/devtools.html` | Shell HTML loaded by Chrome's DevTools subsystem                     |
| `src/chrome/panel.html`    | Primary application UI panel injected into DevTools tab              |
| `src/js/devtools.js`       | Calls `browser.devtools.panels.create(EXT_NAME, null, 'panel.html')` |

### 2.2 Key DOM Anchor Elements

These elements are the primary injection targets. Services hold references to these via imports from `src/js/index.js`.

| DOM Element ID / Handle | Variable Name (index.js) | Injected By                                                      | Content Type                                                     |
| ----------------------- | ------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `#citystats`            | _(direct querySelector)_ | `StartupService`                                                 | City stat cards (FP, Coins, Arc%, Boosts)                        |
| `#armyDIV`              | `armyDIV`                | `ArmyUnitManagementService`                                      | Army unit count tables                                           |
| `#goodsDIV`             | `goodsDIV`               | `ResourceService`                                                | Goods inventory table                                            |
| `#visit`                | _(direct querySelector)_ | `OtherPlayerService`                                             | Other player profile card                                        |
| `#friends`              | _(direct querySelector)_ | `OtherPlayerService`                                             | Social list (Friends/Guild/Hood) tables                          |
| `donationDIV`           | `donationDIV`            | `GreatBuildingsService`, `GuildBattlegroundService`, `helper.js` | GB donation calculator; GBG season results; GBG comparison table |
| `donation2DIV`          | `donation2DIV`           | `GreatBuildingsService`                                          | GB secondary donor ranking table                                 |
| `donationDIV2`          | `donationDIV2`           | `GuildExpeditionService`                                         | Guild Expedition contribution table                              |
| `greatbuilding`         | `greatbuilding`          | `GreatBuildingsService`                                          | GB info overlay card                                             |
| `incidents`             | `incidents`              | `helper.fShowIncidents()`                                        | Incident/hidden reward alert cards                               |
| `alerts`                | `alerts`                 | `post.postPlayerToSS()`                                          | Webhook progress alert banner                                    |
| `debug`                 | `debug`                  | `copy.fCityStatsCopy()`                                          | Scratch buffer for clipboard copy operations                     |
| `#bonus`                | _(direct querySelector)_ | `BonusService`                                                   | Daily bonus summary                                              |
| `#galaxy`               | _(direct querySelector)_ | `StartupService.showGalaxy()`                                    | Blue Galaxy optimizer panel                                      |
| `#targetsGBG`           | `targets`                | `GuildBattlegroundService`, `ConversationService`                | GBG target generator alert                                       |
| `#costs`                | _(direct querySelector)_ | `GuildBattlegroundService.getBuildings()`                        | GBG building costs table                                         |
| `#gvg`                  | `gvg`                    | `ClanBattleService`                                              | GvG continent/province data                                      |
| `#invested`             | _(direct querySelector)_ | `GreatBuildingsService.getContributions()`                       | Total FP invested across GBs                                     |
| `#availableFPID`        | _(direct querySelector)_ | `ResourceService`, `InventoryService`, `BlueprintService`        | Available FP pack counter                                        |
| `#infoText`             | _(direct querySelector)_ | `CityMapService.updateEntity`                                    | GB info text overlay                                             |
| `#cultural`             | _(direct querySelector)_ | `AdvancementService`                                             | Cultural settlement goods requirements                           |
| `#treasury`             | `treasuryLog`            | `ClanService.getTreasuryLogs`                                    | Guild treasury log matrix                                        |
| `friendsDiv`            | `friendsDiv`             | `ClanService.getOwnClanData`                                     | Guild roster table                                               |

### 2.3 Bootstrap 5 Component Patterns

| Component                                      | Usage                                                     |
| ---------------------------------------------- | --------------------------------------------------------- |
| **Cards** (`card`, `card-body`)                | Wraps all panel sections (citystats, visit, army, etc.)   |
| **Collapse** (`collapse`, `show`)              | Controls panel show/hide; managed via `collapse.js` flags |
| **Tables** (`table`, `table-sm`, `table-dark`) | All tabular data (social lists, treasury, donations)      |
| **Badges** (`badge rounded-pill`)              | Icon labels generated by `AddElement.js`                  |
| **Popovers** (`data-bs-toggle="popover"`)      | Incident detail overlays in `helper.fShowIncidents()`     |
| **Tooltips** (`data-bs-toggle="tooltip"`)      | UI element hints; torn down via `fHideAllTooltips()`      |
| **Alerts** (`alert`, `alert-dismissible`)      | Webhook progress banners injected into `alerts` DOM node  |

---

## 3. `AddElement.js` — Bootstrap DOM Factory

**File**: `src/js/fn/AddElement.js`  
**Purpose**: Generates HTML string fragments for Bootstrap UI buttons and icons used throughout all panel headers. Also contains the sole direct DOM mutator for collapse icon state switching.

### 3.1 Exports

| Export       | Internal Name      | Return Type          | Description                                                                              |
| ------------ | ------------------ | -------------------- | ---------------------------------------------------------------------------------------- |
| `updateIcon` | `fCollapseIcon`    | `void` (DOM mutator) | Replaces the `outerHTML` of a collapse icon element to switch between add/remove states. |
| `icon`       | `fAddCollapseIcon` | `string`             | Returns HTML string for a collapse icon badge.                                           |
| `copy`       | `fCopyButton`      | `string`             | Returns HTML string for a copy button badge.                                             |
| `post`       | `fPostButton`      | `string`             | Returns HTML string for a post/share button badge.                                       |
| `close`      | `fCloseButton`     | `string`             | Returns HTML string for a dismiss/close button badge.                                    |
| `fCopyIcon`  | `fCopyIcon`        | `string`             | Returns HTML string for an inline copy icon.                                             |

### 3.2 Function Details

#### `updateIcon(id, _href, collapse)` — `fCollapseIcon`

- **Parameters**: `id` (DOM element ID), `_href` (anchor target), `collapse` (storage key name)
- **Behavior**:
  1. Calls `document.getElementById(id)` to locate the icon element.
  2. Replaces `element.outerHTML` with the result of `fAddCollapseIcon(id, _href, collapse)`.
  3. Persists new collapse state using `storage.set(collapse, collapse)`.
- **Icon switching**: Uses `material-icons-outlined` glyphs — `add_circle_outline` (collapsed) vs. `remove_circle_outline` (expanded).

#### `icon(id, href)` — `fAddCollapseIcon`

- **Parameters**: `id` (element ID), `href` (collapse target selector)
- **Returns**: `<span id="..."><a ...><i class="material-icons-outlined ...">add_circle_outline</i></a></span>`
- **Usage**: Called by all panel section headers to embed the expand/collapse control.

#### `copy(id)` — `fCopyButton`

- **Parameters**: `id` (element ID to assign to button)
- **Returns**: `<span id="..."><a ...><i class="material-symbols-outlined ...">content_copy</i></a></span>`
- **Usage**: Embedded in panel headers where clipboard copy is supported.

#### `post(id)` — `fPostButton`

- **Parameters**: `id` (element ID)
- **Returns**: Badge element for Discord/Sheets post trigger.
- **Usage**: Used in social list and GBG panels with `sheetGuildURL`/`discordURL` configured.

#### `close(id)` — `fCloseButton`

- **Parameters**: `id` (element ID)
- **Returns**: `<span><a ...><i ...>close</i></a></span>`
- **Usage**: Embedded in reward notification cards for dismiss actions.

---

## 4. `collapse.js` — Panel State Machine

**File**: `src/js/fn/collapse.js`  
**Purpose**: Manages UI section visibility as a stateful boolean registry. Provides collapse/expand toggle handlers for all 33 panel sections and a global tooltip teardown function.

### 4.1 The 33 Collapse Boolean Flags

All flags default to `true` (collapsed) unless saved in extension `storage`. They are exported as named boolean constants:

| Flag Name                      | Panel                               |
| ------------------------------ | ----------------------------------- |
| `collapseFriends`              | Friends list                        |
| `collapseGuild`                | Guild member list                   |
| `collapseHood`                 | Neighborhood list                   |
| `collapseIncidents`            | Incident/Hidden Reward alerts       |
| `collapseBattleground`         | Guild Battleground comparison table |
| `collapseTreasury`             | Guild treasury log                  |
| `collapseExpedition`           | Guild Expedition contribution table |
| `collapseArmy`                 | Army unit counts                    |
| `collapseGoods`                | Goods inventory                     |
| `collapseVisit`                | Other Player City stats             |
| `collapseBonus`                | Building charge bonuses             |
| `collapseCultural`             | Cultural settlement goods           |
| `collapseGalaxy`               | Blue Galaxy optimizer               |
| `collapseGBG`                  | GBG sector data                     |
| `collapseGBGCosts`             | GBG building costs                  |
| `collapseGBGLeaderboard`       | GBG guild leaderboard               |
| `collapseGBGPlayerLeaderboard` | GBG player leaderboard              |
| `collapseGBGSeasonResults`     | GBG season results                  |
| `collapseGBGTargets`           | GBG target generator                |
| `collapseDonation`             | GB donation calculator              |
| `collapseDonation2`            | GB secondary donor table            |
| `collapseGBInfo`               | GB info overlay                     |
| `collapseInvested`             | FP invested tracker                 |
| `collapseGvG`                  | GvG continent data                  |
| `collapseGvGProvince`          | GvG province detail                 |
| `collapseCityStats`            | City statistics main card           |
| `collapseRewards`              | Reward notifications                |
| `collapseOptions`              | Options panel                       |
| `collapseResources`            | Resources summary                   |
| `collapseTreasuryGuild`        | Guild treasury resources            |
| `collapseArcPercent`           | Arc % donation panel                |
| `collapseDebug`                | Debug output panel                  |
| `collapseAlerts`               | Alert/notification panel            |

### 4.2 `set(key, value)` — Collapse State Updater

- **File & Lines**: `src/js/fn/collapse.js:66–175`
- **Parameters**: `key` (flag name string), `value` (boolean)
- **Behavior**:
  1. Updates the named boolean flag in module scope.
  2. Toggles the target DOM element visibility: `element.style.display = value ? 'none' : 'block'`.
  3. Updates the collapse icon via `element.updateIcon()`.
  4. Persists state: `storage.set(key, value)`.
- **Usage**: Called by each panel's individual toggle handler (e.g. `fCollapseFriends()`, `fCollapseArmy()`).

### 4.3 Toggle Handler Pattern

Each of the 33 panels has a dedicated handler following this template:

```javascript
export function fCollapseFriends() {
  collapseFriends = !collapseFriends;
  // toggle display, update icon, persist
  set('collapseFriends', collapseFriends);
}
```

### 4.4 `fHideAllTooltips()` — Global Tooltip Teardown

- **File & Lines**: `src/js/fn/collapse.js:411–425`
- **Behavior**: Queries all `[data-bs-toggle="popover"]` and `[data-bs-toggle="tooltip"]` elements in the document. For each, calls `Popover.getOrCreateInstance(el).hide()` and `Tooltip.getOrCreateInstance(el).hide()`.
- **Usage**: Called before panel collapse animations to prevent orphaned Bootstrap tooltip/popover overlays from lingering.

### 4.5 Note on Circular Dependency

`collapse.js` imports `checkDebug` from `../index.js`. This creates a circular dependency when any `msg/*.js` service imports `collapse.js` (since `index.js` imports those services). This is documented in the [Circular Dependency Analysis](circular-dependencies.md).

---

## 5. `copy.js` — Clipboard Export Utilities

**File**: `src/js/fn/copy.js`  
**Purpose**: Formats structured HTML content from various panels into plain-text strings and copies them to the system clipboard. Provides 12 export functions covering all copyable panels.

### 5.1 Core Copy Mechanisms

#### `copyToClipboard(element)`

- **Pattern**: Scratch textarea approach.
- **Behavior**:
  1. Constructs a `<textarea>` element dynamically.
  2. Appends it to `document.body`.
  3. Sets `.value` to the formatted text (stripping HTML tags, replacing `<br>`, `<tr>`, `<td>`, `<p>` with `\n`).
  4. Selects all text and calls `document.execCommand('copy')`.
  5. Removes the `<textarea>` from the DOM.

#### `fCityStatsCopy()` — Scratch Buffer Pattern

- **Behavior**: Writes rendered HTML into `debug.innerHTML` (imported from `index.js`), selects the text range from `debug`, executes `document.execCommand('copy')`, then clears `debug.innerHTML`.
- **Rationale**: Uses the hidden `debug` DOM node as a scratch space for rich HTML-to-text copy operations.

### 5.2 All 12 Export Functions

| Export             | Source Element    | Description                                             |
| ------------------ | ----------------- | ------------------------------------------------------- |
| `fClipboardCopy`   | Generic           | Generic element-to-clipboard helper.                    |
| `DonorCopy`        | `#donorText`      | Copies GB donation table (1st–5th place lock amounts).  |
| `DonorCopy2`       | `#donorText2`     | Copies secondary GB donor ranking table.                |
| `fInvestedCopy`    | `#investedText`   | Copies FP invested summary across all GBs.              |
| `DonationCopy`     | `#copyText`       | Copies full GB donation recommendation string.          |
| `fCityStatsCopy`   | `debug` (scratch) | Copies city statistics card via scratch buffer pattern. |
| `fFriendsCopy`     | `#friendsText`    | Copies Friends list table.                              |
| `fGuildCopy`       | `#guildText`      | Copies Guild member list table.                         |
| `fHoodCopy`        | `#hoodText`       | Copies Neighborhood list table.                         |
| `BattlegroundCopy` | `#gbg-table`      | Copies GBG member comparison table.                     |
| `ExpeditionCopy`   | `#expeditionText` | Copies Guild Expedition contribution table.             |
| `TreasuryCopy`     | `#treasurytable`  | Copies Guild Treasury log matrix.                       |

### 5.3 HTML-to-Text Transformation

Before copying, HTML content is sanitized using string `.replace()` chains:

```javascript
content
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<tr[^>]*>/gi, '\n')
  .replace(/<\/tr>/gi, '')
  .replace(/<td[^>]*>/gi, '\t')
  .replace(/<\/td>/gi, '')
  .replace(/<p[^>]*>/gi, '\n')
  .replace(/<\/p>/gi, '')
  .replace(/<[^>]+>/g, ''); // strip remaining tags
```

### 5.4 Note on Circular Dependency

`copy.js` imports `debug` (a DOM node reference) from `../index.js`. This creates circular dependencies when any `msg/*.js` service imports `copy.js`. See [Circular Dependency Analysis](circular-dependencies.md).

---

## 6. `post.js` — Webhook Integration

**File**: `src/js/fn/post.js`  
**Purpose**: Dispatches outbound payloads to external integrations: Discord webhooks and Google Sheets Web App APIs.

### 6.1 Exports

| Export                 | Signature     | Description                                                               |
| ---------------------- | ------------- | ------------------------------------------------------------------------- |
| `postData`             | `(url, data)` | Generic CORS `XMLHttpRequest` POST to a URL.                              |
| `postToDiscord`        | `(msg)`       | Posts formatted message to Discord webhook (`discordURL`).                |
| `postTargetsToDiscord` | `()`          | Posts GBG target text (`#targetText`) to Discord.                         |
| `postGBGtoSS`          | `()`          | Posts GBG battleground data (`GBGdata`) to Google Sheets.                 |
| `postAlerttoDsicord`   | `()`          | Posts alert text (`#alertText`) to Discord.                               |
| `logToDiscord`         | `(msg)`       | Posts log message to Discord.                                             |
| `postPlayerToSS`       | `(visitData)` | Posts visited player profile data to Google Sheets; shows progress alert. |

### 6.2 Key Implementation Details

#### `postPlayerToSS(visitData)`

1. Mutates `alerts.innerHTML` to display `"Posting Guild Stats to SS..."` progress alert.
2. Sends `visitData` to `sheetGuildURL` via `fetch()` with CORS mode.
3. On response, replaces `alerts.innerHTML` with server response text.
4. Sets a 60-second timer (`setTimeout`): on expiry, calls Bootstrap `Alert.getOrCreateInstance(el).close()` and disposes the instance.

#### `postGBGtoSS()`

- Reads `GBGdata` (imported directly from `../msg/GuildBattlegroundService.js`).
- Reads `#battlegroundText` element content.
- Sends to `sheetBGURL` (Google Sheets Web App URL from options).

#### HTTP Transport

- `XMLHttpRequest` used for synchronous-style webhook sends.
- `fetch()` used for Google Sheets API calls with `mode: 'no-cors'`.

### 6.3 Note on Circular Dependency

`post.js` imports `alerts`, `MyInfo`, `url` from `../index.js` and `GBGdata` from `../msg/GuildBattlegroundService.js`. This creates circular dependencies via the `index.js → msg → fn → index.js` triangular pattern. See [Circular Dependency Analysis](circular-dependencies.md).

---

## 7. `helper.js` — Data Transform & UI Rendering

**File**: `src/js/fn/helper.js`  
**Purpose**: Large utility module providing name formatting, age/era index conversion, incident card rendering, and GBG member comparison table rendering.

### 7.1 Name & Data Formatting Utilities

| Export                   | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `fResourceShortName(id)` | Maps resource ID → short display name (e.g. `"granite"` → `"Gr"`). |
| `fRewardShortName(id)`   | Maps reward type ID → short display name.                          |
| `fGBsname(id)`           | Returns Great Building short name by entity ID.                    |
| `fEntityNameTrim(name)`  | Trims long entity names to fit UI columns.                         |
| `fGBname(id)`            | Returns full Great Building display name.                          |
| `fIncidentName(id)`      | Returns incident type display label.                               |
| `fLevelfromAge(ageName)` | Converts FoE age name → numeric era level index.                   |
| `fAgefromLevel(level)`   | Converts numeric era level → age name string.                      |
| `numAges`                | Total number of FoE ages/eras constant.                            |
| `fGVGagesname(era)`      | Returns GvG-specific era display name.                             |
| `fGoodsTally(goods)`     | Formats goods dictionary into display string.                      |

### 7.2 `fShowIncidents()` — Incident Card Renderer

**DOM Target**: `incidents.innerHTML`

**Behavior**:

1. Filters `hiddenRewards` (imported from `index.js`) to only active incidents (not yet expired).
2. For each incident:
   - Calculates remaining expiration countdown (`hours:minutes:seconds` format).
   - Builds Bootstrap popover tooltip HTML with legend entries for incident type, location, and timer.
   - Injects complete Bootstrap alert card (`<div class="alert alert-...">`) into `incidents.innerHTML`.
3. Initializes Bootstrap Popover instances on injected elements via `new Popover(el, options)`.

### 7.3 `fshowBattleground()` — GBG Comparison Table Renderer

**DOM Target**: `donationDIV.innerHTML` (the main `donationDIV` container)

**Behavior**:

1. Reads current `BattlegroundPerformance` (from `GuildBattlegroundService.js`) and historical `GuildMembers` snapshots.
2. Constructs a full Bootstrap table comparing each guild member's current battles/negotiations/attrition against their historical baseline.
3. Uses `ResourceNames` (from `ResourceService.js`) for goods name lookup.
4. Dynamically attaches a `ResizeObserver` on `#battlegroundCollapse` to observe panel resize events and sync the container height via `setBattlegroundSize()` from `globals.js`.

### 7.4 Other Utilities

| Export                         | Description                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `fHideTooltips()`              | Hides active Bootstrap tooltips (subset of `fHideAllTooltips` in collapse.js). |
| `checkGBG()`                   | Validates GBG sector state for target generator eligibility.                   |
| `setMyGuildPermissions(perms)` | Sets guild permission bitmask; used for GBG target visibility control.         |
| `fshowBattlegroundChanges()`   | Renders delta changes view for GBG performance.                                |

### 7.5 Imports & Circular Dependencies

`helper.js` imports from:

- `../index.js`: `hiddenRewards`, `CityEntityDefs`, `donationDIV`, `GameOrigin`, `url`
- `../msg/ResourceService.js`: `ResourceNames`
- `../msg/GuildBattlegroundService.js`: `BattlegroundPerformance`, `BGtime`, `GuildMembers`
- `../fn/globals.js`: `setBattlegroundSize`

The upward imports from `index.js` participate in 4+ circular dependency cycles. See [Circular Dependency Analysis](circular-dependencies.md).

---

## 8. `globals.js` — Height & Tool Options

**File**: `src/js/fn/globals.js`  
**Purpose**: Stores panel height preferences in memory and persists them to extension storage. Provides 12 height setter functions that apply CSS height constraints to panel containers.

### 8.1 `toolOptions`

A plain object exported from `globals.js` and imported by multiple services:

```javascript
export let toolOptions = {
  showRewards: true,
  showPlunder: true,
  discordURL: '',
  sheetGuildURL: '',
  sheetBGURL: '',
  // ... additional option flags
};
```

### 8.2 Panel Height Setters

Each setter enforces min/max height bounds on its target DOM element:

| Function                 | DOM Target              | Behavior                                  |
| ------------------------ | ----------------------- | ----------------------------------------- |
| `setFriendsSize(h)`      | `#friendsList`          | Sets max-height with scroll.              |
| `setArmySize(h)`         | `#armyCollapse`         | Sets height boundary.                     |
| `setBattlegroundSize(h)` | `#battlegroundCollapse` | Sets height; triggered by ResizeObserver. |
| `setExpeditionSize(h)`   | `#expeditionCollapse`   | Sets height boundary.                     |
| `setGuildSize(h)`        | `#guildList`            | Sets max-height with scroll.              |
| `setHoodSize(h)`         | `#hoodList`             | Sets max-height with scroll.              |
| `setTreasurySize(h)`     | `#treasuryCollapse`     | Sets height boundary.                     |
| `setGvGSize(h)`          | `#gvgCollapse`          | Sets height boundary.                     |
| `setGBGSize(h)`          | `#gbgCollapse`          | Sets height boundary.                     |
| `setDonationSize(h)`     | `#donationCollapse`     | Sets height boundary.                     |
| `setGoodsSize(h)`        | `#goodsCollapse`        | Sets height boundary.                     |
| `setCityStatsSize(h)`    | `#cityStatsCollapse`    | Sets height boundary.                     |

All setters also persist the height value to extension local storage via `storage.set(key, h)`.

---

## 9. `showOptions.js` — Feature Flag Registry

**File**: `src/js/vars/showOptions.js`  
**Purpose**: Maintains 33 boolean feature flags controlling which UI panels and features are enabled. Provides a unified `set(name, state)` updater consumed by the options page.

### 9.1 The 33 Feature Flags

All flags are exported as named booleans with sensible defaults:

| Flag                       | Default | Controls                          |
| -------------------------- | ------- | --------------------------------- |
| `showCityStats`            | `true`  | City statistics main card         |
| `showArmy`                 | `true`  | Army unit counts panel            |
| `showGoods`                | `true`  | Goods inventory panel             |
| `showFriends`              | `true`  | Friends list                      |
| `showGuild`                | `true`  | Guild member list                 |
| `showHood`                 | `true`  | Neighborhood list                 |
| `showBattleground`         | `true`  | GBG comparison table              |
| `showTreasury`             | `true`  | Guild treasury log                |
| `showExpedition`           | `true`  | Guild Expedition table            |
| `showVisit`                | `true`  | Other Player city scan            |
| `showBonus`                | `true`  | Building charge bonuses           |
| `showCultural`             | `true`  | Cultural settlement goods         |
| `showGalaxy`               | `true`  | Blue Galaxy optimizer             |
| `showGBG`                  | `true`  | GBG sector data                   |
| `showGBGCosts`             | `true`  | GBG building costs                |
| `showGBGLeaderboard`       | `true`  | GBG guild leaderboard             |
| `showGBGPlayerLeaderboard` | `true`  | GBG player leaderboard            |
| `showGBGSeasonResults`     | `true`  | GBG season results                |
| `showGBGTargets`           | `true`  | GBG target generator              |
| `showDonation`             | `true`  | GB donation calculator            |
| `showDonation2`            | `true`  | GB secondary donor table          |
| `showGBInfo`               | `true`  | GB info overlay                   |
| `showInvested`             | `true`  | FP invested tracker               |
| `showGvG`                  | `true`  | GvG continent data                |
| `showGvGProvince`          | `true`  | GvG province detail               |
| `showRewards`              | `true`  | Reward notifications              |
| `showPlunder`              | `true`  | Plunder reward notifications      |
| `showGE`                   | `true`  | GE chest reward notifications     |
| `showDebug`                | `false` | Debug output panel                |
| `showAlerts`               | `true`  | Alert/notification panel          |
| `showOptions`              | `false` | Options panel (hidden by default) |
| `showResources`            | `true`  | Resources summary                 |
| `showTreasuryGuild`        | `true`  | Guild treasury resources          |

### 9.2 `set(name, state)` — Flag Updater

```javascript
export default function set(name, state) {
  // Updates the named flag and persists to storage
  storage.set(name, state);
  // Dynamically updates the module-level variable
}
```

- **Usage**: Called by the options page (`src/js/options.js`) when users toggle feature checkboxes.
- **Persistence**: All flag states are saved to extension local storage and reloaded on startup.

### 9.3 Relationship to `collapse.js` Flags

`showOptions.js` controls **feature enablement** (whether a feature runs at all), while `collapse.js` controls **panel visibility** (whether a panel is expanded or collapsed in the UI). A hidden panel (`showOptions.showFriends = false`) means the friends feature is completely disabled; a collapsed panel (`collapse.collapseFriends = true`) means the feature is active but the panel is collapsed.

---

## 10. `storage.js` — Extension Storage Wrapper

**File**: `src/js/fn/storage.js`  
**Purpose**: Provides a promise-based wrapper around the `browser.storage.local` WebExtension API.

| Export                     | Signature         | Description                                   |
| -------------------------- | ----------------- | --------------------------------------------- |
| `set` (`setStorage`)       | `(key, value)`    | Saves value to extension local storage.       |
| `get` (`getStorage`)       | `(key)` → Promise | Retrieves value from extension local storage. |
| `remove` (`removeStorage`) | `(key)`           | Removes key from extension local storage.     |

All state persistence in `collapse.js`, `globals.js`, `showOptions.js`, and `ResourceService.js` routes through these wrappers.

---

## 11. DOM Injection Point Reference Table

Consolidated reference of all primary DOM injection points across the extension:

| DOM Element      | Variable/ID     | Injected By                                                      | Content Type             | Helper Module             |
| ---------------- | --------------- | ---------------------------------------------------------------- | ------------------------ | ------------------------- |
| `#citystats`     | direct          | `StartupService`                                                 | City stat cards          | Bootstrap cards           |
| `armyDIV`        | `armyDIV`       | `ArmyUnitManagementService`                                      | Army unit tables         | Bootstrap table           |
| `goodsDIV`       | `goodsDIV`      | `ResourceService`                                                | Goods inventory          | Bootstrap table           |
| `#visit`         | direct          | `OtherPlayerService`                                             | Player profile card      | Bootstrap card            |
| `#friends`       | direct          | `OtherPlayerService`                                             | Social list tables       | Bootstrap table           |
| `donationDIV`    | `donationDIV`   | `GreatBuildingsService`, `helper.js`, `GuildBattlegroundService` | GB calc / GBG table      | Bootstrap table           |
| `donation2DIV`   | `donation2DIV`  | `GreatBuildingsService`                                          | Donor ranking            | Bootstrap table           |
| `donationDIV2`   | `donationDIV2`  | `GuildExpeditionService`                                         | GE contribution table    | Bootstrap table           |
| `greatbuilding`  | `greatbuilding` | `GreatBuildingsService`                                          | GB info overlay          | Bootstrap card            |
| `incidents`      | `incidents`     | `helper.fShowIncidents()`                                        | Incident alert cards     | Bootstrap alert + popover |
| `alerts`         | `alerts`        | `post.postPlayerToSS()`                                          | Webhook progress banner  | Bootstrap alert           |
| `debug`          | `debug`         | `copy.fCityStatsCopy()`                                          | Clipboard scratch buffer | Hidden `<div>`            |
| `#bonus`         | direct          | `BonusService`                                                   | Building charges         | Bootstrap badge           |
| `#galaxy`        | direct          | `StartupService.showGalaxy()`                                    | Blue Galaxy table        | Bootstrap table           |
| `#targetsGBG`    | `targets`       | `GuildBattlegroundService`, `ConversationService`                | GBG target alert         | Bootstrap alert           |
| `#costs`         | direct          | `GuildBattlegroundService.getBuildings()`                        | Building costs matrix    | Bootstrap table           |
| `#gvg`           | `gvg`           | `ClanBattleService`                                              | GvG data                 | Bootstrap table           |
| `#invested`      | direct          | `GreatBuildingsService.getContributions()`                       | Invested FP summary      | Bootstrap badge           |
| `#availableFPID` | direct          | `ResourceService`, `InventoryService`, `BlueprintService`        | FP pack counter          | Text/badge                |
| `#infoText`      | direct          | `CityMapService.updateEntity`                                    | GB info string           | Text                      |
| `#cultural`      | direct          | `AdvancementService`                                             | Settlement goods         | Bootstrap table           |
| `#treasury`      | `treasuryLog`   | `ClanService.getTreasuryLogs`                                    | Treasury log matrix      | Bootstrap table           |
| `friendsDiv`     | `friendsDiv`    | `ClanService.getOwnClanData`                                     | Guild roster             | Bootstrap table           |

---

## 12. Verification

```bash
# Verify src/js/fn/ module files exist
ls -la src/js/fn/

# Verify showOptions.js exports
grep "^export" src/js/vars/showOptions.js | wc -l

# Verify collapse.js flag count
grep "^export let collapse" src/js/fn/collapse.js | wc -l

# Confirm build still passes
mise run build
```
