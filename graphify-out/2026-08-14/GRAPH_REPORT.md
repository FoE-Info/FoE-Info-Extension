# Graph Report - .  (2026-08-14)

## Corpus Check
- 10 files · ~41,503 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 438 nodes · 730 edges · 25 communities (19 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Index.js Core UI Logic
- AddElement / UI Builders
- Dev Dependencies (Build Tooling)
- External References & Permissions
- Debug & Player Info Handlers
- Collapse Toggle Functions
- Package Metadata & Scripts
- Documentation (README/SECURITY)
- Helper Utility Functions
- Webpack Build Configuration
- Great Buildings Service
- Clipboard Copy Functions
- Runtime Dependencies
- .mcp.json / MCP Servers
- Options Page Logic
- FoE Info Extension Branding
- Module Architecture (README)
- Extension Overview & Security
- Security Reporting Policy
- Bootstrap Tools Icon
- Extension Icon (128x128)
- Constants (Salt)
- Repository Tooling (README)

## God Nodes (most connected - your core abstractions)
1. `handleRequestFinished()` - 47 edges
2. `showGreatBuldingDonation()` - 15 edges
3. `scripts` - 15 edges
4. `Options Page (options.html)` - 15 edges
5. `startupService()` - 14 edges
6. `checkDebug()` - 10 edges
7. `FoE Info README` - 10 edges
8. `otherPlayerService()` - 9 edges
9. `setCurrentPercent()` - 8 edges
10. `checkProvinces()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `FoE Info Extension` --conceptually_related_to--> `Security Boundaries (Extension Data Handling)`  [INFERRED]
  README.md → SECURITY.md
- `DevTools Page (devtools.html)` --references--> `src/js/devtools.js`  [INFERRED]
  src/chrome/devtools.html → README.md
- `Options Page (options.html)` --references--> `src/js/options.js`  [INFERRED]
  src/chrome/options.html → README.md
- `DevTools Panel Page (panel.html)` --references--> `src/js/index.js`  [INFERRED]
  src/chrome/panel.html → README.md
- `src/js/devtools.js` --references--> `DevTools Panel Page (panel.html)`  [INFERRED]
  README.md → src/chrome/panel.html

## Import Cycles
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/CityProductionService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/BonusService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/collapse.js`

## Hyperedges (group relationships)
- **Options Page Feature Groups** — src_chrome_options_doc, src_chrome_options_city_info, src_chrome_options_gb_info, src_chrome_options_gvg, src_chrome_options_guild_battlegrounds, src_chrome_options_guild_expedition, src_chrome_options_other_info, src_chrome_options_player_lists, src_chrome_options_guild_admin, src_chrome_options_discord_sheets, src_chrome_options_language [EXTRACTED 1.00]
- **Extension Data Handling and Security Boundary** — readme_doc, security_doc, readme_discord_webhook_endpoint, readme_google_endpoints, readme_browser_storage_local [INFERRED 0.80]
- **Webpack Entry Point Architecture (HTML + JS Pairs)** — src_chrome_devtools_doc, src_chrome_panel_doc, src_chrome_options_doc, src_chrome_popup_doc, src_js_devtools_module, src_js_index_module, src_js_options_module, src_js_popup_module [INFERRED 0.85]

## Communities (25 total, 6 thin omitted)

### Community 0 - "Index.js Core UI Logic"
Cohesion: 0.07
Nodes (45): set(), setBuildingCostSize(), setRewardSize(), setToolOptions(), clearCultural(), clearExpedition(), clearForBattleground(), clearForMainCity() (+37 more)

### Community 1 - "AddElement / UI Builders"
Cohesion: 0.08
Nodes (22): fAddCollapseIcon(), fCollapseIcon(), setArmySize(), setExpeditionSize(), setGoodsSize(), setGVGSize(), setTreasurySize(), fGVGagesname() (+14 more)

### Community 2 - "Dev Dependencies (Build Tooling)"
Cohesion: 0.05
Nodes (37): copy-webpack-plugin, cross-env, css-loader, html-webpack-plugin, @ianvs/prettier-plugin-sort-imports, mini-css-extract-plugin, devDependencies, copy-webpack-plugin (+29 more)

### Community 3 - "External References & Permissions"
Cohesion: 0.06
Nodes (36): clipboardWrite, https://discord.com/api/webhooks/*, https://*.forgeofempires.com/game/*, https://*.google.com/*, https://*.googleusercontent.com/, https://*.innogamescdn.com/*, storage, unlimitedStorage (+28 more)

### Community 4 - "Debug & Player Info Handlers"
Cohesion: 0.11
Nodes (29): setFriendsSize(), checkDebug(), removeDebug(), setMyInfo(), setPlayerName(), showReward(), toggleDebug(), clearArmyUnits() (+21 more)

### Community 5 - "Collapse Toggle Functions"
Cohesion: 0.06
Nodes (3): fCollapseIncidents(), fCollapseStats(), fHideAllTooltips()

### Community 6 - "Package Metadata & Scripts"
Cohesion: 0.07
Nodes (29): allowScripts, core-js@3.50.0, @parcel/watcher@2.6.0, engines, node, license, name, packageManager (+21 more)

### Community 7 - "Documentation (README/SECURITY)"
Cohesion: 0.10
Nodes (28): LICENSE.md (GNU AGPL v3), browser.storage.local Storage API, Discord Webhook Endpoint, FoE Info README, Forge of Empires Game Endpoints, Google/Googleusercontent Endpoints, InnoGames Metadata Endpoint, FoE Info Security Policy (+20 more)

### Community 8 - "Helper Utility Functions"
Cohesion: 0.09
Nodes (10): setBattlegroundSize(), fHideTooltips(), fIncidentName(), fshowBattleground(), fshowBattlegroundChanges(), fShowIncidents(), numAges, setHeight() (+2 more)

### Community 9 - "Webpack Build Configuration"
Cohesion: 0.08
Nodes (23): CopyPlugin, HtmlWebpackPlugin, path, webpack, baseManifest, common, { merge }, path (+15 more)

### Community 10 - "Great Buildings Service"
Cohesion: 0.21
Nodes (19): checkInactive(), clickDonation(), contributeForgePoints(), fCheckOutput(), fDonationSuggest(), fPercentBanded(), gbTabEmpty(), gbTabNotSafe() (+11 more)

### Community 11 - "Clipboard Copy Functions"
Cohesion: 0.17
Nodes (9): addToClipboard(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonorCopy(), DonorCopy2(), fallbackCopy(), fClipboardCopy() (+1 more)

### Community 12 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): bignumber.js, bootstrap, dayjs, jquery, dependencies, bignumber.js, bootstrap, dayjs (+7 more)

### Community 13 - ".mcp.json / MCP Servers"
Cohesion: 0.29
Nodes (6): graphify-mcp, npx, /var/home/linuxbrew/.linuxbrew/Cellar/node/26.7.0/bin/node, aas, chrome-devtools, graphify

### Community 14 - "Options Page Logic"
Cohesion: 0.53
Nodes (5): fnShowOptions(), restore_options(), save_options(), setStorage(), showOptions

### Community 15 - "FoE Info Extension Branding"
Cohesion: 0.67
Nodes (3): FoE-Info-Extension Branding, Forge of Empires (Game), Forge of Empires Logo

### Community 16 - "Module Architecture (README)"
Cohesion: 0.67
Nodes (3): Webpack Entry Points Architecture, src/js/fn/ (shared DOM/storage/formatting/request helpers), src/js/vars/ (feature state and defaults)

## Knowledge Gaps
- **132 isolated node(s):** `contentTypes`, `requestingCheck`, `default_popup`, `extension_pages`, `description` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies (Build Tooling)` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleRequestFinished()` (e.g. with `index.js` and `processMetadataEntry()`) actually correct?**
  _`handleRequestFinished()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `contentTypes`, `requestingCheck`, `default_popup` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Index.js Core UI Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.06612021857923497 - nodes in this community are weakly interconnected._
- **Should `AddElement / UI Builders` be split into smaller, more focused modules?**
  _Cohesion score 0.08367071524966262 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies (Build Tooling)` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._