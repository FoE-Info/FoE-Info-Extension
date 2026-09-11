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
  FoE-Info is an open-source productivity companion for Forge of Empires players that runs securely within Chrome Developer Tools.

  Key Features:
  - **Great Building Investment Helper**: Real-time Arc 1.9x bonus calculators, safe spot protection, and contribution tracker with high-precision arithmetic.
  - **Guild Battlegrounds & Expedition**: Track member activity, province timers, building costs, and guild rewards.
  - **City & Production Overview**: Monitor building collection times, incident locations, and city bonus boosts.
  - **Guild Administration**: Treasury balance tracking, donation logs, and optional one-click target posting to guild Discord channels.
  - **Multi-language Support**: Fully localized in English, German, French, Spanish, Italian, and Greek.

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
