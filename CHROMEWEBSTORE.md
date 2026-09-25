# Chrome Web Store Listing & Compliance: FoE-Info

_Single source of truth for Chrome Web Store listing metadata, permissions justifications, privacy disclosures, and store review compliance._

**Last Updated:** 2026-09-04  
**Extension Version:** `0.0.832`  
**Manifest Version:** 3

---

## 1. Store Listing Metadata

- **Name:** FoE-Info
- **Short Name:** FoE-Info
- **Summary / Tagline:** Essential Info browser extension and real-time game companion for Forge of Empires players.
- **Category:** Productivity / Fun & Games
- **Primary Language:** English (`en`)
- **Homepage URL:** https://foe-info.github.io/FoE-Info-Docs/
- **Support / Source Code:** https://github.com/FoE-Info/FoE-Info-Extension
- **Detailed Description:**

```text
Forge of Empires players and Guild Leaders will find these real-time statistics essential for detailed city analysis, smart Great Building investments, and guild battle coordination. Spend Forge Points efficiently, lock spots safely, and export performance data directly to spreadsheets.

✨ What's New:
• Persistent GBG Target Generator & Chat Sync: Preserves your target clipboard message across routine background updates and sector conquests so the "Post" button is never dismissed prematurely when closing the thread. State automatically resets back to the generator only when markers are placed, toggled (Stop/Attack signals), or when reloading/re-entering the map.
• Critical Strike in City Overview: Displays your player's total Critical Strike chance percentage directly under the Arc bonus, dynamically aggregating Arctic Orangery (AO) and Cosmic Catalyst ally combat boosts.
• Context-Aware Dynamic View Filtering: Automatically switches view context between GBG Map view (streamlined to 6 combat-essential panels: Header, Army, Rewards, Target Generator, Battleground Changes, Leaderboard) and City view, keeping your interface fast and clutter-free during active racing.
• Standalone Incidents Card: Dedicated, independently collapsible Incidents panel decoupled from Harvest production, with live tracking and instant status updates.
• Ergonomic GBG Changes Viewport: Expanded 400px default viewport with dynamic full-view expansion for high-speed guild battle races.
• BigNumber Precision & Stability: Eliminated floating-point rounding errors across Arc bonuses, spot-locking thresholds, and combat calculations.
• Passive Telemetry & Performance: Completely passive, non-interfering network RPC observation with zero tab focus-stealing and sub-second panel responsiveness.

🛠️ Core Features & Tools:
• City Overview & Combat Boosts: Real-time Player Points, Era, Guild, Income, and full Combat + City Boosts (Arc, Chateau Frontenac, Critical Strike, Coins, Supplies) with rich hover popovers across all combat arenas (GBG, GE, QI, PvP).
• GBG Target Generator & Battleground Radar: Automated target callouts, siege camp attrition tracking, real-time conquest signals, and building construction countdowns.
• Great Building 1.9x Helper: Calculates exact costs to safely lock reward spots, investor contributions, and profit/loss margins for target rates (1.9, 1.92, 1.94, etc.) with sniper safeguards.
• Blue Galaxy Helper: Ranks harvestable buildings by FP yield to maximize remaining Blue Galaxy daily charges.
• Guild Administration & Expedition: Detailed rosters for Guild Battlegrounds (GBG), Guild Expedition (GE Trials 1–5), and Guild Treasury resource reserves.
• Army Unit Management: Resizable inventory of unattached units, rogues, and active military health that remembers your custom dimensions across sessions.
• Social Roster Lists: Inspect and export Friends, Neighborhood, and Guild player rosters with one-click clipboard copying.
• Incidents & Outposts: Live indicators for hidden rewards, city incidents, and Cultural Settlement progress.

📋 One-Click Spreadsheet & Chat Export:
Every panel includes dedicated "Copy" buttons to quickly format and copy data to your clipboard for pasting into in-game messages, 1.9x guild threads, Discord, or Google Sheets.

🔒 Safe & Rule-Compliant:
This extension is NOT a bot and does NOT automate any game actions or send unauthorized requests. It passively observes incoming game data packets inside your browser DevTools. No private credentials or personal data are collected or transmitted.
```

