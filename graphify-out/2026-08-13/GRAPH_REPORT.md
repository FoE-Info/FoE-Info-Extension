# Graph Report - .  (2026-08-13)

## Corpus Check
- Corpus is ~41,821 words - fits in a single context window. You may not need a graph.

## Summary
- 452 nodes · 745 edges · 28 communities (21 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.64)
- Token cost: 166,941 input · 0 output

## Community Hubs (Navigation)
- Request Dispatch & State Clearers
- Manifest & Permissions Config
- Webpack Dev Dependencies
- Documentation & Options Settings
- DOM Elements, Storage & Battle/Resource Services
- Panel Section Collapse Toggles
- Package Metadata & Scripts
- Debug & Startup/Army Services
- Webpack Build Configs
- Great Buildings Donation Service
- Discord Posting & Storage Sync
- Formatting & Age/Level Helpers
- Clipboard Copy Helpers
- Runtime Dependencies
- MCP Server Configuration
- Options Page Load/Save Logic
- Graphify Knowledge Graph Workflow
- Project Branding & Game Concept
- Webpack Entry Point Modules
- Extension Overview & Security Boundaries
- Vulnerability Reporting
- Tools Icon (Bootstrap Icons)
- Extension Icon Branding
- App Constants
- AI Commit Attribution Policy
- npm Package Manager Policy

## God Nodes (most connected - your core abstractions)
1. `handleRequestFinished()` - 47 edges
2. `Options Page (options.html)` - 16 edges
3. `scripts` - 15 edges
4. `showGreatBuldingDonation()` - 15 edges
5. `startupService()` - 14 edges
6. `FoE Info README` - 11 edges
7. `checkDebug()` - 10 edges
8. `otherPlayerService()` - 9 edges
9. `setCurrentPercent()` - 8 edges
10. `checkProvinces()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Knowledge Graph Workflow` --semantically_similar_to--> `Repository Tooling (Graphify npm scripts)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `FoE Info Extension` --conceptually_related_to--> `Security Boundaries (Extension Data Handling)`  [INFERRED]
  README.md → SECURITY.md
- `.agents/instructions/chrome.md` --references--> `DevTools Page (devtools.html)`  [EXTRACTED]
  CLAUDE.md → src/chrome/devtools.html
- `DevTools Page (devtools.html)` --references--> `src/js/devtools.js`  [INFERRED]
  src/chrome/devtools.html → README.md
- `Options Page (options.html)` --references--> `src/js/options.js`  [INFERRED]
  src/chrome/options.html → README.md

## Import Cycles
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ResourceService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/BonusService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/CityProductionService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildBattlegroundService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/collapse.js`

## Hyperedges (group relationships)
- **Options Page Feature Groups** — src_chrome_options_doc, src_chrome_options_city_info, src_chrome_options_gb_info, src_chrome_options_gvg, src_chrome_options_guild_battlegrounds, src_chrome_options_guild_expedition, src_chrome_options_other_info, src_chrome_options_player_lists, src_chrome_options_guild_admin, src_chrome_options_discord_sheets, src_chrome_options_language [EXTRACTED 1.00]
- **Webpack Entry Point Architecture (HTML + JS Pairs)** — src_chrome_devtools_doc, src_chrome_panel_doc, src_chrome_options_doc, src_chrome_popup_doc, src_js_devtools_module, src_js_index_module, src_js_options_module, src_js_popup_module [INFERRED 0.85]
- **Extension Data Handling and Security Boundary** — readme_doc, security_doc, readme_discord_webhook_endpoint, readme_google_endpoints, readme_browser_storage_local [INFERRED 0.80]

## Communities (28 total, 7 thin omitted)

### Community 0 - "Request Dispatch & State Clearers"
Cohesion: 0.07
Nodes (42): setBuildingCostSize(), setFriendsSize(), setRewardSize(), clearCultural(), clearExpedition(), clearForBattleground(), clearForMainCity(), clearStartup() (+34 more)

### Community 1 - "Manifest & Permissions Config"
Cohesion: 0.05
Nodes (37): clipboardWrite, https://discord.com/api/webhooks/*, https://discordapp.com/api/webhooks/*, https://*.forgeofempires.com/game/*, https://*.google.com/*, https://*.googleusercontent.com/, https://*.innogamescdn.com/*, storage (+29 more)

### Community 2 - "Webpack Dev Dependencies"
Cohesion: 0.05
Nodes (37): copy-webpack-plugin, cross-env, css-loader, html-webpack-plugin, @ianvs/prettier-plugin-sort-imports, mini-css-extract-plugin, devDependencies, copy-webpack-plugin (+29 more)

