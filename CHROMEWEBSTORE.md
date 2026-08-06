# Chrome Web Store Metadata & Submission Reference

- **Extension Name**: FoE Info
- **Version**: 0.0.831
- **Manifest Version**: 3
- **Primary Language**: English
- **Category**: Developer Tools / Productivity
- **Last Updated**: 2026-08-06

---

## 1. Store Listing Copy

### Summary (Short Description - max 132 chars)
Essential analytical tools and live game statistics for Forge of Empires players, integrated directly into DevTools.

### Detailed Description
FoE Info provides real-time game analytics, Great Building ROI calculators, production tracking, and guild battleground statistics for Forge of Empires players.

#### Key Features:
- **Great Buildings Investment Calculator**: Automatically calculates Arc bonus rewards (with rounding UP per game mechanics), spot locks, and optimal Forge Point contributions.
- **Production & Resource Tracker**: Summarizes active city productions, goods tally, and daily inventory yields.
- **Guild & Battleground Analytics**: Analyzes battleground tile changes, member activity, and expedition rewards.
- **Player & Friend Monitoring**: Provides active status insights and plunder tracking for strategic gameplay.
- **One-Click Export**: Copy investment strings or post statistics directly to Discord webhooks or user-configured Google Sheets.

---

## 2. Permissions Justifications

The Chrome Web Store review team requires precise, single-purpose justifications for all requested permissions and host permissions.

### API Permissions
- `storage`: Required to save user preferences, custom Arc bonus ratios, localized game entity definitions (`CityEntityDefs`), and tab UI settings locally across sessions.
- `unlimitedStorage`: Required to cache extensive game metadata (building definitions, entity graphics mappings) locally so the extension functions without repeated metadata downloads.
- `clipboardWrite`: Required to allow players to copy Great Building investment formulas and guild contribution summary strings to their clipboard for sharing in in-game chat threads.

### Host Permissions
- `https://*.forgeofempires.com/game/*`: Required to inspect game API response payloads (`/game/json`) within the DevTools Network panel, enabling real-time calculation of building stats, battleground state, and contribution math.
- `https://*.innogamescdn.com/*`: Required to load official entity definition JSON files and item metadata assets served from InnoGames' official CDN.
- `https://*.google.com/*`: Required to support optional export features where players send guild battleground or donation logs to user-configured Google Apps Script web application endpoints (`script.google.com`).
- `https://*.googleusercontent.com/`: Required to retrieve user-configured media or avatar assets associated with Google Apps Script integrations.
- `https://discordapp.com/api/webhooks/*`: Required to post automated guild notifications and donation logs to user-configured Discord webhooks.
- `https://discord.com/api/webhooks/*`: Required to post automated guild notifications and donation logs to user-configured Discord webhooks (updated Discord domain).

---

## 3. Privacy & Data Handling Disclosure

- **Data Collection**: FoE Info does NOT collect, track, or sell personal user data, browsing history, or user credentials.
- **Data Storage**: All cached game definitions, user options, and calculation settings are stored strictly in local browser storage (`chrome.storage.local`).
- **External Communications**: Outbound network requests occur strictly to official game servers (`forgeofempires.com`/`innogamescdn.com`) for metadata retrieval, or to user-configured webhook endpoints (Discord / Google Apps Script) when explicitly initiated by the user.

---

## 4. Submission Checklist

- [x] Manifest V3 compliance verified (`manifest_version: 3`)
- [x] No dynamic code execution (`eval()`, `new Function()`) in extension pages
- [x] Icons provided in 16x16, 24x24, 32x32, 48x48, 64x64, 128x128 sizes
- [x] All permissions single-purpose justified
- [x] Production build generated without debug logs (`npm run build`)
