# FoE-Info-Extension Codebase Technical Manual

> **Navigation**: [← Documentation Index](../INDEX.md) | [System Architecture Overview](../system-architecture.md) | [Domain Services Reference](../domain-services.md) | [Agentic Workflow Guide](agent-workflow-guide.md)

## 1. System Overview & Architectural Model

**FoE-Info-Extension** is a high-performance Chrome Manifest V3 browser extension built to monitor, analyze, and optimize player activities in _Forge of Empires_ (FoE). It operates by attaching to Chrome's DevTools Network API, intercepting live HTTP/2 JSON request/response payloads transmitted between the client game interface (`https://*.forgeofempires.com/game/*`) and Innogames servers, as well as static asset/metadata loads from Innogames CDNs (`https://foe*.innogamescdn.com/start/metadata`).

Rather than modifying the game's internal client scripts directly, the extension operates as an out-of-band observer inside the browser extension environment. Intercepted game packets are parsed in real time to maintain local memory states (city entity maps, Great Building levels, Guild Battleground sector control, army composition, resource balances, emissary bonuses, and guild member histories) and render dynamic, interactive Bootstrap 5 / jQuery analytical dashboards overlaying the Chrome DevTools panel environment.

### 1.1 Architecture & Component Interaction Diagram

```
                                  ┌───────────────────────────┐
                                  │   Forge of Empires Game   │
                                  │   Client (Browser Tab)    │
                                  └─────────────┬─────────────┘
                                                │ JSON Traffic (HTTPS / HTTP2)
                                                ▼
                                  ┌───────────────────────────┐
                                  │  Chrome Network Subsystem │
                                  └─────────────┬─────────────┘
                                                │
                                                │ browser.devtools.network.onRequestFinished
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                              src/js/index.js (App Entry Chunk)                               │
│                                                                                              │
│  handleRequestFinished(request)  [Central Traffic Controller / God Node]                      │
│  ├─ Regex URL filtering (/game/json?h= | /start/metadata)                                    │
│  ├─ StaticDataService.getMetadata() -> Loads & caches city entities & military metadata       │
│  └─ Message Dispatching Table (Routes msg.requestClass x msg.requestMethod to 11 services)  │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────────┘
       │          │          │          │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼          ▼          ▼          ▼
 ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
 │ Startup  ││  Great   ││  Guild   ││  Other   ││   Army   ││ Resource ││   City   ││  Bonus / │
 │ Service  ││Buildings ││Battlegrd ││ Player   ││   Unit   ││ Service  ││Production││  Others  │
 └────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
      │           │           │           │           │           │           │           │
      └───────────┴───────────┼───────────┴───────────┴───────────┴───────────┴───────────┘
                              │
                              ▼ State Updates & UI Invocations
             ┌───────────────────────────────────────────────┐
             │       src/js/fn/ Utility & UI Catalog         │
             │                                               │
             │ ├─ AddElement.js  (Bootstrap DOM Factories)   │
             │ ├─ collapse.js    (33 Panel Toggle Flags)     │
             │ ├─ copy.js        (Clipboard Exporters)       │
             │ ├─ helper.js      (Data Transformers & Format)│
             │ ├─ post.js        (Discord & Sheets Webhooks) │
             │ ├─ globals.js     (UI Heights & Tool Options) │
             │ └─ storage.js     (browser.storage Wrapper)   │
             └───────────────────────┬───────────────────────┘
                                     │
                                     ▼ DOM Mounting
             ┌───────────────────────────────────────────────┐
             │         DevTools Panel UI Overlay             │
             │  (#citystats, #greatbuilding, #treasury,      │
             │   #incidents, #battleground, #expedition)     │
             └───────────────────────────────────────────────┘
```

---

## 2. Core Entry Points & Application Lifecycle

The extension source code in `src/js/` and HTML templates in `src/chrome/` define four distinct entry points compiled by Webpack into individual application chunks.

