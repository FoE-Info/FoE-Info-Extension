# FoE-Info-Extension: UI Helpers & Utilities Guide

This document provides a comprehensive technical reference for the utility modules, global state containers, local storage wrappers, system constants, clipboard exporters, network posting integrations, and high-precision math calculations in the **FoE-Info-Extension** repository.

The utility codebase is housed primarily within `src/js/fn/` and provides foundational infrastructure for Chrome DevTools UI panel construction, Bootstrap 5 element generation, accordion collapse state persistence, outbound webhook communications, and floating-point error-free BigNumber calculations.

---

## 1. Executive Architecture Overview

The FoE-Info-Extension renders its analytical dashboards inside a Chrome DevTools Panel tab (`src/chrome/panel.html`). Unlike standard web applications, all user interface components are created dynamically via client-side JavaScript execution. Service modules in `src/js/msg/` process incoming WebSocket and HTTP network payloads intercepted from Forge of Empires, and use the helper modules in `src/js/fn/` to construct HTML elements, control accordion visibility, format tabular data, and export analytics.

```
+-----------------------------------------------------------------------+
|                       Chrome DevTools UI Panel                        |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------------------------+              +-------------------------+  |
|  |   src/js/fn/collapse   |              |  src/js/fn/AddElement   |  |
|  | (33 Panel State Flags) | <----------> |  (Bootstrap UI Badges)  |  |
|  +------------------------+              +-------------------------+  |
|               ^                                       ^               |
|               |                                       |               |
|  +------------------------+              +-------------------------+  |
|  |   src/js/fn/globals    |              |    src/js/fn/storage     |  |
|  |  (Panel Height Bounds) |              | (browser.storage.local) |  |
|  +------------------------+              +-------------------------+  |
|               ^                                       ^               |
|               +-------------------+-------------------+               |
|                                   |                                   |
|  +------------------------+       |      +-------------------------+  |
|  |    src/js/fn/helper    | ------+----> |    src/js/fn/post.js    |  |
|  | (Data & UI Transformers)              | (Discord/Sheets Webhooks|  |
|  +------------------------+              +-------------------------+  |
|               |                                       |               |
|  +------------------------+              +-------------------------+  |
|  |    src/js/fn/copy.js   |              |   bignumber.js Math     |  |
|  |  (12 Export Handlers)  |              | (Arc & Lock Precision)  |  |
|  +------------------------+              +-------------------------+  |
+-----------------------------------------------------------------------+
```

### Module Summary Table

| Module File                                             | Purpose & Role                                                                   | Key Exports & Dependencies                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`src/js/fn/AddElement.js`](../src/js/fn/AddElement.js) | Bootstrap DOM micro-factory for collapse icons, badges, close buttons            | `updateIcon`, `icon`, `copy`, `post`, `close`                                        |
| [`src/js/fn/collapse.js`](../src/js/fn/collapse.js)     | Accordion state machine for 33 UI panel section flags & tooltips                 | 33 `collapse*` boolean flags, `set(key, value)`, `fHideAllTooltips()`                |
| [`src/js/fn/globals.js`](../src/js/fn/globals.js)       | Configuration state container & 11 panel height setter wrappers                  | `toolOptions`, `setToolOptions`, 11 `set*Size` functions                             |
| [`src/js/fn/helper.js`](../src/js/fn/helper.js)         | Primary data transformer, 22-era index maps, incident card & GBG table generator | `numAges`, `fLevelfromAge`, `fAgefromLevel`, `fShowIncidents`, `fshowBattleground`   |
| [`src/js/fn/post.js`](../src/js/fn/post.js)             | Network posting integration for Discord webhooks and Google Sheets Web Apps      | `postData`, `postToDiscord`, `postTargetsToDiscord`, `postGBGtoSS`, `postPlayerToSS` |
| [`src/js/fn/copy.js`](../src/js/fn/copy.js)             | 12 clipboard export handlers using 3 distinct copy strategies                    | `DonorCopy`, `DonationCopy`, `fCityStatsCopy`, `BattlegroundCopy`, `TreasuryCopy`    |
| [`src/js/fn/storage.js`](../src/js/fn/storage.js)       | WebExtension storage wrapper using `webextension-polyfill`                       | `set` (`setStorage`), `get` (`getStorage`), `remove` (`removeStorage`)               |
| [`src/js/fn/constants.js`](../src/js/fn/constants.js)   | System-wide encryption salt constant                                             | `salt` constant                                                                      |

---

## 2. DOM Creation & Element Factory (`src/js/fn/AddElement.js`)

### 2.1 Overview & Responsibilities

The [`src/js/fn/AddElement.js`](../src/js/fn/AddElement.js) module serves as a micro-factory that generates standardized HTML string snippets embedded within DevTools panel card headers. It provides consistent Bootstrap 5 visual controls—such as accordion collapse icon toggles, clipboard copy pill badges, external posting pill badges, and alert close buttons—across the entire extension UI.

In addition to generating HTML string snippets, `AddElement.js` contains one direct DOM mutation routine (`updateIcon`), which dynamically updates a target header icon's DOM representation and persists its new collapse state to extension storage.

