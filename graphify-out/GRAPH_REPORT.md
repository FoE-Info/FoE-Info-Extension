# Graph Report - FoE-Info-Extension  (2026-08-14)

## Corpus Check
- 47 files · ~52,488 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 510 nodes · 802 edges · 32 communities (26 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `783beee1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
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
- audit-summary.md
- helper.js
- .mcp.json
- options.js
- Confirmed findings
- Confirmed findings
- Confirmed findings
- Audit Summary
- DevTools Panel Audit
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
2. `Confirmed findings` - 16 edges
3. `showGreatBuldingDonation()` - 15 edges
4. `scripts` - 15 edges
5. `Options Page (options.html)` - 15 edges
6. `startupService()` - 14 edges
7. `Confirmed findings` - 13 edges
8. `checkDebug()` - 10 edges
9. `FoE Info README` - 10 edges
10. `Confirmed findings` - 9 edges

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

## Communities (32 total, 6 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.06
Nodes (48): set(), setBuildingCostSize(), setRewardSize(), setToolOptions(), clearCultural(), clearExpedition(), clearForBattleground(), clearForMainCity() (+40 more)

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
Cohesion: 0.12
Nodes (28): setArmySize(), setFriendsSize(), checkDebug(), setMyInfo(), setPlayerName(), showReward(), armyUnitManagementService(), clearArmyUnits() (+20 more)

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
Cohesion: 0.17
Nodes (11): Confirmed findings, Node.js & Webpack Audit, P1: `npm run check` (the only automated gate) currently fails on files outside the source tree, P1: `postcss-loader` runs in both dev and prod CSS pipelines with no PostCSS config anywhere in the repo, P1: The single static `vendors` cache group forces the entire jQuery/Bootstrap/i18n bundle onto `devtools.html` and `popup.html`, which don't use any of it, P2: `allowScripts` field in package.json has no effect, P2: No `.nvmrc`/`.npmrc` to enforce the `engines.node` pin, P2: `setup` script hard-fails on missing `uv`/`uvx`, with the failure surfacing after `npm install` already succeeded (+3 more)

### Community 11 - "Clipboard Copy Logic"
Cohesion: 0.17
Nodes (9): addToClipboard(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonorCopy(), DonorCopy2(), fallbackCopy(), fClipboardCopy() (+1 more)

### Community 12 - "Third-Party Runtime Libraries"
Cohesion: 0.13
Nodes (15): bignumber.js, bootstrap, dayjs, jquery, dependencies, bignumber.js, bootstrap, dayjs (+7 more)

### Community 13 - "audit-summary.md"
Cohesion: 0.25
Nodes (5): CSS & HTML Audit, What's solid, JavaScript & jQuery Audit, Running priority total (all 3 passes — final), What's solid

### Community 14 - "helper.js"
Cohesion: 0.09
Nodes (10): setBattlegroundSize(), fHideTooltips(), fIncidentName(), fshowBattleground(), fshowBattlegroundChanges(), fShowIncidents(), numAges, setHeight() (+2 more)

### Community 15 - ".mcp.json"
Cohesion: 0.33
Nodes (6): graphify-mcp, npx, aas, chrome-devtools, graphify, aas-mcp

### Community 16 - "options.js"
Cohesion: 0.53
Nodes (5): fnShowOptions(), restore_options(), save_options(), setStorage(), showOptions

### Community 17 - "Confirmed findings"
Cohesion: 0.12
Nodes (16): Confirmed findings, P0 (confirmed instance of documented repo-wide gotcha): unescaped `innerHTML` interpolation of player/guild-controlled strings, P0: `fn/post.js`'s `postToDiscord()` calls an undefined `getKey()` — throws immediately, before ever sending a request, P0: `fn/storage.js`'s `getStorage()` never returns its promise — the one real caller that depends on the return value is permanently broken, P0: `msg/GuildBattlegroundService.js:115` references an undeclared `output` — `getLeaderboard()` throws every time it's called, GBG Leaderboard never renders, P0: Saving Options silently deletes the `clipboard` setting from storage, permanently disabling the clipboard feature, P0: Two independent default-value sources for `showOptions` disagree on 3 keys, P1: Assignment-instead-of-comparison bug live in three `msg/*.js` clan-goods branches (confirms `src/js/CLAUDE.md:23`) (+8 more)

### Community 18 - "Confirmed findings"
Cohesion: 0.15
Nodes (13): Confirmed findings, P0: Debug rainbow colors override a live, currently-rendered icon, P1: Hardcoded colors bypass design tokens, P1: Invalid CSS silently dropped, breaking the intended styling, P1: `panel.html`'s own inline `<style>` block repeats the `fw: bold;` bug independently of custom.scss, P1: `popup.html`'s clickable options icon has no accessible name and isn't keyboard-operable, P1: Static HTML templates have zero `data-i18n` coverage — `src/CLAUDE.md:16`'s "match panel.html/popup.html" guidance points at nothing in those files, P1: Undefined custom properties silently fall back to `transparent`/inherited (+5 more)

### Community 19 - "Confirmed findings"
Cohesion: 0.25
Nodes (7): Confirmed findings, Extension / MV3 Audit, P1: `google.com`/`googleusercontent.com` host_permissions have zero active call sites, P1: `webRequest.onBeforeSendHeaders` listener is a silent no-op, P2: `CLAUDE.md`'s "content-script traffic controller" description doesn't match how `index.js` actually runs, P2: `externally_connectable` and `web_accessible_resources` expose surface nothing consumes, What's solid

### Community 20 - "Audit Summary"
Cohesion: 0.25
Nodes (8): Audit matrix, Audit Summary, Outcome, P0 — breaks something now, P1 — real correctness or process gap, P2 — cleanup / polish, Prioritized remediation roadmap, Re-running this audit

### Community 21 - "DevTools Panel Audit"
Cohesion: 0.33
Nodes (5): Confirmed findings, DevTools Panel Audit, P1: `panel.html` makes two external network requests on every panel open, breaking offline use and leaking to Google, What's solid, Worth investigating (not a confirmed bug — flagging with evidence, not fabricating a performance number)

### Community 25 - "Forge of Empires Logo"
Cohesion: 0.67
Nodes (3): FoE-Info-Extension Branding, Forge of Empires (Game), Forge of Empires Logo

### Community 26 - "Webpack Entry Points Architecture"
Cohesion: 0.67
Nodes (3): Webpack Entry Points Architecture, src/js/fn/ (shared DOM/storage/formatting/request helpers), src/js/vars/ (feature state and defaults)

## Knowledge Gaps
- **185 isolated node(s):** `P1: `panel.html` makes two external network requests on every panel open, breaking offline use and leaking to Google`, `What's solid`, `Worth investigating (not a confirmed bug — flagging with evidence, not fabricating a performance number)`, `P1: `webRequest.onBeforeSendHeaders` listener is a silent no-op`, `P1: `google.com`/`googleusercontent.com` host_permissions have zero active call sites` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Third-Party Runtime Libraries` to `scripts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `handleRequestFinished()` (e.g. with `index.js` and `processMetadataEntry()`) actually correct?**
  _`handleRequestFinished()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `P1: `panel.html` makes two external network requests on every panel open, breaking offline use and leaking to Google`, `What's solid`, `Worth investigating (not a confirmed bug — flagging with evidence, not fabricating a performance number)` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `AddElement.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._