### 2.1 Content Script & Dispatch Hub: `src/js/index.js`

- **Role**: Main application orchestrator and DevTools panel content script (`app` chunk).
- **Execution Flow**:
  1. **Global State Initialization**: Instantiates core state containers (`CityEntityDefs`, `MilitaryDefs`, `CastleDefs`, `SelectionKitDefs`, `BoostMetadataDefs`, `MyInfo`, `PlayerID`, `Resources`, `BattlegroundPerformance`, `GBselected`).
  2. **Storage Synchronization (`receiveStorage` & `storageChange`)**: Loads persistent preferences from `browser.storage.local` into local variables (e.g. `showOptions`, `toolOptions`, `donationPercent`) and registers a listener on `browser.storage.onChanged` to apply live settings changes without requiring a panel reload.
  3. **Network Listener Registration**: Attaches `handleRequestFinished(request)` to `browser.devtools.network.onRequestFinished`.
  4. **Metadata Priming**: Intercepts Innogames CDN requests matching `/start/metadata?id=`. Invokes `StaticDataService.getMetadata()` to fetch and cache city entities and unit metadata via `Promise.all()`. If a startup data packet arrives prior to metadata load completion, it is buffered as `pendingStartupMsg` and processed immediately once `metadataLoaded` turns `true`.
  5. **Message Dispatching**: Filters game API traffic matching `https://*.forgeofempires.com/game/json?h=`, extracts JSON packet arrays, and routes each payload based on its `requestClass` and `requestMethod` properties to one of the 11 domain services in `src/js/msg/`.
  6. **DOM Mounting**: Mounts Bootstrap container elements (`#citystats`, `#greatbuilding`, `#treasury`, `#incidents`, `#battleground`, etc.) into `panel.html`.

### 2.2 DevTools Registration: `src/js/devtools.js` & `src/chrome/devtools.html`

- **Role**: Registers the custom inspection tab inside Chrome Developer Tools.
- **Implementation**:
  - `devtools.html` loads the cross-browser extension polyfill (`browser-polyfill.js`) and executes the `devtools.js` bundle.
  - `src/js/devtools.js` calls the Chrome DevTools extension API:
    ```javascript
    import browser from 'webextension-polyfill';

    browser.devtools.panels.create(EXT_NAME, null, 'panel.html');
    ```
  - This spawns a top-level DevTools panel titled `"FoE-Info"` (or `"FoE-Info-DEV"` in development) hosting `panel.html` and running `app.js` (`src/js/index.js`).

### 2.3 Options Settings Interface: `src/js/options.js` & `src/chrome/options.html`

- **Role**: Configuration UI for toggling extension features, setting minimum panel dimensions, custom donation multipliers, and configuring remote webhooks.
- **Implementation**:
  - Encapsulated within `options.html` and rendered either inline or as an extension options tab (`options_ui`).
  - Uses `restore_options()` on `DOMContentLoaded` to populate HTML form inputs from `browser.storage.local`.
  - Uses `save_options()` on click of `#save` to commit updated feature flags and URLs back to `browser.storage.local`.
  - Prompts for storage permissions explicitly via `browser.permissions.request({ permissions: ['storage'] })`.
  - Manages webhook integration fields: Discord target webhooks (`url.discordTargetURL`) and Google Sheets API scripts (`url.sheetGuildURL`).

### 2.4 Action Popup Fallback: `src/js/popup.js` & `src/chrome/popup.html`

- **Role**: Default toolbar icon popup menu.
- **Implementation**:
  - Displays quick instructions explaining how to launch Developer Tools (e.g. `Ctrl+Shift+I` / `Cmd+Opt+I` -> Select **FoE-Info** tab).
  - Includes an options shortcut button (`#go-to-options`) that invokes `browser.runtime.openOptionsPage()` or opens `options.html` in a new tab if `openOptionsPage` is unavailable.