### 2.2 Functional Specifications & Signature Mapping

| Internal Function Name | Export Alias   | Parameters                    | Return Type          | Description & Behavior                                                                                                                                                        |
| ---------------------- | -------------- | ----------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fCollapseIcon`        | `updateIcon`   | `(id, _href, collapse)`       | `void` (DOM Mutator) | Queries `document.getElementById(id)`. If present, replaces `outerHTML` with the string from `icon(id, _href, collapse)` and calls `storage.set(collapse, collapse)`.         |
| `fAddCollapseIcon`     | `icon`         | `(id, _href, collapse)`       | `string` (HTML)      | Returns `<span class="header-icon material-icons-outlined md-12" id="${id}" href="#${_href}" data-bs-toggle="collapse">${collapse ? 'add' : 'remove'}_circle_outline</span>`. |
| `fCopyButton`          | `copy`         | `(id, colour, pos, collapse)` | `string` (HTML)      | Returns `<span id="${id}" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${collapse ? 'none' : 'block'}" data-i18n="copy">Copy</span>`.      |
| `fPostButton`          | `post`         | `(id, colour, pos, collapse)` | `string` (HTML)      | Returns `<span id="${id}" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${collapse ? 'none' : 'block'}" data-i18n="post">Post</span>`.      |
| `fCloseButton`         | `close`        | `()`                          | `string` (HTML)      | Returns `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`.                                                                       |
| `fCopyIcon`            | _(unexported)_ | `(id, colour, pos, collapse)` | `string` (HTML)      | Returns `<span class="bi ${pos}-icon float-end material-symbols-outlined" id="${id}" style="display: ${collapse ? 'none' : 'block'}">content_copy</span>`.                    |

### 2.3 Key Implementation Mechanics

1. **Material Icons Outlined Glyph Switching**:
   Collapse icons rely on Material Icons Outlined glyph names. When `collapse === true`, the panel is currently collapsed, so the button displays the `add_circle_outline` glyph (prompting the user to expand). When `collapse === false`, the panel is expanded, so the icon displays `remove_circle_outline`.
2. **Bootstrap 5 Attributes**:
   - `data-bs-toggle="collapse"` is embedded on header icon spans to trigger native Bootstrap accordion animations.
   - `data-bs-dismiss="alert"` is embedded on close buttons for alert card dismissal.
   - `data-i18n="copy"` and `data-i18n="post"` enable internationalization translation string binding.
3. **Inline Visibility Management**:
   The `copy` and `post` button generators accept a `collapse` boolean parameter. When `collapse` is `true` (panel collapsed), the button is rendered with inline `style="display: none"`. When `collapse` is `false` (panel expanded), it renders with `style="display: block"`.

---

## 3. Accordion Collapse & Panel State Machine (`src/js/fn/collapse.js`)

### 3.1 Overview & State Management Model

The [`src/js/fn/collapse.js`](../src/js/fn/collapse.js) module provides centralized state management for the extension's accordion user interface. It maintains **33 module-scoped boolean variables** representing whether individual UI panel cards or sections are collapsed (`true`) or expanded (`false`).

### 3.2 Complete Catalog of the 33 Boolean Collapse Flags

The table below documents all 33 exported boolean state flags, their initial default values, targeted UI panels, and DOM element container IDs:

