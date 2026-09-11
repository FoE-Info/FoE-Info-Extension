# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.834] - 2026-09-11

### 🏛️ Great Buildings & City Overview

- **Universal Panel Collapsibility**: Added title-click collapsibility, expand/collapse toggles, and close buttons across all active panels.
- **Other Player Information Card**: Dedicated "Other Player Information" card header with player profile link moved to body line 1, avoiding accidental accordion collapse when opening ScoreDB.
- **Bonus Line Formatting**: Separated Chateau Frontenac (CF) bonus onto its own line directly under Arc bonus.
- **GB Panels Reopening**: Resolved issue where closed Great Building panels failed to reappear upon opening another building.

### 🌐 Multi-World & Landing Page Storage

- **Playable World Filtering**: Filtered out landing/portal origins (`en0`, `us0`, `de0`, `zz0`) from per-world storage and last-active tracking.
- **Options Dynamic Selection**: Automatically selects the active world settings tab matching the current game origin when opening options.
- **Narrow Options Layout**: Restored compact options dialog layout matching classic extension styling.

## [0.0.833] - 2026-09-11

Comprehensive modernization and major update transitioning from the v1 baseline (`FoE-Info-original`).

### 🎯 Guild Battlegrounds (GBG)

- **Rushed Siege Camps**: Reconciled attrition reduction calculations when camps are diamond-rushed on the map; attrition chances update immediately (e.g. promoting from 40% to 20%).
- **Instant Sector Conquest Signals**: Integrated real-time WebSocket push (`province_conquered`) to remove fallen sectors from target generator panels instantly without waiting for polling loops.
- **Under Construction (UC) Formatting**: Added clear visual indicators for adjacent buildings under construction with projected attrition rates.
- **Dedicated GBG & Leaderboard Containers**: Separated GBG province view, targets, and leaderboard into isolated DOM containers with independent collapse controls and null-safe rendering.
- **Discord Webhook Forwarding**: Restored and modernized Discord target forwarding payload formatting.
- **Viewport Ergonomics**: Increased default panel height to 400px with dynamic full-view expansion (`.gbg-changes-full`) to prevent cramped layouts during active races.

### 🏛️ Great Buildings & 1.9x Donations

- **BigNumber Precision Math**: Rewrote all Arc bonus, spot locking, and suggested donor calculations using `bignumber.js` with exact `ROUND_HALF_UP` / ceiling hybrid rounding, eliminating floating-point errors.
- **Real-Time Donation Sync**: Donation progress and donor tables synchronize immediately upon receiving donation packets and self-donations.
- **Spot Locking & Sniper Safeguards**: Separated donor costs from owner safe-lock thresholds, correctly factoring in existing investor positions and selected target rates.
- **Unified GB Cards**: Restored GB Overview and 1.9x Donation helper cards with independent options toggles.

### ⚔️ Guild Expedition (GE 1–5)

- **Panel Disentanglement**: Fully separated GE Championship and GE Leaderboard into standalone, independently collapsible cards.
- **International GE Scoreboard**: Added support for international GE scoreboards and trial level tracking (Trials 1–5).
- **Theme & Contrast Styling**: Fixed table font color inheritance in dark mode and centered leaderboard statistics.

### 🌌 Blue Galaxy Helper

- **Smart Candidate Batching**: Ranks and batches highest-yield FP buildings ready for harvest to optimize Blue Galaxy charge usage.
- **Dynamic Name Resolution**: Automatically backfills newly introduced building names from live metadata without manual client updates.
- **Startup Sync**: Synchronizes Blue Galaxy remaining charges directly from city startup data.

### 🏙️ City Stats, Boosts & Production

- **Interactive Stat Popovers**: Added rich hover popovers and tooltips for Attack/Defense boosts across all combat arenas (GBG, GE, QI, PvP Arena).
- **Town Hall Production Breakdown**: Dedicated daily harvest card with exact breakdowns for Forge Points, Goods, Units, and Clan Power.
- **Visited City Stats**: Rewrote other player city inspection with isolated state, eliminating global state leakage and calculating accurate visited player stats.
- **Excised Legacy GvG**: Completely removed obsolete Guild vs Guild (GvG) code and dead UI panels.

### 📦 Goods & Inventory Management

- **Accurate Goods Totals**: Fixed a legacy 5x goods multiplier bug and eliminated visited city guild goods inflation.
- **Era Goods Breakdown**: Added detailed hover breakdowns showing current stock, incoming harvest, and era distributions.
- **Passive Inventory Triggers**: Re-triggers goods inventory updates passively upon opening the Market or Inventory without disrupting the player's active session.

### ⚙️ Multi-World Storage & Customizable Settings

- **Per-World Storage Isolation**: Switched to world-scoped storage (`en7`, `de3`, etc.) with automatic legacy data migration, preventing settings from overwriting across different worlds.
- **Instant Settings Rendering**: Eliminated blank delay and unpopulated control flash (FOUC) when opening options; populated world selector and checkboxes immediately from storage cache.
- **Custom Date & Time Formats**: Added customizable date/time formatting with international presets (European, US, ISO-8601).
- **Independent Card Toggles**: Dedicated settings toggles for Guild Overview, Goods Inventory, Blue Galaxy, and GB donation helpers.

### ⚡ Protocol, Security & Performance

- **Passive Network Interception**: Restored 100% passive WebSocket/XHR packet observation in `xhrInterceptor.js`, eliminating active out-of-band POST RPC requests that interfered with player sessions.
- **Full Conversation Auto-Paging**: Lifted the arbitrary 4-page limit on message thread loading and added resilient handling for diverse teaser payload formats.
- **Security & XSS Hardening**: Sanitized all DOM insertion sinks, escaped dynamic HTML strings, and eliminated unsafe evaluations.
- **Startup Performance**: Implemented dynamic metadata resolution barriers, reducing redundant entity lookup churn from 170,000+ events to ~100 with sub-5-second startup rendering.