---

## 3. Chrome Manifest V3 Configuration

The extension manifest is declared in `src/chrome/manifest.json` for development and `src/chrome/manifest_release.json` for production packaging.

```json
{
  "manifest_version": 3,
  "minimum_chrome_version": "88.0",
  "action": {
    "default_popup": "popup.html"
  },
  "devtools_page": "devtools.html",
  "options_ui": {
    "page": "options.html",
    "open_in_tab": false
  },
  "permissions": ["storage", "unlimitedStorage", "clipboardWrite", "webRequest"],
  "host_permissions": [
    "https://*.forgeofempires.com/game/*",
    "https://*.google.com/*",
    "https://*.googleusercontent.com/",
    "https://discordapp.com/api/webhooks/*",
    "https://discord.com/api/webhooks/*",
    "https://*.innogamescdn.com/*"
  ],
  "web_accessible_resources": [
    {
      "resources": ["browser-polyfill.js"],
      "matches": ["https://*.forgeofempires.com/*"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' ; object-src 'self'"
  }
}
```

### 3.1 Permission Specifications & Justification

| Permission                            | Category        | Technical Rationale & Usage                                                                                                                                                                                                            |
| ------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                             | Permission      | Required to read and persist user settings, feature flags (`showOptions`), panel sizing (`toolOptions`), cached entity definitions (`CityEntityDefs`), and custom target strings.                                                      |
| `unlimitedStorage`                    | Permission      | Removes the current 10 MB `chrome.storage.local` quota; measure representative peak usage before treating it as permanently required.                                                                                                  |
| `clipboardWrite`                      | Permission      | Enables background and click-triggered copying of formatted FP donor tables, GvG/GBG sector summaries, and guild activity reports directly to the user's OS clipboard via `copy.js`.                                                   |
| `webRequest`                          | Permission      | Allows inspecting and filtering network request headers. Used via `chrome.webRequest.onBeforeSendHeaders` to strip `Origin` headers sent to Innogames CDNs, circumventing strict CORS restrictions when requesting game static assets. |
| `https://*.forgeofempires.com/game/*` | Host Permission | Grants access to capture JSON game request/response traffic across all Forge of Empires server domains (e.g. `en1.forgeofempires.com`, `de3.forgeofempires.com`).                                                                      |
| `https://*.innogamescdn.com/*`        | Host Permission | Enables fetching static game entity metadata, building images, unit definitions, and selection kit mappings from Innogames CDN servers.                                                                                                |
| `https://discord*.com/api/webhooks/*` | Host Permission | Permits outbound POST HTTP requests from `post.js` to dispatch sector targets, donor statistics, and log alerts to user-configured Discord channels.                                                                                   |
| `https://*.google.com/*`              | Host Permission | Permits outbound HTTP requests to user-configured Google Apps Script Web APIs for sync to Google Sheets (`postGBGtoSS`, `postPlayerToSS`).                                                                                             |

---

## 4. Webpack 5 Build Pipeline Architecture

The project employs Webpack 5 to handle ES module bundling, SCSS/Sass compilation, HTML template injection, asset distribution, and manifest transformation. Three build configuration files exist in the project root:

1. `webpack.common.js` — Shared base configuration (entry points, loaders, `ProvidePlugin`, static asset copy rules, and `splitChunks` vendor optimization).
2. `webpack.dev.js` — Development pipeline optimized for developer iteration, source mapping (`eval-cheap-module-source-map`), and watch mode.
3. `webpack.prod.js` — Production pipeline optimized for minification (`TerserPlugin`), CSS minification (`CssMinimizerPlugin`), asset extraction, release packaging (`ZipPlugin`), and bundle analysis (`BundleAnalyzerPlugin`).

### 4.1 Comparative Configuration Matrix