| #   | Flag Name                   | Default Value | Targeted UI Feature / Section Scope  | Controlled DOM Element ID                    |
| --- | --------------------------- | ------------- | ------------------------------------ | -------------------------------------------- |
| 1   | `collapseFriends`           | `true`        | Friends Social List Panel            | `#friendsCopyID`, `#friendsText`             |
| 2   | `collapseGuild`             | `true`        | Guild Member Roster Panel            | `#guildCopyID`, `#guildText`                 |
| 3   | `collapseHood`              | `true`        | Neighborhood Social List Panel       | `#hoodCopyID`, `#hoodText`                   |
| 4   | `collapseIncidents`         | `true`        | Incident & Hidden Reward Alerts Card | `#incidentsTip`, `#incidentsText`            |
| 5   | `collapseArmy`              | `false`       | Army Unit Breakdown Table            | `#armyUnits`, `#armyCollapse`                |
| 6   | `collapseGoods`             | `true`        | Goods Inventory Summary Table        | `#goodsCopyID`, `#goodsCollapse`             |
| 7   | `collapseGVG`               | `false`       | GvG Continent Main Card              | `#gvgText`                                   |
| 8   | `collapseGVGinfo`           | `false`       | GvG Province Detail Card             | `#gvgInfoText`                               |
| 9   | `collapseGVGOverview`       | `false`       | GvG Sector Overview Table            | `#gvgOverviewText`                           |
| 10  | `collapseGVGGuildPower`     | `false`       | GvG Guild Power Ranking Table        | `#gvgGuildPowerText`                         |
| 11  | `collapseGVGCurrAge`        | `false`       | GvG Current Era Sector Matrix        | `#gvgCurrAgeText`                            |
| 12  | `collapseGVGAllGuildsPower` | `false`       | GvG All Guilds Power Overview        | `#gvgAllGuildsPowerText`                     |
| 13  | `collapseStats`             | `false`       | City Statistics Dashboard Main Card  | `#citystatsCopyID`, `#citystatsText`         |
| 14  | `collapseGBInfo`            | `false`       | Great Building Overlay Info Window   | `#greatbuilding`                             |
| 15  | `collapseGBRewards`         | `false`       | GB Level Rewards Matrix              | `#gbRewardsText`                             |
| 16  | `collapseGBDonors`          | `false`       | GB Donor Positions Table             | `#donorCopyID`, `#donorcollapse`             |
| 17  | `collapseGBinvest`          | `false`       | GB Investment Calculations Card      | `#investText`                                |
| 18  | `collapseInvested`          | `true`        | Total FP Invested Tracker Card       | `#onHandFP`, `#investedCopyID`               |
| 19  | `collapseDonation`          | `false`       | GB Donation Calculator Output        | `#donationCopyID`, `#donationText3`          |
| 20  | `collapseBattleground`      | `false`       | Guild Battleground (GBG) Matrix      | `#battlegroundPostID`, `#battlegroundCopyID` |
| 21  | `collapseBuildingCost`      | `true`        | GBG Building Cost Breakdown Table    | `#buildingCostText`                          |
| 22  | `collapseExpedition`        | `false`       | Guild Expedition (GE) Roster Table   | `#expeditionCopyID`, `#expeditionText`       |
| 23  | `collapseTreasury`          | `true`        | Guild Treasury Summary Table         | `#treasuryCopyID`, `#treasuryText`           |
| 24  | `collapseTreasuryLog`       | `true`        | Guild Treasury Donation Logs         | `#treasuryLogText`                           |
| 25  | `collapseGalaxy`            | `false`       | Blue Galaxy Doubling Optimizer       | `#galaxyText`                                |
| 26  | `collapseTarget`            | `false`       | GBG Sector Target Generator Card     | `#targetPostID`, `#targetText`               |
| 27  | `collapseTargetGen`         | `false`       | GBG Target Generator Details         | `#targetGenCollapse`                         |
| 28  | `collapseBuildings`         | `false`       | City Production Buildings List       | `#buildingsText`                             |
| 29  | `collapseLists`             | `false`       | Combined Social Lists Main Card      | `#listsText`                                 |
| 30  | `collapseRewards`           | `false`       | Reward Notifications Log Card        | `#rewardsText`                               |
| 31  | `collapseBonus`             | `true`        | Daily Building Charge Bonuses        | `#bonusText`                                 |
| 32  | `collapseCultural`          | `true`        | Cultural Settlement Goods Matrix     | `#culturalText`                              |
| 33  | `collapseClipboard`         | `true`        | Scratch Clipboard Buffer Panel       | `#clipboardCopyID`, `#clipboardText`         |

### 3.3 Dynamic State Setter: `set(key, value)`

The module exports a `set(key, value)` function that accepts a string key matching one of the 33 flag names and a boolean value. It executes a `switch(key)` block to update the corresponding module-level boolean variable:

```javascript
export default function set(key, value) {
  switch (key) {
    case 'collapseFriends':
      collapseFriends = value;
      break;
    case 'collapseGuild':
      collapseGuild = value;
      break;
    case 'collapseStats':
      collapseStats = value;
      break;
    // ... handles all 33 keys ...
    default:
      console.debug(key, value);
      break;
  }
}
```

### 3.4 Individual Toggle Handlers & Special Logic

Each section header binds to a dedicated toggle handler function exported by `collapse.js`. Toggle handlers systematically:

1. Invert the boolean flag (`collapseX = !collapseX`).
2. Synchronize associated header button element visibility (`display = collapseX ? 'none' : 'block'`).
3. Call `element.updateIcon(iconId, hrefId, collapseX)` to update the icon glyph and save state to extension local storage.

#### Special Toggle Behaviors:

- **`fCollapseArmy()`**: When collapsed (`true`), calculates summary text by concatenating `#armyUnits2` and `#armyUnits3` HTML and writing it into `#armyUnits.innerHTML`. When expanded (`false`), clears `#armyUnits.innerHTML`.
- **`fCollapseInvested()`**: When collapsed (`true`), copies `#onHandFP2.innerHTML` into `#onHandFP.innerHTML`. When expanded (`false`), clears `#onHandFP.innerHTML`.
- **`fCollapseBattleground()`**: Toggles display visibility for both `#battlegroundPostID` and `#battlegroundCopyID` buttons simultaneously.
- **`fCollapseIncidents()`** and **`fCollapseStats()`**: Execute `fHideAllTooltips()` prior to toggling collapse state to eliminate floating tooltip artifacts.

### 3.5 Global Tooltip & Popover Teardown: `fHideAllTooltips()`

When accordion panels collapse, active Bootstrap Popovers or Tooltips attached to child elements can remain orphaned on screen if not explicitly dismissed. `collapse.js` implements a cleanup routine:

```javascript
function fHideAllTooltips() {
  const popoverTriggerList = document.querySelectorAll(
    '[data-bs-toggle="popover"]',
  );
  [...popoverTriggerList].map((popoverEl) =>
    Popover.getOrCreateInstance(popoverEl).hide(),
  );
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  [...tooltipTriggerList].map((tooltipEl) =>
    Tooltip.getOrCreateInstance(tooltipEl).hide(),
  );
  if (checkDebug()) console.debug('fHideAllTooltips');
}
```

---

## 4. Global Configuration & Container Sizing (`src/js/fn/globals.js`)

### 4.1 Purpose & State Container

The [`src/js/fn/globals.js`](../src/js/fn/globals.js) module stores UI panel container height preferences in memory and handles saving them to extension local storage (`browser.storage.local`).

The module exports a mutable configuration object `toolOptions`:

```javascript
export var toolOptions = {
  armySize: 200,
  goodsSize: 200,
  friendsSize: 200,
  treasurySize: 200,
  gvgSize: 200,
  logsSize: 200,
  battlegroundsSize: 200,
  expeditionSize: 200,
  visitSize: 200,
  rewardSize: 200,
  buildingCostSize: 200,
  minSize: 50,
};
```

### 4.2 Panel Height Setter Functions & Boundary Clamping

`globals.js` exports 11 height setter functions. Each function enforces a minimum size boundary (`height > toolOptions.minSize` = 50px) and a maximum size clamp (`height > 500 ? 500 : height`), before calling `storage.set('toolOptions', toolOptions)` to persist the updated configuration object.

| Function                      | Property Mutated                | Default | Description                                                   |
| ----------------------------- | ------------------------------- | ------- | ------------------------------------------------------------- |
| `setToolOptions(value)`       | `toolOptions`                   | N/A     | Overwrites the entire `toolOptions` object reference.         |
| `setFriendsSize(height)`      | `toolOptions.friendsSize`       | 200px   | Updates & persists Friends list container max-height.         |
| `setArmySize(height)`         | `toolOptions.armySize`          | 200px   | Updates & persists Army unit breakdown container height.      |
| `setGoodsSize(height)`        | `toolOptions.goodsSize`         | 200px   | Updates & persists Goods inventory container height.          |
| `setTreasurySize(height)`     | `toolOptions.treasurySize`      | 200px   | Updates & persists Guild Treasury log container height.       |
| `setGVGSize(height)`          | `toolOptions.gvgSize`           | 200px   | Updates & persists GvG continent container height.            |
| `setLogsSize(height)`         | `toolOptions.logsSize`          | 200px   | Updates & persists Activity Log container height.             |
| `setBattlegroundSize(height)` | `toolOptions.battlegroundsSize` | 200px   | Updates & persists GBG comparison table container height.     |
| `setExpeditionSize(height)`   | `toolOptions.expeditionSize`    | 200px   | Updates & persists Guild Expedition container height.         |
| `setVisitSize(height)`        | `toolOptions.visitSize`         | 200px   | Updates & persists Visited Player City container height.      |
| `setRewardSize(height)`       | `toolOptions.rewardSize`        | 200px   | Updates & persists Incident / Reward alert container height.  |
| `setBuildingCostSize(height)` | `toolOptions.buildingCostSize`  | 200px   | Updates & persists GBG building cost matrix container height. |

---

## 5. Primary Helper Utilities (`src/js/fn/helper.js`)

### 5.1 Overview & Responsibilities

The [`src/js/fn/helper.js`](../src/js/fn/helper.js) module is the largest utility module in the repository. It performs data transformations, era index mapping, Great Building name abbreviation, incident card HTML construction (`fShowIncidents`), and Guild Battleground member comparison matrix rendering (`fshowBattleground`).

### 5.2 Era Index & Translation Constants

FoE-Info-Extension supports **22 distinct game eras/ages** (from Bronze Age through Space Age Space Hub). `helper.js` provides bidirectional translations between era string keys, numeric indices, and GvG province codes:

- `export const numAges = 22;` — Global constant defining total supported eras.

#### 1. Era String to Numeric Level Index (`fLevelfromAge`)

Maps an era key string to a 1-based integer index `[1..22]`. Returns `-1` if unrecognized.

```javascript
BronzeAge (1) -> IronAge (2) -> EarlyMiddleAge (3) -> HighMiddleAge (4) ->
LateMiddleAge (5) -> ColonialAge (6) -> IndustrialAge (7) -> ProgressiveEra (8) ->
ModernEra (9) -> PostModernEra (10) -> ContemporaryEra (11) -> TomorrowEra (12) ->
FutureEra (13) -> ArcticFuture (14) -> OceanicFuture (15) -> VirtualFuture (16) ->
SpaceAgeMars (17) -> SpaceAgeAsteroidBelt (18) -> SpaceAgeVenus (19) ->
SpaceAgeJupiterMoon (20) -> SpaceAgeTitan (21) -> SpaceAgeSpaceHub (22)
```

#### 2. Numeric Level Index to Era String (`fAgefromLevel`)

Maps an integer `[1..22]` back to the standard FoE age string key. Returns `-1` if out of range.

#### 3. Era Key to GvG Province Code (`fGVGagesname`)

