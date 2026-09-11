# UI, RPC, and Metadata Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the punch-list of 14 UI, RPC, and metadata defects across FoE-Info: Settings button opening, `[-]`/`[+]` collapse controls, title click decoupling, panel resizing, visibility defaults, Treasury Goods, Guild menu trigger, split GE panels, date/time formatting, metadata/FP reload handling, and SAD unit name trimming.

**Architecture:** Modifies UI component generators (`AddElement.js`, `expeditionTables.js`, `containerBinding.js`), SCSS layout rules (`custom.scss`), domain RPC handlers (`TreasuryService.js`, `OtherPlayerService.js`, `ArmyUnitManagementService.js`, `StartupService.js`), and state synchronization (`storageListener.js`, `factoryDefaults.js`).

**Tech Stack:** ES modules / CommonJS hybrid, Bootstrap 5.3, Sass/SCSS, Node.js `node:test`, Chrome MV3 WebExtension API.

**Spec:** User request punch-list (14 items: Settings button, metadata reload, `[-]`/`[+]` icons, title click decoupling, Goods inventory on login, Treasury Goods display, horizontal resize on 5 panels, BG results toggle glitch, Guild menu trigger, Building collection time format, split GE panels, Daily FP preservation, SAD unit names).

## Global Constraints

- File size budget: No module in `src/js/` may exceed 600 lines.
- Dual CJS/ESM compatibility: Preserve CommonJS + ES exports where existing.
- BigNumber precision: Use BigNumber for Arc bonus and FP mathematics.
- Verification Gate: Every task must pass `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, and `npm run build:dev`.
- All collapse/expand buttons must render as `[-]` and `[+]`.
- Clicking the panel title text must NEVER trigger collapse/expand; only `[-]` and `[+]` may trigger it.

---

### Task 1: UI Shell Controls & Header Collapse Decoupling (Items 1, 3, 4, 8)

**Files:**

- Modify: `src/chrome/manifest.json`
- Modify: `src/js/ui/containerBinding.js:70-130`
- Modify: `src/js/ui/AddElement.js:1-60`
- Modify: `src/js/ui/incidentsPanel.js:50-70`
- Modify: `src/js/ui/expeditionTables.js:20-40`
- Modify: `src/js/msg/GuildBattlegroundService.js:150-170`
- Modify: `src/js/fn/helper.js:550-575`
- Test: `tests/ui/collapse-icons-and-titles.test.mjs`

**Interfaces:**

- Consumes: `element.icon(id, target, collapse)`
- Produces: `element.icon` returning `[-]` (expanded) and `[+]` (collapsed), title headers without `data-bs-toggle="collapse"`, robust options page launcher.

- [ ] **Step 1: Write characterization tests for icon text and title decoupling**

Create `tests/ui/collapse-icons-and-titles.test.mjs`:
Verify `element.icon('testId', 'targetId', false)` renders `[-]`.
Verify `element.icon('testId', 'targetId', true)` renders `[+]`.
Verify `AddElement.updateIcon` swaps text between `[-]` and `[+]`.

- [ ] **Step 2: Update manifest.json and containerBinding.js for Settings Page opening**

In `src/chrome/manifest.json`:
Set `"options_ui": { "page": "options.html", "open_in_tab": true }`.
In `src/js/ui/containerBinding.js`:
Wire `optionsBtn` (`#go-to-options`) to launch options page safely via:

```javascript
optionsBtn.addEventListener('click', () => {
  if (typeof browser !== 'undefined' && browser.runtime?.openOptionsPage) {
    browser.runtime.openOptionsPage().catch(() => {
      window.open(browser.runtime.getURL('options.html'));
    });
  } else if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open('options.html');
  }
});
```

- [ ] **Step 3: Update collapse icons to `[-]` and `[+]` and decouple title clicks**

In `src/js/ui/AddElement.js`:
Update `fAddCollapseIcon`:

```javascript
function fAddCollapseIcon(id, _href, collapse) {
  return `<span class="header-icon collapse-toggle fw-bold font-monospace" id="${id}" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="${_href}" data-bs-target="#${_href}" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>`;
}
```