| Feature / Setting                   | `webpack.dev.js` (Development)                     | `webpack.prod.js` (Production Webstore)                        |
| ----------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| **Build Target Directory**          | `build/FoE-Info-DEV/`                              | `build/FoE-Info_WEBSTORE/`                                     |
| **Webpack Mode**                    | `'development'`                                    | `'production'`                                                 |
| **Source Maps**                     | `eval-cheap-module-source-map`                     | Disabled                                                       |
| **Code Minification**               | None                                               | `TerserPlugin` (ECMA 6, pure_funcs stripped, comments removed) |
| **Console Cleaning**                | Retains all `console.*` output                     | Strips `console.info` and `console.debug` calls                |
| **CSS Processing**                  | `style-loader` (Injects `<style>` blocks into DOM) | `MiniCssExtractPlugin` & `CssMinimizerPlugin`                  |
| **Base Manifest Source**            | `src/chrome/manifest.json`                         | `src/chrome/manifest_release.json`                             |
| **Package Name (`EXT_NAME`)**       | `"FoE-Info-DEV"`                                   | `"FoE-Info"`                                                   |
| **Global Defines (`DefinePlugin`)** | `DEV: true`, `WEBSTORE: false`                     | `DEV: false`, `WEBSTORE: true`                                 |
| **Archive Generation**              | Disabled                                           | `ZipPlugin` generates `FoE-Info_WEBSTORE_<version>_<date>.zip` |
| **Bundle Analysis**                 | Disabled                                           | `ANALYZE=true` (`npm run analyze`)                             |

### 4.2 Entry Points & Output Chunks

Both configurations define four entry chunks mapping to their respective source entry points:

```javascript
entry: {
  app: './src/js/index.js',
  options: './src/js/options.js',
  devtools: './src/js/devtools.js',
  popup: './src/js/popup.js'
}
```

### 4.3 Automated Global Provisioning (`webpack.ProvidePlugin`)

To streamline module development and prevent repetitive boilerplate imports, Webpack automatically injects global bindings:

```javascript
new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery',
  browser: 'webextension-polyfill',
});
```

This guarantees that jQuery (`$`, `jQuery`) and the cross-browser Extension API wrapper (`browser`) are universally accessible across all bundled files without explicit `import` statements.

### 4.4 Production Optimization & Packaging (`webpack.prod.js`)

In production mode, `TerserPlugin` performs AST transformations to optimize bundle size and strip debug logs:

```javascript
new TerserPlugin({
  terserOptions: {
    ecma: 6,
    compress: {
      pure_funcs: ['console.info', 'console.debug'],
    },
    format: {
      comments: false,
    },
    mangle: true,
    module: true,
  },
  extractComments: false,
});
```

Following asset bundling and manifest generation via `WebpackExtensionManifestPlugin`, `ZipPlugin` automatically compresses the contents of `build/FoE-Info_WEBSTORE/` into a ready-to-upload Webstore distribution zip named `FoE-Info_WEBSTORE_<version>_<YYYY-MM-DD>.zip` placed directly in the `build/` folder.

---

## 5. Overview of Helper Utilities (`src/js/fn/*`)

The `src/js/fn/` directory houses modular utility functions that manage DOM creation, UI panel collapsible states, clipboard exports, panel dimension calculations, data formatting, remote webhooks, and browser storage:

```
src/js/fn/
├── AddElement.js   # Bootstrap 5 badge, button, and icon DOM snippet factories
├── collapse.js     # State tracking for 33 panel collapse flags & tooltip reset handlers
├── constants.js    # Security salt string constant ('notquitesafewaytostoreinfo')
├── copy.js         # Clipboard formatters & temporary textarea copy engines
├── globals.js      # Global panel height sizing state & set*Size() persistence
├── helper.js       # Data formatters (GB acronyms, resource short names, incident alerts)
├── post.js         # Discord webhook & Google Sheets API HTTP dispatchers
└── storage.js      # Promise wrapper over browser.storage.local
```