Maps era string keys to short GvG codes: `BA`, `IA`, `EMA`, `HMA`, `LMA`, `CA`, `InA`, `PE`, `ME`, `PME`, `CE`, `TE`, `FE`, `AF`, `OF`, `VF`, `SAM`, `SAAB`, `SAV`, `SAJM`, `SAT`, `SASH`, `AA` (All Age).

### 5.3 Name & Data Formatting Utilities

| Function             | Input Parameters | Output   | Description                                                                                                                                    |
| -------------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `fResourceShortName` | `(name)`         | `string` | Abbreviates resource keys (e.g. `'sacrificial_offerings'` $\rightarrow$ `'Offerings'`), or looks up key in `ResourceNames`.                    |
| `fRewardShortName`   | `(reward)`       | `string` | Trims reward descriptions (e.g. `'Fragment of Statue Of Honor Selection Kit'` $\rightarrow$ `'SoH Fragment'`).                                 |
| `fGBsname`           | `(city_entity)`  | `string` | Translates Great Building names into 2–4 letter acronyms (e.g. `'Castel del Monte'` $\rightarrow$ `'CdM'`, `'The Arc'` $\rightarrow$ `'Arc'`). |
| `fGBname`            | `(city_entity)`  | `string` | Maps internal entity codes (e.g. `'X_FutureEra_Landmark1'`) to full Great Building names (e.g. `'The Arc'`).                                   |
| `fEntityNameTrim`    | `(name)`         | `string` | Strips level prefixes/suffixes (`' - Lv.'`, `'Lv. 1 - '`) from `CityEntityDefs` names.                                                         |
| `fGoodsTally`        | `(age, good)`    | `void`   | Mutates global `Goods` count object by incrementing the specified age property (`ba`, `ia`, `ema`, etc.).                                      |

### 5.4 Incident Alert Card Renderer (`fShowIncidents()`)

**Target Node**: `incidents.innerHTML`

#### Workflow:

1. Inspects the global `hiddenRewards` array. Ignores incidents where `position.context === 'guildExpedition'`.
2. Resolves incident name and category code using `fIncidentName(type)`. Category codes:
   - `r` / `R`: Road incident (lowercase = common, capital = uncommon/rare).
   - `n` / `N`: Nature incident.
   - `s` / `S`: Shore incident.
   - `w` / `W`: Water incident.
   - `E`: Event incident.
3. Computes active vs. upcoming countdown timers in `hours:minutes:seconds`.
4. Injects a dismissible Bootstrap alert card (`.alert-light`) containing incident list, popover legend, and collapse toggle into `incidents.innerHTML`.
5. Instantiates a Bootstrap `Popover` instance on `#incidents_tooltip` (`trigger: 'hover focus'`, `html: true`, `delay: { show: 100, hide: 300 }`).
6. Binds `fCollapseIncidents` click listener to `#incidentsTextLabel` and `fHideTooltips` mouseleave listener.

### 5.5 GBG Comparison Table Renderer (`fshowBattleground()`)

**Target Node**: `donationDIV.innerHTML`

#### Workflow:

1. Iterates over the `BattlegroundPerformance` array.
2. Compares member negotiations, battles, and attrition against historical baseline entries in `GuildMembers`.
3. Computes deltas (`negotiationsDiff`, `battleDiff`, `attritionDiff`). If `showOptions.showBattlegroundChanges` is checked, filters table to show only members with active deltas. Delta values render in red: `<span class="red">+<diff></span>`.
4. Constructs HTML table `#gbg-table` and injects into `donationDIV`.
5. Binds click handlers for posting (`postGBGtoSS`), copying (`BattlegroundCopy`), collapsing (`fCollapseBattleground`), and toggling changes filter (`fshowBattlegroundChanges`).
6. Attaches a native `ResizeObserver` to `#battlegroundCollapse` to observe height changes and invoke `setBattlegroundSize`.

---

## 6. Network Posting & Webhook Integrations (`src/js/fn/post.js`)

### 6.1 Purpose & Network Transport Protocols

The [`src/js/fn/post.js`](../src/js/fn/post.js) module manages outbound exports of game analytics to external services (Discord Webhooks and Google Sheets Web App APIs).

The module uses two transport mechanisms:

- `XMLHttpRequest`: Used by `postToDiscord`, `postTargetsToDiscord`, `postGBGtoSS`, `logToDiscord`, and `postPlayerToSS` for standard POST dispatches with `Content-type: application/json` headers.
- `fetch()`: Implemented in `postData()` using `mode: 'cors'`, `credentials: 'include'`, and `referrerPolicy: 'strict-origin-when-cross-origin'`.

### 6.2 Function Specifications & Target Endpoints

