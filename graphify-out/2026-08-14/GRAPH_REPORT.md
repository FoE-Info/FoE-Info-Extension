# Graph Report - FoE-Info-Extension  (2026-08-14)

## Corpus Check
- 48 files · ~43,754 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 490 nodes · 783 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `346f4132`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Toolbar & Panel State Setters
- AddElement.js
- manifest.json
- devDependencies
- collapse.js
- scripts
- StartupService.js
- Legal, Security & Endpoint Docs
- webpack.prod.js
- GreatBuildingsService.js
- Confirmed findings
- Clipboard Copy Logic
- Third-Party Runtime Libraries
- Confirmed findings
- helper.js
- .mcp.json
- options.js
- Forge of Empires Logo
- Webpack Entry Points Architecture
- FoE Info Extension
- Public GitHub Issue Tracker
- Bootstrap Icons "bi-tools" glyph
- FoE Info Extension Icon (128x128)
- constants.js
- Repository Tooling (Graphify npm scripts)

## God Nodes (most connected - your core abstractions)
1. `handleRequestFinished()` - 47 edges
2. `scripts` - 15 edges
3. `showGreatBuldingDonation()` - 15 edges
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
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/CityProductionService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ClanBattleService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/helper.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/helper.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/OtherPlayerService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/StartupService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ArmyUnitManagementService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ResourceService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GuildExpeditionService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/collapse.js`
- 3-file cycle: `src/js/fn/post.js -> src/js/index.js -> src/js/msg/ConversationService.js -> src/js/fn/post.js`
- 3-file cycle: `src/js/fn/copy.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/copy.js`
- 3-file cycle: `src/js/fn/collapse.js -> src/js/index.js -> src/js/msg/GreatBuildingsService.js -> src/js/fn/collapse.js`

## Hyperedges (group relationships)
- **Options Page Feature Groups** — src_chrome_options_doc, src_chrome_options_city_info, src_chrome_options_gb_info, src_chrome_options_gvg, src_chrome_options_guild_battlegrounds, src_chrome_options_guild_expedition, src_chrome_options_other_info, src_chrome_options_player_lists, src_chrome_options_guild_admin, src_chrome_options_discord_sheets, src_chrome_options_language [EXTRACTED 1.00]
- **Extension Data Handling and Security Boundary** — readme_doc, security_doc, readme_discord_webhook_endpoint, readme_google_endpoints, readme_browser_storage_local [INFERRED 0.80]
- **Webpack Entry Point Architecture (HTML + JS Pairs)** — src_chrome_devtools_doc, src_chrome_panel_doc, src_chrome_options_doc, src_chrome_popup_doc, src_js_devtools_module, src_js_index_module, src_js_options_module, src_js_popup_module [INFERRED 0.85]

## Communities (27 total, 6 thin omitted)

### Community 0 - "Toolbar & Panel State Setters"
Cohesion: 0.07
Nodes (45): set(), setBuildingCostSize(), setRewardSize(), setToolOptions(), clearCultural(), clearExpedition(), clearForBattleground(), clearForMainCity() (+37 more)

### Community 1 - "AddElement.js"
Cohesion: 0.09
Nodes (20): fAddCollapseIcon(), fCollapseIcon(), setExpeditionSize(), setGoodsSize(), setGVGSize(), setTreasurySize(), fGVGagesname(), buildGvgInnerDiv() (+12 more)

### Community 2 - "manifest.json"
Cohesion: 0.05
Nodes (37): clipboardWrite, https://discord.com/api/webhooks/*, https://discordapp.com/api/webhooks/*, https://*.forgeofempires.com/game/*, https://*.google.com/*, https://*.googleusercontent.com/, https://*.innogamescdn.com/*, storage (+29 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (37): copy-webpack-plugin, cross-env, css-loader, html-webpack-plugin, @ianvs/prettier-plugin-sort-imports, mini-css-extract-plugin, devDependencies, copy-webpack-plugin (+29 more)

### Community 4 - "collapse.js"
Cohesion: 0.06
Nodes (3): fCollapseIncidents(), fCollapseStats(), fHideAllTooltips()

### Community 5 - "scripts"
Cohesion: 0.07
Nodes (29): allowScripts, core-js@3.50.0, @parcel/watcher@2.6.0, engines, node, license, name, packageManager (+21 more)

### Community 6 - "StartupService.js"
Cohesion: 0.11
Nodes (31): setArmySize(), setFriendsSize(), checkDebug(), removeDebug(), setMyInfo(), setPlayerName(), showReward(), toggleDebug() (+23 more)

### Community 7 - "Legal, Security & Endpoint Docs"
Cohesion: 0.10
Nodes (28): LICENSE.md (GNU AGPL v3), browser.storage.local Storage API, Discord Webhook Endpoint, FoE Info README, Forge of Empires Game Endpoints, Google/Googleusercontent Endpoints, InnoGames Metadata Endpoint, FoE Info Security Policy (+20 more)

### Community 8 - "webpack.prod.js"
Cohesion: 0.08
Nodes (23): CopyPlugin, HtmlWebpackPlugin, path, webpack, baseManifest, common, { merge }, path (+15 more)

### Community 9 - "GreatBuildingsService.js"
Cohesion: 0.21
Nodes (19): checkInactive(), clickDonation(), contributeForgePoints(), fCheckOutput(), fDonationSuggest(), fPercentBanded(), gbTabEmpty(), gbTabNotSafe() (+11 more)

### Community 10 - "Confirmed findings"
Cohesion: 0.05
Nodes (36): Architecture, Chrome DevTools Panel Audit, Confirmed findings, Gaps in this pass, P1: No `<body>` element (see also CSS/HTML audit), P1: Panel loads Google Fonts over the network at runtime, Chrome Extension MV3 Audit, Confirmed findings (+28 more)

### Community 11 - "Clipboard Copy Logic"
Cohesion: 0.17
Nodes (9): addToClipboard(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonorCopy(), DonorCopy2(), fallbackCopy(), fClipboardCopy() (+1 more)

### Community 12 - "Third-Party Runtime Libraries"
Cohesion: 0.13
Nodes (15): bignumber.js, bootstrap, dayjs, jquery, dependencies, bignumber.js, bootstrap, dayjs (+7 more)

### Community 13 - "Confirmed findings"
Cohesion: 0.20
Nodes (9): Confirmed findings, JavaScript & jQuery Audit, P0: `fn/storage.js` never returns its promises, P0: Unescaped server-controlled strings reach `innerHTML`, P1: Assignment-vs-comparison bugs, P1: `ReferenceError` on undeclared variables, P1: Silent data bugs, P2: Anti-patterns (+1 more)

### Community 14 - "helper.js"
Cohesion: 0.09
Nodes (10): setBattlegroundSize(), fHideTooltips(), fIncidentName(), fshowBattleground(), fshowBattlegroundChanges(), fShowIncidents(), numAges, setHeight() (+2 more)

### Community 15 - ".mcp.json"
Cohesion: 0.33
Nodes (6): graphify-mcp, npx, aas, chrome-devtools, graphify, aas-mcp

### Community 16 - "options.js"
Cohesion: 0.53
Nodes (5): fnShowOptions(), restore_options(), save_options(), setStorage(), showOptions

### Community 25 - "Forge of Empires Logo"
Cohesion: 0.67
Nodes (3): FoE-Info-Extension Branding, Forge of Empires (Game), Forge of Empires Logo

### Community 26 - "Webpack Entry Points Architecture"
Cohesion: 0.67
Nodes (3): Webpack Entry Points Architecture, src/js/fn/ (shared DOM/storage/formatting/request helpers), src/js/vars/ (feature state and defaults)

## Knowledge Gaps
- **165 isolated node(s):** `P1: Panel loads Google Fonts over the network at runtime`, `P1: No `<body>` element (see also CSS/HTML audit)`, `Architecture`, `Gaps in this pass`, `P0: `webRequest.onBeforeSendHeaders` is a silent no-op` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Third-Party Runtime Libraries` to `scripts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleRequestFinished()` (e.g. with `index.js` and `processMetadataEntry()`) actually correct?**
  _`handleRequestFinished()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `P1: Panel loads Google Fonts over the network at runtime`, `P1: No `<body>` element (see also CSS/HTML audit)`, `Architecture` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Toolbar & Panel State Setters` be split into smaller, more focused modules?**
  _Cohesion score 0.06612021857923497 - nodes in this community are weakly interconnected._
- **Should `AddElement.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._