In `src/js/ui/incidentsPanel.js`:
Update `renderIncidentIcon` to return `${isCollapsed ? '[+]' : '[-]'}` with `collapse-toggle fw-bold font-monospace`.
Remove `data-bs-toggle="collapse"`, `href="#..."`, and `role="button"` from title `<p>` tags across:

- `src/js/ui/incidentsPanel.js` (`#incidentsTextLabel`)
- `src/js/ui/panelDispatcher.js` (`#treasuryTextLabel`, `#clipboardTextLabel`)
- `src/js/ui/gbOverviewCard.js` (`#donorTextLabel`)
- `src/js/ui/gbgProvinceView.js` (`#buildingCostTextLabel`, `#targetGenLabel`)
- `src/js/ui/renderGalaxyPanel.js` (`#galaxyTextLabel`)
- `src/js/ui/renderGbInfoPanel.js` (`#gbInfoTextLabel`)
- `src/js/ui/renderInvestedPanel.js` (`#investedTextLabel`)
- `src/js/ui/RewardRenderer.js` (`#rewardsTextLabel`)
- `src/js/msg/ResourceService.js` (`#goodsTextLabel`)
- `src/js/msg/ArmyUnitManagementService.js` (`#armyTextLabel`)
- `src/js/msg/BonusService.js` (`#bonusTextLabel`)
- `src/js/msg/OutpostService.js` (`#culturalTextLabel`)
- `src/js/msg/StartupService.js` (`#buildingsTextLabel`, `#citystatsLabel`)
- `src/js/msg/OtherPlayerService.js` (`#listTextLabel`, `#friendsTextLabel`, `#guildTextLabel`, `#hoodTextLabel`)
- `src/js/msg/GuildBattlegroundService.js` (`#battlegroundResultTextLabel`, `#targetGenLabel`)
- `src/js/fn/helper.js` (`#battlegroundTextLabel`)

- [ ] **Step 4: Fix Battleground Results toggle glitch (Item 8)**

In `src/js/msg/GuildBattlegroundService.js:157`:
Ensure `<p id="battlegroundResultTextLabel">` does NOT have `data-bs-toggle="collapse"`.
Ensure click listener in `GuildBattlegroundService.js` and `helper.js` targets `#battlegroundicon` cleanly, updating `collapse.fCollapseBattleground` without double-toggle desync.

- [ ] **Step 5: Run verification gate**

Run `npm test`, `npm run check`, `npm run lint`, `npm run build:dev`. Verify all pass.

---

### Task 2: Panel Visibility Defaults & Horizontal Resizing (Items 5, 6, 7)

**Files:**

- Modify: `src/css/custom.scss:415-430`
- Modify: `src/js/state/factoryDefaults.js:20-40`
- Modify: `src/js/state/showOptions.js:15-30`
- Modify: `src/js/msg/ResourceService.js:10-30, 270-290`
- Modify: `src/js/msg/TreasuryService.js:240-290`
- Modify: `src/js/msg/ArmyUnitManagementService.js:250-270`
- Modify: `src/js/msg/OtherPlayerService.js:235-290`
- Modify: `src/js/msg/GuildBattlegroundService.js:155-180`
- Test: `tests/ui/panel-resize-and-visibility.test.mjs`

**Interfaces:**

- Consumes: `.resize-both` SCSS class, `showOptions` flags.
- Produces: `showGoods: false` on login, visible `#treasury` panel, `resize: both` on requested panels.

- [ ] **Step 1: Write characterization tests for visibility defaults and panel resize classes**

Create `tests/ui/panel-resize-and-visibility.test.mjs`:
Verify `createFreshWorldSettings().showGoods` is `false`.
Verify `ArmyUnitManagementService`, `OtherPlayerService` (friends, guild, hood), and `GuildBattlegroundService` (results) include `resize-both` or horizontal resize classes on their collapsible content divs.
Verify `TreasuryService.renderTreasuryPanel` renders into `#treasury` and sets `display = ''` when `showTreasury` is true.

- [ ] **Step 2: Add horizontal resize styles in custom.scss**

In `src/css/custom.scss`:
Add `.resize-both`:

```scss
.resize-both {
  resize: both;
  overflow: auto;
  min-width: 200px;
  max-width: 100%;
}
```

Update `.resize` to allow `overflow: auto;`.

- [ ] **Step 3: Update panel markup to use resize-both**

In `src/js/msg/ArmyUnitManagementService.js:256`:
Add `resize-both` to `#armyText`.
In `src/js/msg/OtherPlayerService.js:239, 251, 267, 283`:
Add `resize-both` to `#listsText`, `#friendsText`, `#guildText`, `#hoodText`.
In `src/js/msg/GuildBattlegroundService.js:164`:
Add `resize-both` to `#battlegroundTextCollapse` and `#battlegroundCollapse`.

- [ ] **Step 4: Make Goods Inventory not show up on login (Item 5)**

In `src/js/state/factoryDefaults.js:28`:
Change `showGoods: true` to `showGoods: false`.
In `src/js/state/showOptions.js:22`:
Change `export var showGoods = true;` to `export var showGoods = false;`.
In `src/js/msg/ResourceService.js:15`:
Set `let showOptions = { showGoods: false };`.

- [ ] **Step 5: Fix Treasury Goods display (Item 6)**

In `src/js/msg/TreasuryService.js`:
In `renderTreasuryPanel(reserves)`:
Ensure target element is found (`document.getElementById('treasury')`).
Ensure it checks `showOptions?.showTreasury !== false`.
Ensure it clears `d-none` and sets `targetEl.style.display = ''`.
Ensure both `Map` (reserves) and plain object resources are correctly iterated and formatted.

- [ ] **Step 6: Run verification gate**

Run `npm test`, `npm run check`, `npm run lint`, `npm run build:dev`. Verify all pass.

---

### Task 3: Guild Menu RPC Ingestion & Split GE Panels (Items 9, 11)

**Files:**

- Modify: `src/js/protocol/legacyBridge.js:200-225`
- Modify: `src/js/msg/OtherPlayerService.js:220-330`
- Modify: `src/js/ui/expeditionTables.js:1-164`
- Modify: `src/js/msg/GuildExpeditionService.js:30-120`
- Test: `tests/ui/split-ge-panels.test.mjs`
- Test: `tests/msg/guild-menu-trigger.test.mjs`

**Interfaces:**

- Consumes: `ClanService` RPC messages, `GuildExpeditionService` ranking/contribution data.
- Produces: `wrapChampionshipCard` and `wrapContributionCard` independent panels in `expeditionTables.js`, automated guild panel display on clan menu RPCs.

- [ ] **Step 1: Write characterization tests for split GE panels and Guild menu trigger**

Create `tests/ui/split-ge-panels.test.mjs`:
Verify `expeditionTables.js` exports `wrapChampionshipCard` and `wrapContributionCard` as separate standalone cards.
Verify each card contains its own header, `[-]`/`[+]` button, copy button, and table.
Create `tests/msg/guild-menu-trigger.test.mjs`:
Verify `ClanService.getOverview`, `ClanService.getOwnClanData`, `ClanService.getClanData`, `ClanService.getMembers` route to `otherPlayerServiceUpdateActions` and ensure the guild panel is shown/expanded.

- [ ] **Step 2: Connect Guild Menu RPCs in legacyBridge.js and OtherPlayerService.js**

In `src/js/protocol/legacyBridge.js`:
Register:

- `ClanService.getOverview`
- `ClanService.getOwnClanData`
- `ClanService.getClanData`
- `ClanService.getMembers`
- `ClanMemberService.getMemberList`
  Route each to `otherPlayerServiceUpdateActions(msg.responseData, { autoExpandGuild: true })`.
  In `OtherPlayerService.js`:
  When `autoExpandGuild` is triggered, ensure `#friends` and `#guildText` are visible and uncollapsed (`collapse.collapseGuild = false`).

- [ ] **Step 3: Split GE Championship and Member Contributions into 2 separate panels**

In `src/js/ui/expeditionTables.js`:
Replace `wrapExpeditionCard` and `buildSubpanel` with:

- `wrapChampionshipCard(tableHtml, collapse = false, size = 200)`:
  Renders `#geChampionshipCard` with header `<p id="geChampionshipLabel">`, `[-]`/`[+]` button `#geChampionshipIcon`, copy button `#geChampionshipCopyID`, and content `#geChampionshipText` with `resize-both`.
- `wrapContributionCard(tableHtml, collapse = false, size = 200)`:
  Renders `#geContributionCard` with header `<p id="geContributionLabel">`, `[-]`/`[+]` button `#geContributionIcon`, copy button `#geContributionCopyID`, and content `#geContributionText` with `resize-both`.
  In `src/js/msg/GuildExpeditionService.js`:
  Render both cards independently into `#info` or their target containers, allowing both to remain visible and expandable simultaneously.

- [ ] **Step 4: Run verification gate**

Run `npm test`, `npm run check`, `npm run lint`, `npm run build:dev`. Verify all pass.

---

### Task 4: Time Formatting, Metadata Loading Order & SAD Unit Trimming (Items 2, 10, 12, 13)

**Files:**

- Modify: `src/js/state/storageListener.js:90-180`
- Modify: `src/js/msg/StartupService.js:1230-1260, 150-180`
- Modify: `src/js/msg/ArmyUnitManagementService.js:170-195`
- Test: `tests/utils/date-config-sync.test.mjs`
- Test: `tests/msg/sad-units-trimming.test.mjs`
- Test: `tests/msg/metadata-loading-order.test.mjs`

**Interfaces:**

- Consumes: `global:settings` storage key, `resolveMissingCityEntities`, Space Age unit definitions.
- Produces: Synced date/time config in panel, prioritized `BuildingEntityLookup` loading before entity resolution, preserved `City.ForgePoints`, trimmed `FGX-` unit names.

- [ ] **Step 1: Write characterization tests for SAD unit trimming, time formatting sync, and metadata order**

Create `tests/msg/sad-units-trimming.test.mjs`:
Verify SAD units:

- `FGX-102 Anvil` -> `Anvil`
- `FGX-101 Skyrider` -> `Skyrider`
- `FGX-105 Assassin` -> `Assassin`
- `FGX-104 Hammer` -> `Hammer`
- `FGX-103 Shadow` -> `Shadow`
  Verify formatting with era prefix produces `SAD: Anvil 700`, `SAD: Skyrider 834`, etc.
  Create `tests/utils/date-config-sync.test.mjs`:
  Verify `handleReceiveStorage` and `handleStorageChange` ingest `global:settings` and call `setTimeFormattingConfig`.

- [ ] **Step 2: Implement SAD unit name trimming in ArmyUnitManagementService.js**

In `src/js/msg/ArmyUnitManagementService.js:175-188`:
Strip `FGX-\d+\s*` from `unitName`:

```javascript
unitName = unitName.replace(/^FGX-\d+\s*/i, '');
```

- [ ] **Step 3: Ingest global:settings in storageListener.js for time formatting (Item 10)**

In `src/js/state/storageListener.js`:
In `handleReceiveStorage(result)`:
Check `result['global:settings']?.timeFormatting || result.timeFormatting`:
Call `setTimeFormattingConfig(timeFormatting)`.
In `handleStorageChange(changes)`:
Check `changes['global:settings']?.newValue?.timeFormatting`:
Call `setTimeFormattingConfig(newValue.timeFormatting)`.

- [ ] **Step 4: Fix metadata loading order and Daily FP reset bug (Items 2, 12)**

In `src/js/state/storageListener.js:handleReceiveStorage`:
Process `BuildingEntityLookup` and definition caches BEFORE processing `CityEntityDefs` and map resolution.
In `src/js/msg/StartupService.js:1247`:
When `resolveMissingCityEntities(missing, callback)` completes, re-evaluate city stats from `lastStartupMsg` so buildings that were previously missing their entity definition are recalculated and included in `City.ForgePoints` and city stats, preventing Daily FP from wiping to 0.

- [ ] **Step 5: Run full verification gate**

Run `npm run verify` (format, check, i18n, test, build:dev) and `npm run graph:foe-info:ast`.
Confirm all 449+ unit tests pass, 0 lint errors, 0 build errors.