| Function Name          | Signature           | Transport        | Target Endpoint        | Description                                                                                                      |
| ---------------------- | ------------------- | ---------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `postData`             | `async (url, data)` | `fetch` (CORS)   | Parameterized `url`    | Generic promise-based JSON POST helper.                                                                          |
| `postToDiscord`        | `(text)`            | `XMLHttpRequest` | Hardcoded Test Webhook | Sends raw string content to Discord test channel.                                                                |
| `postTargetsToDiscord` | `()`                | `XMLHttpRequest` | `url.discordTargetURL` | Extracts `#targetText` HTML, strips tags, appends separator (`----------`), and posts to target Discord webhook. |
| `postGBGtoSS`          | `()`                | `XMLHttpRequest` | `url.sheetGuildURL`    | Packs global `GBGdata` and `EpocTime` into JSON and posts to Google Sheets Web App.                              |
| `postAlerttoDsicord`   | `()`                | `XMLHttpRequest` | Hardcoded Test Webhook | Forwards text content from `#alertText` to `postToDiscord()`. _(Retains legacy typo)_.                           |
| `logToDiscord`         | `(text)`            | `XMLHttpRequest` | Hardcoded Log Webhook  | Sends telemetry/log text to dedicated Discord logging channel webhook.                                           |
| `postPlayerToSS`       | `(visitData)`       | `XMLHttpRequest` | `url.sheetGuildURL`    | Posts visited player profile card (`visitData`) to Google Sheets API; manages progress alert lifecycle.          |

### 6.3 Outbound Payload Schemas

#### 1. Discord Webhook Payload Schema

```json
{
  "username": "PlayerName",
  "avatar_url": "",
  "content": "Sector B2T Target: 40 Battles Remaining\n----------"
}
```

#### 2. Guild Battleground (GBG) Google Sheets Payload Schema

```json
{
  "sheet": "GBG",
  "epoc": 1691364000,
  "GBGdata": {
    "map": {},
    "battles": [],
    "members": []
  }
}
```

#### 3. Visited Player Profile Google Sheets Payload Schema

```json
{
  "sheet": "Guild",
  "playerData": [
    {
      "Name": "TargetPlayer",
      "Guild": "TargetGuild",
      "Era": "SpaceAgeTitan",
      "CityStats": {}
    }
  ],
  "user": "ScanningPlayerName"
}
```

### 6.4 Progress Banners & Alert Lifecycle

`postPlayerToSS(visitData)` interacts directly with the `alerts` DOM node (imported from `index.js`):

1. **Initial Banner**: Injects a Bootstrap alert: `<div class="alert alert-danger..."><p id="alertText">Posting Guild Stats to SS...</p></div>`.
2. **Response Handlers**: On `readyState === 4` (`XMLHttpRequest.DONE`), parses `oReq.responseText` within a `try/catch` block. On success, displays `JSON.parse(oReq.responseText).result`; on failure, displays raw response text.
3. **Auto-Dismiss Timer**: Instantiates a 60,000ms (60s) timer via `setTimeout`:
   ```javascript
   setTimeout(function () {
     const alert = Alert.getOrCreateInstance('#alertText');
     alert.close();
     alert.dispose();
     alerts.innerHTML = '';
   }, 60000);
   ```

---

## 7. Clipboard Export Suite (`src/js/fn/copy.js`)

### 7.1 Catalog of all 12 Export Functions

The [`src/js/fn/copy.js`](../src/js/fn/copy.js) module formats HTML panel fragments into plain-text or tabular format and copies them to the system clipboard.

| Export Function Name | Targeted Selector / Node             | UI Feature Scope                       | Copy Mechanism Strategy                      |
| -------------------- | ------------------------------------ | -------------------------------------- | -------------------------------------------- |
| `fClipboardCopy`     | `div#clipboardText`                  | Scratch Clipboard Buffer Panel         | Textarea Scratch Buffer (`copyToClipboard`)  |
| `DonorCopy`          | `#donorText`                         | GB Donation Calculator (1st–5th Locks) | Textarea Scratch Buffer (`copyToClipboard`)  |
| `DonorCopy2`         | `div#donorTextCollapse`              | Secondary GB Donor Ranking Table       | Textarea Scratch Buffer (`copyToClipboard`)  |
| `fInvestedCopy`      | `div#investedText`                   | Total FP Invested Summary Card         | Textarea Scratch Buffer (`copyToClipboard`)  |
| `DonationCopy`       | `#copyText`                          | Formatted GB Donation Recommendation   | Selection Range API (`document.createRange`) |
| `fCityStatsCopy`     | `#citystatsLabel` + `#citystatsText` | City Statistics Main Card              | Hidden Debug DOM Node Buffer (`debug`)       |
| `fFriendsCopy`       | `#friendsText2`                      | Friends Social List Roster             | Selection Range API (`document.createRange`) |
| `fGuildCopy`         | `#guildText2`                        | Guild Member Roster Table              | Selection Range API (`document.createRange`) |
| `fHoodCopy`          | `#hoodText2`                         | Neighborhood Social List Table         | Selection Range API (`document.createRange`) |
| `BattlegroundCopy`   | `#gbg-table`                         | GBG Member Comparison Matrix           | Selection Range API via `copyNode()`         |
| `ExpeditionCopy`     | `#expeditionText`                    | Guild Expedition Contribution Table    | Selection Range API (`document.createRange`) |
| `TreasuryCopy`       | `#treasurytable`                     | Guild Treasury Donation Logs           | Selection Range API (`document.createRange`) |

### 7.2 The Three Copy Mechanism Strategies

#### Strategy 1: Clipboard API with Fallback (`copyToClipboard`)