### 5.1 Function Catalog & Technical Responsibilities

- **`AddElement.js`**:

  - `icon(id, _href, collapse)` / `updateIcon(id, _href, collapse)`: Constructs dynamic Bootstrap icon collapse toggles (`add_circle_outline` vs `remove_circle_outline`).
  - `copy(id, colour, pos, collapse)`: Constructs interactive Bootstrap badge buttons triggering clipboard copy routines.
  - `post(id, colour, pos, collapse)`: Constructs interactive Bootstrap badge buttons triggering Discord/Sheets webhooks.
  - `close()`: Generates standard Bootstrap alert dismiss buttons.

- **`collapse.js`**:

  - Maintains 33 boolean variables representing UI panel display collapse states (`collapseFriends`, `collapseGuild`, `collapseIncidents`, `collapseArmy`, `collapseGoods`, `collapseGVG`, `collapseGBInfo`, `collapseInvested`, `collapseTreasury`, etc.).
  - Exports a `set(key, value)` switch-case function for mass setting updates.
  - Exposes dedicated toggle functions (`fCollapseGBInfo()`, `fCollapseFriends()`, `fCollapseIncidents()`, `fCollapseArmy()`, `fCollapseTreasury()`, etc.) that flip boolean states, sync to `storage.set()`, and update DOM collapse icons.
  - `fHideAllTooltips()`: Destroys active Bootstrap 5 Popovers and Tooltips across the DOM to prevent lingering UI artifacts.

- **`copy.js`**:

  - Low-level `copyToClipboard(element)`: Spawns a temporary hidden `<textarea>`, strips HTML formatting tags, converts linebreaks, executes `document.execCommand('copy')`, and cleans up the DOM node.
  - High-level exporters: `fClipboardCopy()`, `DonorCopy()`, `DonorCopy2()`, `fInvestedCopy()`, `DonationCopy()`, `fCityStatsCopy()`, `fFriendsCopy()`, `fGuildCopy()`, `fHoodCopy()`, `BattlegroundCopy()`, `ExpeditionCopy()`, `TreasuryCopy()`.

- **`globals.js`**:

  - `toolOptions`: Global sizing object holding panel height limits (`armySize`, `goodsSize`, `friendsSize`, `treasurySize`, `gvgSize`, `logsSize`, `battlegroundsSize`, `expeditionSize`, `visitSize`, `rewardSize`, `buildingCostSize`, `minSize: 50`).
  - Sizing setters (`setFriendsSize`, `setArmySize`, `setGoodsSize`, etc.): Validate requested panel heights against `minSize`, enforce a maximum cap of 500px, and sync changes to `chrome.storage.local`.

- **`helper.js`**:

  - `fResourceShortName(name)`: Maps internal game resource keys to localized display strings using `ResourceNames`.
  - `fRewardShortName(reward)`: Converts long reward item strings into clean shortened labels (e.g. `"Statue Of Honor Selection Kit"` -> `"SoH Kit"`).
  - `fGBsname(city_entity)`: Translates long Great Building entity names into standard community acronyms (e.g. `"Castel del Monte"` -> `"CdM"`, `"The Arc"` -> `"Arc"`, `"Alcatraz"` -> `"Traz"`).
  - `fEntityNameTrim(name)`: Strips level prefixes (`"Lv. 1 - "`) from entity definitions.
  - `fShowIncidents()`: Evaluates hidden rewards arrays and constructs DOM alert cards for collectible city incidents.

- **`post.js`**:

  - `postToDiscord(text)` / `logToDiscord(text)`: Dispatches JSON payloads to Discord webhooks via `XMLHttpRequest` POST requests.
  - `postTargetsToDiscord()`: Formats GBG sector target text and transmits updates to configured Discord channel webhooks.
  - `postGBGtoSS()` / `postPlayerToSS(visitData)`: Transmits GBG performance metrics and player visit data to external Google Sheets Apps Script endpoints (`url.sheetGuildURL`).