### Community 3 - "Documentation & Options Settings"
Cohesion: 0.07
Nodes (36): .agents/instructions/chrome.md, .agents/instructions/css.md, .agents/instructions/javascript.md, .agents/instructions/source.md, Agent Instructions (CLAUDE.md), Modular Instructions Table, docs/INDEX.md, LICENSE.md (GNU AGPL v3) (+28 more)

### Community 4 - "DOM Elements, Storage & Battle/Resource Services"
Cohesion: 0.09
Nodes (20): fAddCollapseIcon(), fCollapseIcon(), setExpeditionSize(), setGoodsSize(), setGVGSize(), setTreasurySize(), fGVGagesname(), buildGvgInnerDiv() (+12 more)

### Community 5 - "Panel Section Collapse Toggles"
Cohesion: 0.06
Nodes (3): fCollapseIncidents(), fCollapseStats(), fHideAllTooltips()

### Community 6 - "Package Metadata & Scripts"
Cohesion: 0.07
Nodes (29): allowScripts, core-js@3.50.0, @parcel/watcher@2.6.0, engines, node, license, name, packageManager (+21 more)

### Community 7 - "Debug & Startup/Army Services"
Cohesion: 0.13
Nodes (24): setArmySize(), checkDebug(), removeDebug(), setMyInfo(), showReward(), toggleDebug(), armyUnitManagementService(), clearArmyUnits() (+16 more)

### Community 8 - "Webpack Build Configs"
Cohesion: 0.08
Nodes (23): CopyPlugin, HtmlWebpackPlugin, path, webpack, baseManifest, common, { merge }, path (+15 more)

### Community 9 - "Great Buildings Donation Service"
Cohesion: 0.21
Nodes (19): checkInactive(), clickDonation(), contributeForgePoints(), fCheckOutput(), fDonationSuggest(), fPercentBanded(), gbTabEmpty(), gbTabNotSafe() (+11 more)

### Community 10 - "Discord Posting & Storage Sync"
Cohesion: 0.15
Nodes (12): set(), setToolOptions(), postAlerttoDsicord(), postToDiscord(), receiveStorage(), storageChange(), conversationService(), getConversation() (+4 more)

### Community 11 - "Formatting & Age/Level Helpers"
Cohesion: 0.13
Nodes (8): setBattlegroundSize(), fHideTooltips(), fIncidentName(), fshowBattleground(), fshowBattlegroundChanges(), fShowIncidents(), numAges, setHeight()

### Community 12 - "Clipboard Copy Helpers"
Cohesion: 0.17
Nodes (9): addToClipboard(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonorCopy(), DonorCopy2(), fallbackCopy(), fClipboardCopy() (+1 more)

### Community 13 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): bignumber.js, bootstrap, dayjs, jquery, dependencies, bignumber.js, bootstrap, dayjs (+7 more)

### Community 14 - "MCP Server Configuration"
Cohesion: 0.29
Nodes (6): graphify-mcp, npx, /var/home/linuxbrew/.linuxbrew/Cellar/node/26.7.0/bin/node, aas, chrome-devtools, graphify

### Community 15 - "Options Page Load/Save Logic"
Cohesion: 0.53
Nodes (5): fnShowOptions(), restore_options(), save_options(), setStorage(), showOptions

### Community 16 - "Graphify Knowledge Graph Workflow"
Cohesion: 0.50
Nodes (4): Graphify Knowledge Graph Workflow, graphify-out/GRAPH_REPORT.md, graphify-out/wiki/index.md, Repository Tooling (Graphify npm scripts)

### Community 17 - "Project Branding & Game Concept"
Cohesion: 0.67
Nodes (3): FoE-Info-Extension Branding, Forge of Empires (Game), Forge of Empires Logo

### Community 18 - "Webpack Entry Point Modules"
Cohesion: 0.67
Nodes (3): Webpack Entry Points Architecture, src/js/fn/ (shared DOM/storage/formatting/request helpers), src/js/vars/ (feature state and defaults)

## Knowledge Gaps
- **139 isolated node(s):** `graphify-mcp`, `/var/home/linuxbrew/.linuxbrew/Cellar/node/26.7.0/bin/node`, `npx`, `name`, `version` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Webpack Dev Dependencies` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleRequestFinished()` (e.g. with `index.js` and `processMetadataEntry()`) actually correct?**
  _`handleRequestFinished()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify-mcp`, `/var/home/linuxbrew/.linuxbrew/Cellar/node/26.7.0/bin/node`, `npx` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Request Dispatch & State Clearers` be split into smaller, more focused modules?**
  _Cohesion score 0.06715063520871144 - nodes in this community are weakly interconnected._
- **Should `Manifest & Permissions Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Webpack Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._