Used by `fClipboardCopy`, `DonorCopy`, `DonorCopy2`, and `fInvestedCopy`:

1. Reads the target element via `document.querySelector(element)`.
2. Extracts the raw `innerHTML` and appends a snapshot to `#clipboard` via `addToClipboard(element, html)`.
3. Passes the HTML through sequential regex text transformation filters.
4. Attempts to write plain-text to the system clipboard via `navigator.clipboard.writeText(html)` (Async Clipboard API).
5. On failure, falls back to `fallbackCopy(text)`: creates a temporary `<textarea>`, sets its value, calls `.select()` and `document.execCommand('copy')`, then removes it.

#### Strategy 2: Selection Range API (`document.createRange` / `copyNode`)

Used by `DonationCopy`, `fFriendsCopy`, `fGuildCopy`, `fHoodCopy`, `ExpeditionCopy`, `TreasuryCopy`:

1. Instantiates a Range object: `let range = document.createRange();`.
2. Selects target node: `range.selectNode(copytext)` or `range.selectNodeContents(node)`.
3. Clears selection: `window.getSelection().removeAllRanges();`.
4. Adds range to selection: `window.getSelection().addRange(range);`.
5. Triggers `document.execCommand('copy')`.

`BattlegroundCopy` uses `copyNode(node)`, which attempts `navigator.clipboard.writeText(node.innerText)` first, then falls back to the selection range API.

#### Strategy 3: Hidden Debug Node Buffer (`fCityStatsCopy`)

Used by `fCityStatsCopy`:

1. Concatenates HTML fragments from `#citystatsLabel` and `#citystatsText`.
2. Writes concatenated HTML into `debug.innerHTML` (imported DOM node handle from `index.js`).
3. Selects `debug` node via `createRange()` and `addRange()`.
4. Triggers `document.execCommand('copy')`.
5. Clears `debug.innerHTML = ''` to preserve clean state.

### 7.3 HTML-to-Plaintext Sanitation Pipeline

`copyToClipboard(element)` sanitizes raw HTML into clean multi-line plain text:

```javascript
html = html.replace(/<br\s*\/?>/gi, '\n');
html = html.replace(/<\/tr>/gi, '\n');
html = html.replace(/<\/?(p|tr|td)[^>]*>/gi, '');
html = html.replace(/<\/p>/gi, '\n');
html = html.replace(/<\/?span[^>]*>/gi, '');
```

> **Note**: The regex patterns now use case-insensitive flags (`gi`) and a consolidated tag-stripping pattern for `p`, `tr`, `td` elements.

---

## 8. Extension Storage Encapsulation (`src/js/fn/storage.js`)

### 8.1 API Wrappers & Specifications

The [`src/js/fn/storage.js`](../src/js/fn/storage.js) module provides asynchronous, promise-based encapsulation around the WebExtension Storage API using `webextension-polyfill` (`browser.storage.local`).

#### 1. `set(name, value)` / `setStorage(name, value)`

- **Behavior**: Executes `browser.storage.local.set({ [name]: value })`.
- **Error Handling**: Inspects `browser.runtime.lastError`. If present, logs `'error: '` followed by the error object to `console.log`.

#### 2. `get(name)` / `getStorage(name)`

- **Behavior**: Executes `browser.storage.local.get(name)`. The inner `.then()` callback unwraps `result[name]`.
- **Error Handling**: If `browser.runtime.lastError` is set, logs `'Error retrieving index: ...'` and returns `undefined`.

#### 3. `remove(name)` / `removeStorage(name)`

- **Behavior**: Executes `browser.storage.local.remove(name)`.

---

## 9. System Constants (`src/js/fn/constants.js`)

The [`src/js/fn/constants.js`](../src/js/fn/constants.js) module defines system-wide constant values:

```javascript
export const salt = 'notquitesafewaytostoreinfo';
```

- **`salt`**: Legacy cryptographic salt string used by internal key hashing functions (`getKey(text)`).

---

## 10. High-Precision Math Requirements & `bignumber.js`

### 10.1 IEEE 754 Floating-Point Limitations in Forge of Empires

JavaScript represents numbers using standard IEEE 754 double-precision floating-point format (64-bit). In binary floating-point representation, base-10 decimals (such as Arc percentage multipliers like `1.90` or `1.92`) cannot be represented with exact precision:

$$\text{In standard JS: } 0.1 + 0.2 = 0.30000000000000004$$

In Forge of Empires, Great Building leveling investments involve large integer Forge Point quantities (e.g. 15,000 FP per level) multiplied by Arc boost factors (e.g., $1.90 \times \text{reward}$). Performing floating-point multiplication in native JavaScript produces IEEE 754 precision artifacts (e.g., `19.999999999999996` or `20.000000000000004`). When passed to standard integer conversion functions like `Math.floor()`, `19.999999999999996` truncates to `19` instead of `20`, causing calculation errors that could misinform players on position lock costs.

To guarantee zero precision loss and deterministic integer rounding, FoE-Info-Extension incorporates the `bignumber.js` library across its calculation engines.

### 10.2 Domain Specifications & Code Implementations

#### 1. Arc Boost Multiplier Calculation

