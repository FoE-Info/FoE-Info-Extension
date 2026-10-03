# FoE-Info Application Guide

# FoE-Info

FoE-Info is a passive Chrome Manifest V3 extension for [Forge of Empires](https://en.forgeofempires.com) players. It reads live network traffic to show information the base game does not provide, without game mutation, botting, or automation. Traffic reaches the extension over two read-only intake paths. The [security architecture](security-architecture.md) describes their trust boundaries.

- Great Building investment, suggested donations, and 1.9x snipe math
- City production, collection times, and harvest yields
- Blue Galaxy harvest assistant and high-value production ranking
- Military, attack, and city boost totals across all combat arenas (GBG, GE, QI, PvP)
- Guild Battlegrounds (attrition, province lock timers, target generator token copy)
- Guild Expedition progress, encounters, and guild contribution rankings
- Treasury log and resource flows
- Incidents, cultural settlement outposts, and historical allies
- Resizable army inventory and player social rosters (Friends, Neighbors, Guild)

- Source code: <https://github.com/FoE-Info/FoE-Info-Extension>
- Issues and support: <https://github.com/FoE-Info/FoE-Info-Extension/issues>
- Architecture: [architecture.md](architecture.md)
- Debugging and diagnostics: [debugging.md](debugging.md)
- Web Store and compliance: [chrome-web-store.md](chrome-web-store.md)

## Installing the Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the generated folder, e.g. `build/FoE-Info-DEV` for a development build

## Using the Extension

1. Open your game world, e.g. `https://en0.forgeofempires.com` (any language works)
2. Press `Ctrl+Shift+I` to open DevTools
3. Click `>>` in the DevTools tab bar and select **FoE-Info (DEV)**
4. Load/enter the game to start FoE-Info
5. Click the tools icon in the panel header to change options

## Debugging

- Right-click the FoE-Info panel and choose **Inspect**, then open the **Console** tab.
- Click the FoE-Info logo in the panel header to toggle **debug mode** (switches to a bug icon), activating module-scoped diagnostics (`[FoE-Info:<Module>]`).
- See [debugging](debugging.md) for runtime diagnostic tags and RPC filtering; [browser debugging](browser-debugging.md) owns browser investigation procedures.

## Project Structure & Architecture

```text
src/
  chrome/     MV3 manifests, panel.html, options.html
  css/        Bootstrap 5.3 theme and component stylesheets
  i18n/       7-language localization dictionaries (de, el, en, es, fr, gr, it)
  types/      TypeScript declarations
  js/
    calc/       Pure calculation engines (boosts, production, goods, units)
    fn/         Feature-scoped UI bindings and DOM helpers
    msg/        InnoGames JSON-RPC service handlers
    parsers/    Game-payload parsers
    protocol/   Network routing, message dispatching, packet interception
    state/      In-memory reactive state & metadata stores
    ui/         DOM rendering, cards, popover components
    utils/      Storage, copy, i18n, and logging utilities
    vars/       Panel option and view state
tests/        Native Node.js test suites (node:test)
```

See [architecture](architecture.md) for data pipeline flow, RPC dispatching, and layer invariants. See the [Chrome Web Store guide](chrome-web-store.md) for store and compliance details.

## Application boundaries

FoE-Info observes game traffic without sending game requests or automating gameplay. The [security architecture](security-architecture.md) owns the intake and trust boundaries. [Architecture](architecture.md) owns application layers, dynamic metadata, and calculation invariants.
