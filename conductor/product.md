# Product Definition

## Project Overview

- **Project Name**: FoE-Info Extension
- **Platform**: Passive Chrome Manifest V3 DevTools Extension
- **Target Application**: Forge of Empires (InnoGames browser MMO)

## Core Value Proposition

FoE-Info provides deterministic, zero-write economic, combat, guild, and city telemetry to Forge of Empires players directly within the Chrome DevTools dock. It decodes network payloads passively without game manipulation, botting, or injection.

## User Personas

1. **Active Guild Members & Leaders**: Tracking Guild Battlegrounds (GBG) attrition, province lock schedules, and Guild Expedition (GE) participation.
2. **City Economists & GB Investors**: Optimizing Forge Point (FP) production, Blue Galaxy double-collection timings, and 1.9x Great Building contribution spots.
3. **Combat Strategists**: Assessing army units, defense/attack stat ratios, and Quantum Incursion incursions.

## Key Feature Panels

- **Live City Stats**: Population, happiness, active boosts, FP income, daily unit generation.
- **Great Buildings (GB) & Donations**: Contribution levels, lock margins, profit calculators, sniper warnings.
- **Guild Battlegrounds (GBG)**: Province statuses, attrition rates, lock timers, target generator token copy.
- **Guild Expedition (GE)**: Encounter progress, chest rewards, guild contribution rankings.
- **Blue Galaxy Harvest Assistant**: High-value production tracker with duplicate grouping and collection countdowns.
- **Treasury Log**: Goods accumulation, spend tracking, historical resource flows.
- **Incidents & Outposts**: Hidden incidents tracking on outskirts, roads, and water; cultural settlement progression.

## Invariants & Principles

- **Passive Observation Only**: Strictly no network writes, game botting, auto-clicking, or DOM injection into game frames.
- **Dynamic Metadata Streaming**: Game metadata streams dynamically from InnoGames CDNs. Zero hardcoded item/unit statistics in `src/`.
- **Full Internationalization (i18n)**: All UI strings, tooltips, and labels support 7 locales (`en`, `de`, `fr`, `es`, `it`, `el`, `gr`) with 100% key parity.
- **Signature UI Theme**: Responsive DevTools layout using Bootstrap 5.3 with FoE-Info's dark backdrop and signature pastel alert card palette.