- **`storage.js`**:
  - Promise-based wrapper around `browser.storage.local` exposing `set(name, value)`, `get(name)`, and `remove(name)`.

---

## 6. Feature Flags & Configuration Architecture (`src/js/vars/showOptions.js`)

Feature visibility across the extension is governed by `src/js/vars/showOptions.js`. This module exports 34 default boolean flags, a dynamic updater function, and an `items` state container:

```javascript
export var showFriends = true;
export var showGuild = true;
export var showHood = true;
export var showBonus = true;
export var showIncidents = true;
export var showGVG = true;
export var showStats = true;
export var showGBInfo = false;
export var showGBRewards = true;
export var showGBDonors = true;
export var showInvested = true;
export var showDonation = true;
export var showBattleground = true;
export var showBattlegroundChanges = false;
export var showExpedition = true;
export var showTreasury = true;
export var showVisit = true;
export var showSettlement = true;
export var showArmy = true;
export var showGoods = false;
export var showLeaderboard = false;
export var showGBGrewards = true;
export var GBGprovinceTime = true;
export var GBGshowSC = true;
export var showGErewards = true;
export var showRewards = true;
export var showLogs = false;
export var showContributions = false;
export var showGuildPosition = false;
export var hideUnsafe = true;
export var buildingCosts = false;
export var collectionTimes = false;
export var clipboard = true;

export default function set(name, state) {
  Object.entries(state).forEach((entry) => {
    const [key, value] = entry;
    items[key] = value;
  });
}

var items = {
  showFriends,
  showGuild,
  showHood,
  showBonus,
  showIncidents,
  showGVG,
  showStats,
  showGBInfo,
  showGBRewards,
  showGBDonors,
  showInvested,
  showDonation,
  showBattleground,
  showBattlegroundChanges,
  showExpedition,
  showTreasury,
  showVisit,
  showSettlement,
  showArmy,
  showGoods,
  showLeaderboard,
  showGBGrewards,
  GBGprovinceTime,
  GBGshowSC,
  showGErewards,
  showRewards,
  showLogs,
  showContributions,
  showGuildPosition,
  hideUnsafe,
  buildingCosts,
  collectionTimes,
  clipboard,
};

export { items as showOptions };
```

### 6.1 Feature Flag State Lifecycle

1. **Default State**: Initialized from exports in `showOptions.js`.
2. **Storage Sync**: During extension launch (`index.js`), `browser.storage.local.get('showOptions')` retrieves saved user preferences and invokes `set('showOptions', savedOptions)` to mutate `showOptions.items`.
3. **UI Evaluation**: UI rendering functions in `src/js/msg/` check `showOptions[flag]` before mounting corresponding DOM containers into `#panel`.
4. **Options Page Editing**: Modifying toggle switches on `options.html` calls `save_options()` in `options.js`, which updates `browser.storage.local`. The `storageChange` observer in `index.js` receives the update in real time and updates the runtime state without requiring a browser tab restart.

---

## 7. Build Verification & Validation

The architectural configuration and Webpack production build pipeline can be verified using the project build toolchain:

```bash
npm run build
# or
mise run build
```

### Expected Output & Build Verification Artifacts:

- **Exit Code**: 0 (Clean compilation).
- **Output Directory**: `build/FoE-Info_WEBSTORE/`
- **Generated Assets**:
  - `app.js` & `app.css` (Main content script & panel bundle)
  - `options.js` & `options.css` (Options page bundle)
  - `devtools.js` (DevTools registration script)
  - `popup.js` (Popup interface bundle)
  - `panel.html`, `options.html`, `popup.html`, `devtools.html`
  - `browser-polyfill.js`
  - Copied icon & localization assets (`icons/`, `i18n/`)
  - Compressed distribution package: `build/FoE-Info_WEBSTORE_<version>_<date>.zip`