- **Context**: Great Building donation calculator ([`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js)) and City statistics summary ([`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)).
- **Mathematical Formula**:

$$\text{Boosted Reward} = \left\lfloor \text{Base Reward} \times \left(1 + \frac{\text{ArcBonus}}{100}\right) \right\rfloor$$

- **Code Implementation**:

```javascript
// src/js/msg/GreatBuildingsService.js:646
export function calculateArcReward(reward, currentPercent) {
  return new BigNumber(reward).times(currentPercent).div(100).dp(0);
}
```

```javascript
// src/js/index.js:1379
const rewardBonus = BigNumber(City.ArcBonus)
  .div(100)
  .plus(1)
  .times(reward)
  .dp(0);
```

- **Precision Guarantee**: `.dp(0)` explicitly specifies 0 decimal places using standard half-up rounding, eliminating floating-point tail noise.

#### 2. Great Building Donor Lock Threshold

- **Context**: Calculating the exact minimum Forge Points required for a donor to lock place 1 through 5 on a Great Building without being overtaken.
- **Mathematical Formula**:

$$\text{Lock Threshold} = \left\lceil \frac{\text{Total FP} - \text{Current FP} + \text{Top Donor FP}}{2} \right\rceil$$

- **Code Implementation**:

```javascript
// src/js/msg/GreatBuildingsService.js:1011
Donation = new BigNumber(GBselected.total - GBselected.current + Top[index])
  .dividedBy(2)
  .dp(0, BigNumber.ROUND_UP);

// Safe integer comparison against remaining capacity:
if (Donation.isLessThan(BigNumber(remaining))) {
  // Donor lock is achievable
}
```

- **Precision Guarantee**: `.dp(0, BigNumber.ROUND_UP)` guarantees exact ceiling rounding regardless of integer size, while `Donation.isLessThan(BigNumber(remaining))` executes arbitrary-precision comparison avoiding JavaScript `Number.MAX_SAFE_INTEGER` bounds.

#### 3. Donor Yield & Profit Percentage Math

- **Context**: Calculating return percentage on donor investments in Great Building tables.
- **Mathematical Formula**:

$$\text{Profit \%} = \left\lfloor \frac{\text{Profit} \times 100}{\text{Donation}} \right\rfloor$$

- **Code Implementation**:

```javascript
// src/js/msg/GreatBuildingsService.js:1018
Percent = new BigNumber(Profit).multipliedBy(100).idiv(Donation);
```

- **Precision Guarantee**: The `.idiv()` method performs integer division, directly producing an exact truncated integer percentage without floating-point intermediate values.

#### 4. Large Integer Score & Power Formatting

- **Context**: Formatting player leaderboard scores and guild power totals in [`src/js/msg/OtherPlayerService.js`](../src/js/msg/OtherPlayerService.js) and [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js).
- **Code Implementation**:

```javascript
// OtherPlayerService.js:943
const formattedScore = BigNumber(player.score).div(1000000).toFormat(0) + 'M';

// ClanBattleService.js:265
clan.power = BigNumber(clan.power).toFormat(0);
```

### 10.3 Comprehensive BigNumber Operations Summary Table

| Source File                                                                     | Line | Variable / Calculation Target | BigNumber Operation                                          | Precision Guarantee / Purpose            |
| ------------------------------------------------------------------------------- | ---- | ----------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| [`src/js/index.js`](../src/js/index.js)                                         | 1379 | `rewardBonus`                 | `BigNumber(City.ArcBonus).div(100).plus(1).times(reward)`    | Arc bonus FP multiplier calculation      |
| [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) | 118  | `GBrewards[Rank - 1]`         | `new BigNumber(...)`                                         | Instantiates precision reward object     |
| [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) | 212  | Donor lock check              | `Donation.isLessThan(BigNumber(remaining))`                  | Safe capacity threshold comparison       |
| [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) | 648  | `calculateArcReward`          | `new BigNumber(reward).times(currentPercent).div(100).dp(0)` | Exact 0-decimal Arc reward rounding      |
| [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) | 1011 | `Donation` (1st–5th Lock)     | `.dividedBy(2).dp(0, BigNumber.ROUND_UP)`                    | Exact ceiling rounding for GB donor lock |
| [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) | 1018 | `Percent` (Profit %)          | `new BigNumber(Profit).multipliedBy(100).idiv(Donation)`     | Exact integer division for return yield  |
| [`src/js/msg/OtherPlayerService.js`](../src/js/msg/OtherPlayerService.js)       | 943  | Score formatting              | `BigNumber(player.score).div(1000000).toFormat(0) + 'M'`     | Millions score string formatting         |
| [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)         | 265  | `clan.power`                  | `BigNumber(clan.power).toFormat(0)`                          | Formatted guild power digit grouping     |

---

## 11. Verification & Webpack Build Protocol

To verify that all utility modules and their dependencies compile cleanly under Webpack 5 without bundling or linting errors, run the build command:

```bash
npm run build
```

The Webpack bundler executes using `webpack.prod.js` (merging `webpack.common.js`) and outputs production assets to `build/FoE-Info_WEBSTORE/`.