---

## 2. Permissions Justification

Every permission declared in `src/chrome/manifest.json` serves a specific user-facing purpose:

| Permission         | Scope / Risk | Plain-English Review Justification                                                                                                                                                                                      |
| :----------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`          | High         | Required to store user configuration preferences, panel toggle visibility, custom donation percentages (e.g. 1.9x), and user-configured Discord webhook URLs locally on the player's device.                            |
| `unlimitedStorage` | Low          | Forge of Empires generates extensive daily guild battle logs, player contribution records, and game entity metadata caches. Unlimited local storage prevents data eviction and avoids truncating historical statistics. |
| `clipboardWrite`   | Medium       | Allows players to click a single button to copy Great Building reward positions (e.g., Arc snipe spot callouts) or Guild Battleground target coordinates directly to their clipboard for pasting into game chat.        |
| `webRequest`       | High         | Required to inspect InnoGames JSON-RPC network responses (`/game/json` and `/metadata`) to extract dynamic game entity statistics and real-time player data while the game is running.                                  |

---

## 3. Host Permissions Justification

| Match Pattern                           | Justification                                                                                                                                                                 |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://*.forgeofempires.com/game/*`   | The core host permission. Required to inject the network bridge and inspect live game RPC traffic on official InnoGames game servers during active play.                      |
| `https://*.innogamescdn.com/*`          | Required to fetch and display official Forge of Empires building sprites, era icons, goods graphics, and avatar assets within the extension DevTools panel.                   |
| `https://discord.com/api/webhooks/*`    | Enables players to optionally transmit guild battleground target coordinates directly to their guild's designated Discord channels. Only triggered by explicit player action. |
| `https://discordapp.com/api/webhooks/*` | Legacy Discord webhook endpoint pattern; maintained for backward compatibility with guild Discord setups.                                                                     |
| `https://*.scoredb.io/*`                | Used for optional external lookups of historical player rankings and guild performance statistics.                                                                            |
| `https://*.google.com/*`                | Used for optional user export of guild statistics directly into player-managed Google Sheets.                                                                                 |
| `https://*.googleusercontent.com/`      | Used to authenticate and display user avatar assets associated with Google Sheet export integrations.                                                                         |

---

## 4. Privacy & Data Use Disclosure

- **Single Purpose Policy**: FoE-Info exists solely as a game companion tool to calculate rewards, manage guild statistics, and display game data for Forge of Empires players.
- **No Telemetry / No Analytics**: FoE-Info does not bundle Google Analytics, Mixpanel, or any tracking SDKs.
- **No Sale of Data**: Player data, usernames, guild information, and webhook URLs are never sold, transferred, or shared with third parties.
- **Local Storage Isolation**: All game payloads, cached entity stats, and player settings are stored exclusively in `chrome.storage.local` on the user's local machine.
- **Outbound Network Traffic**:
  - The extension only communicates with InnoGames servers (game data and CDN assets), the optional Discord webhook endpoints explicitly configured by the user, and user-configured Google Sheets.

---

## 5. Store Assets & Visual Checklist

- [x] Extension Icons: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128 PNGs exist in `src/icons/foe-info/`.
- [ ] Store Promo Tile (Small): 440×280 px PNG.
- [ ] Store Screenshots: Minimum 1 screenshot (1280×800 or 640×400 px) showing DevTools panel in action.
- [ ] Store Marquee Banner (Optional): 1400×560 px.

---

## 6. Version History

### `v0.0.832` (Current)

- Manifest V3 architecture with dedicated DevTools panel (`panel.html`) and MAIN/ISOLATED world content script bridging.
- Multi-locale translation support across 7 languages.
- BigNumber precision calculation engine for 1.9x Arc boosts.
- Localized font self-containment for full offline support.
