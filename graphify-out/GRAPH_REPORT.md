# Graph Report - FoE-Info-Extension  (2026-08-14)

## Corpus Check
- Corpus is ~42,470 words - fits in a single context window. You may not need a graph.

## Summary
- 508 nodes · 816 edges · 39 communities (29 shown, 10 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 1% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Toolbar & Panel State Setters
- Clipboard Copy Buttons & Donation Toggle
- Extension Permissions & Host Access
- Webpack Dev Dependencies
- Panel Section Collapse Controls
- Package Metadata & Core Deps
- Debug & Player Info State
- Legal, Security & Endpoint Docs
- Webpack Build Config
- Great Buildings Donation Service
- Audit: Build & Correctness Issues
- Clipboard Copy Logic
- Third-Party Runtime Libraries
- Audit: Undeclared Var & XSS Bugs
- Discord/SS Post Reporting
- MCP Tooling Config
- Extension Options Page
- Audit: Assignment-in-Condition Bugs
- Audit: Duplicated If/Else Chains
- Audit: HTML Template Gaps
- Audit: webRequest No-Op Bug
- Audit: Hardcoded SCSS Colors
- Audit: Invalid CSS Values
- Audit: Manifest Build-Time Fields
- Audit: Unused Manifest Permissions
- Extension Branding
- Webpack Entry Architecture
- i18n Full-Document Rescans
- Audit: Missing Null Checks
- Audit: Undefined CSS Custom Props
- Dependency Placement Check
- Extension Data Handling Boundaries
- Vulnerability Reporting Policy
- Toolbar Icon Glyph
- Extension Icon Asset
- Constants & Salt
- Graphify npm Scripts

## God Nodes (most connected - your core abstractions)
1. `handleRequestFinished()` - 47 edges
2. `FoE-Info-Extension Consolidated Audit` - 32 edges
3. `scripts` - 15 edges
4. `showGreatBuldingDonation()` - 15 edges
5. `Options Page (options.html)` - 15 edges
6. `startupService()` - 14 edges
7. `checkDebug()` - 10 edges
8. `FoE Info README` - 10 edges
9. `otherPlayerService()` - 9 edges
10. `setCurrentPercent()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `showOptions.set() Stale Named Exports Bug` --references--> `set()`  [EXTRACTED]
  AUDIT.md → src/js/vars/showOptions.js
- `storage.js Missing Return Statements` --references--> `setStorage()`  [EXTRACTED]
  AUDIT.md → src/js/fn/storage.js
- `storage.js Missing Return Statements` --references--> `getStorage()`  [EXTRACTED]
  AUDIT.md → src/js/fn/storage.js
- `storage.js Missing Return Statements` --references--> `removeStorage()`  [EXTRACTED]
  AUDIT.md → src/js/fn/storage.js
- `setMyGuildPermissions Undeclared Variable Bug` --references--> `setMyGuildPermissions()`  [EXTRACTED]
  AUDIT.md → src/js/index.js

## Import Cycles
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ResourceService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/BonusService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/CityProductionService.js -> src/js/fn/helper.js`

## Hyperedges (group relationships)
- **Webpack Entry Point Architecture (HTML + JS Pairs)** — src_chrome_devtools_doc, src_chrome_panel_doc, src_chrome_options_doc, src_chrome_popup_doc, src_js_devtools_module, src_js_index_module, src_js_options_module, src_js_popup_module [INFERRED 0.85]
- **Extension Data Handling and Security Boundary** — readme_doc, security_doc, readme_discord_webhook_endpoint, readme_google_endpoints, readme_browser_storage_local [INFERRED 0.80]
- **Options Page Feature Groups** — src_chrome_options_doc, src_chrome_options_city_info, src_chrome_options_gb_info, src_chrome_options_gvg, src_chrome_options_guild_battlegrounds, src_chrome_options_guild_expedition, src_chrome_options_other_info, src_chrome_options_player_lists, src_chrome_options_guild_admin, src_chrome_options_discord_sheets, src_chrome_options_language [EXTRACTED 1.00]
- **storage.js Broken Return Values Breaking useNewDonationPanel Toggle** — audit_bug_storage_missing_return, src_js_fn_storage_getstorage, src_js_fn_storage_setstorage, src_js_fn_storage_removestorage, greatbuildingsservice_usenewdonationpanel_toggle [EXTRACTED 0.95]
- **Audit Fix Priority Ranking** — audit_priority_order, audit_bug_storage_missing_return, audit_bug_xss_unescaped_names, audit_bug_webrequest_noop, audit_bug_foreach_return_discarded, audit_bug_referenceerror_undeclared_vars, audit_bug_setmyguildpermissions_referenceerror [EXTRACTED 0.95]
- **Leftover Content-Script Permission Surface** — audit_security_unused_permission_surface, manifest_json_web_accessible_resources, manifest_json_externally_connectable [EXTRACTED 0.90]

## Communities (39 total, 10 thin omitted)

### Community 0 - "Toolbar & Panel State Setters"
Cohesion: 0.06
Nodes (48): set(), setBuildingCostSize(), setRewardSize(), setToolOptions(), clearCultural(), clearExpedition(), clearForBattleground(), clearForMainCity() (+40 more)

### Community 1 - "Clipboard Copy Buttons & Donation Toggle"
Cohesion: 0.05
Nodes (35): storage.js Missing Return Statements, useNewDonationPanel toggle caller (GreatBuildingsService.js), fAddCollapseIcon(), fCollapseIcon(), setArmySize(), setBattlegroundSize(), setExpeditionSize(), setGoodsSize() (+27 more)

### Community 2 - "Extension Permissions & Host Access"
Cohesion: 0.05
Nodes (37): clipboardWrite, https://discord.com/api/webhooks/*, https://discordapp.com/api/webhooks/*, https://*.forgeofempires.com/game/*, https://*.google.com/*, https://*.googleusercontent.com/, https://*.innogamescdn.com/*, storage (+29 more)

### Community 3 - "Webpack Dev Dependencies"
Cohesion: 0.05
Nodes (37): copy-webpack-plugin, cross-env, css-loader, html-webpack-plugin, @ianvs/prettier-plugin-sort-imports, mini-css-extract-plugin, devDependencies, copy-webpack-plugin (+29 more)

### Community 4 - "Panel Section Collapse Controls"
Cohesion: 0.06
Nodes (3): fCollapseIncidents(), fCollapseStats(), fHideAllTooltips()

### Community 5 - "Package Metadata & Core Deps"
Cohesion: 0.07
Nodes (29): allowScripts, core-js@3.50.0, @parcel/watcher@2.6.0, engines, node, license, name, packageManager (+21 more)

### Community 6 - "Debug & Player Info State"
Cohesion: 0.13
Nodes (26): setFriendsSize(), checkDebug(), removeDebug(), setMyInfo(), setPlayerName(), toggleDebug(), clearArmyUnits(), getBonuses() (+18 more)

### Community 7 - "Legal, Security & Endpoint Docs"
Cohesion: 0.10
Nodes (28): LICENSE.md (GNU AGPL v3), browser.storage.local Storage API, Discord Webhook Endpoint, FoE Info README, Forge of Empires Game Endpoints, Google/Googleusercontent Endpoints, InnoGames Metadata Endpoint, FoE Info Security Policy (+20 more)

### Community 8 - "Webpack Build Config"
Cohesion: 0.08
Nodes (23): CopyPlugin, HtmlWebpackPlugin, path, webpack, baseManifest, common, { merge }, path (+15 more)

### Community 9 - "Great Buildings Donation Service"
Cohesion: 0.21
Nodes (19): checkInactive(), clickDonation(), contributeForgePoints(), fCheckOutput(), fDonationSuggest(), fPercentBanded(), gbTabEmpty(), gbTabNotSafe() (+11 more)

### Community 10 - "Audit: Build & Correctness Issues"
Cohesion: 0.12
Nodes (17): Inconsistent Dependency Pinning, No Source Maps in Production Build, options.html Accessibility/Heading Hierarchy Gap, Pervasive var Usage and Unhandled Promise Rejections, pendingStartupMsg Not Flushed on Success Path, showOptions.set() Stale Named Exports Bug, Wrong Goods Key Copy-Paste Bug (Goods.sajm), WebSocket-Expert Skip Rationale (False Positive Match) (+9 more)

### Community 11 - "Clipboard Copy Logic"
Cohesion: 0.17
Nodes (9): addToClipboard(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonorCopy(), DonorCopy2(), fallbackCopy(), fClipboardCopy() (+1 more)

### Community 12 - "Third-Party Runtime Libraries"
Cohesion: 0.13
Nodes (15): bignumber.js, bootstrap, dayjs, jquery, dependencies, bignumber.js, bootstrap, dayjs (+7 more)

### Community 13 - "Audit: Undeclared Var & XSS Bugs"
Cohesion: 0.18
Nodes (12): forEach Return Discarded (inactiveHTML), Undeclared Variable ReferenceError (Space Age Landmarks), setMyGuildPermissions Undeclared Variable Bug, Latent XSS via Unescaped Player/Guild Names, Audit Priority Order, inactiveHTML() (GreatBuildingsService.js), MyGuildPermissions (helper.js), Unescaped name render path (helper.js) (+4 more)

### Community 14 - "Discord/SS Post Reporting"
Cohesion: 0.22
Nodes (4): Undefined getKey() Call in postToDiscord, getKey() commented-out version (helper.js), postAlerttoDsicord(), postToDiscord()

### Community 15 - "MCP Tooling Config"
Cohesion: 0.33
Nodes (6): graphify-mcp, npx, aas, chrome-devtools, graphify, aas-mcp

### Community 16 - "Extension Options Page"
Cohesion: 0.53
Nodes (5): fnShowOptions(), restore_options(), save_options(), setStorage(), showOptions

### Community 17 - "Audit: Assignment-in-Condition Bugs"
Cohesion: 0.40
Nodes (5): Assignment-in-Condition Bug (clan_goods), darkMode Assignment Instead of Comparison, darkMode state check (src/js/index.js), clan_goods assignment-in-condition (src/js/msg/OtherPlayerService.js), clan_goods assignment-in-condition (StartupService.js)

### Community 18 - "Audit: Duplicated If/Else Chains"
Cohesion: 0.50
Nodes (4): Duplicated If/Else Chains Needing Lookup Tables, Duplicated if/else chain (ConversationService.js), showGreatBuldingDonation() (GreatBuildingsService.js), Duplicated if/else chain (GuildBattlegroundService.js)

### Community 19 - "Audit: HTML Template Gaps"
Cohesion: 0.50
Nodes (4): Missing body Element in HTML Templates, Google Fonts Loaded at Runtime from panel.html, devtools.html, panel.html

### Community 20 - "Audit: webRequest No-Op Bug"
Cohesion: 0.50
Nodes (4): webRequest onBeforeSendHeaders No-Op Bug, minimum_chrome_version Inconsistent with webRequest Restriction, minimum_chrome_version (manifest.json), chrome.webRequest.onBeforeSendHeaders handler (src/js/index.js)

### Community 21 - "Audit: Hardcoded SCSS Colors"
Cohesion: 0.67
Nodes (3): Hardcoded Colors Bypassing SCSS Variables, Commented-out dead CSS block (src/css/custom.scss), _variables.scss design tokens

### Community 22 - "Audit: Invalid CSS Values"
Cohesion: 0.67
Nodes (3): Invalid CSS Properties/Values (fw: bold, float: center), float: center invalid value (src/css/custom.scss), fw: bold invalid property (src/css/custom.scss)

### Community 23 - "Audit: Manifest Build-Time Fields"
Cohesion: 0.67
Nodes (3): WebpackExtensionManifestPlugin, Empty manifest name/version Filled at Build Time (Intentional), empty name/version fields (manifest.json)

### Community 24 - "Audit: Unused Manifest Permissions"
Cohesion: 0.67
Nodes (3): Unused Permission Surface (web_accessible_resources / externally_connectable), externally_connectable (manifest.json), web_accessible_resources (manifest.json)

### Community 25 - "Extension Branding"
Cohesion: 0.67
Nodes (3): FoE-Info-Extension Branding, Forge of Empires (Game), Forge of Empires Logo

### Community 26 - "Webpack Entry Architecture"
Cohesion: 0.67
Nodes (3): Webpack Entry Points Architecture, src/js/fn/ (shared DOM/storage/formatting/request helpers), src/js/vars/ (feature state and defaults)

## Ambiguous Edges - Review These
- `Assignment-in-Condition Bug (clan_goods)` → `clan_goods assignment-in-condition (StartupService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `forEach Return Discarded (inactiveHTML)` → `inactiveHTML() (GreatBuildingsService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Missing Null Checks on .find() Results` → `.find() results without null checks (GuildBattlegroundService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Undefined getKey() Call in postToDiscord` → `getKey() commented-out version (helper.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `setMyGuildPermissions Undeclared Variable Bug` → `MyGuildPermissions (helper.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Latent XSS via Unescaped Player/Guild Names` → `Unescaped name render path (helper.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Duplicated If/Else Chains Needing Lookup Tables` → `Duplicated if/else chain (ConversationService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Duplicated If/Else Chains Needing Lookup Tables` → `showGreatBuldingDonation() (GreatBuildingsService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references
- `Duplicated If/Else Chains Needing Lookup Tables` → `Duplicated if/else chain (GuildBattlegroundService.js)`  [AMBIGUOUS]
  AUDIT.md · relation: references

## Knowledge Gaps
- **168 isolated node(s):** `graphify-mcp`, `aas-mcp`, `name`, `version`, `@popperjs/core` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Assignment-in-Condition Bug (clan_goods)` and `clan_goods assignment-in-condition (StartupService.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `forEach Return Discarded (inactiveHTML)` and `inactiveHTML() (GreatBuildingsService.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Missing Null Checks on .find() Results` and `.find() results without null checks (GuildBattlegroundService.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Undefined getKey() Call in postToDiscord` and `getKey() commented-out version (helper.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `setMyGuildPermissions Undeclared Variable Bug` and `MyGuildPermissions (helper.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Latent XSS via Unescaped Player/Guild Names` and `Unescaped name render path (helper.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Duplicated If/Else Chains Needing Lookup Tables` and `Duplicated if/else chain (ConversationService.js)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._