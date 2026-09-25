# FoE-Info

A passive Chrome Manifest V3 extension and real-time companion for [Forge of Empires](https://en.forgeofempires.com) players. FoE-Info reads the game's live network traffic through the DevTools dock and surfaces information the base game does not, without game mutation, injection, or botting.

- Great Building investment, suggested donations, and 1.9x snipe math
- City production, collection times, and harvest yields
- Blue Galaxy harvest assistant and high-value production ranking
- Military, attack, and city boost totals across all combat arenas (GBG, GE, QI, PvP)
- Guild Battlegrounds (attrition, province lock timers, target generator token copy)
- Guild Expedition progress, encounters, and guild contribution rankings
- Treasury log and resource flows
- Incidents, cultural settlement outposts, and historical allies
- Resizable army inventory and player social rosters (Friends, Neighbors, Guild)

- **Source code:** <https://github.com/FoE-Info/FoE-Info-Extension>
- **Issues & support:** <https://github.com/FoE-Info/FoE-Info-Extension/issues>
- **Architecture Guide:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Debugging & Diagnostics:** [DEBUGGING.md](DEBUGGING.md)
- **Web Store & Compliance:** [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md)

## Core Principles & Invariants

- **Passive Observation Only**: Strictly zero network write-backs, botting, auto-clicking, or DOM injection into game frames. Operates purely through DevTools network interception.
- **Dynamic Metadata Streaming**: Game metadata streams dynamically from InnoGames CDNs and RPC responses. No hardcoded entity statistics or static game dumps in `src/`.
- **BigNumber Precision**: Forge Points, Great Building locks, Arc bonuses, and military boosts use BigNumber precision arithmetic to prevent floating-point drift.
- **Full Internationalization (i18n)**: All UI strings, tooltips, and labels support 7 locales (`en`, `de`, `fr`, `es`, `it`, `el`, `gr`) with 100% key parity.

## Requirements

- Node.js >= 24 LTS
- npm >= 9
- Chromium-based browser (Chrome, Edge, Brave, Opera, ...)

## Building

```bash
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension
npm install

# Development build with watch/reload loop
npm run dev

# One-off builds
npm run build:dev    # development bundle  -> build/FoE-Info-DEV
npm run build:beta   # beta bundle         -> build/FoE-Info-Beta
npm run build:prod   # production bundle   -> build/FoE-Info-Prod
```

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
- See [DEBUGGING.md](DEBUGGING.md) for full diagnostic tags, out-of-scope RPC filtering, and AI pair-debugging runbooks.

## Commands & Verification Pipeline

| Stage                  | Command                           | Purpose                                                                         |
| :--------------------- | :-------------------------------- | :------------------------------------------------------------------------------ |
| **Verification Gate**  | `npm run verify`                  | Full 7-stage gate: format, lint, typecheck, RPC contract, i18n, test, dev build |
| **Setup**              | `npm run setup`                   | Install Node dependencies                                                       |
| **Unit Tests**         | `npm test` / `npm run test:watch` | Native Node.js test runner (`node:test`)                                        |
| **Format Check**       | `npm run check`                   | Prettier dry-run check                                                          |
| **Format Write**       | `npm run format`                  | Prettier automatic format write                                                 |
| **Lint**               | `npm run lint`                    | ESLint 9 static analysis                                                        |
| **Type Check**         | `npm run typecheck`               | TypeScript compiler check (`tsc --noEmit`)                                      |
| **RPC Contract Check** | `npm run rpc:contract:check`      | Validate JSON-RPC schemas and contract fixtures                                 |
| **i18n Parity Check**  | `npm run i18n:check`              | Verify key parity across all 7 supported locales                                |
| **i18n Auto-Fix**      | `npm run i18n:fix`                | Synchronize missing translation keys                                            |
| **Metadata Ingest**    | `npm run metadata:download`       | Ingest live InnoGames entity datasets                                           |

Verification order executed by `npm run verify`:

```bash
npm run check              # format check
npm run lint               # lint
npm run typecheck          # TypeScript check
npm run rpc:contract:check # JSON-RPC contract check
npm run i18n:check         # i18n parity check
npm test                   # unit tests
npm run build:dev          # dev build
```

## Project Structure & Architecture

```text
src/
  chrome/     MV3 manifests, panel.html, options.html
  css/        Bootstrap 5.3 theme and component stylesheets
  i18n/       7-language localization dictionaries (de, el, en, es, fr, gr, it)
  js/
    calc/       Pure calculation engines (boosts, production, goods, units)
    msg/        InnoGames JSON-RPC service handlers
    protocol/   Network routing, message dispatching, packet interception
    state/      In-memory reactive state & metadata stores
    ui/         DOM rendering, cards, popover components
    utils/      Storage, copy, i18n, and logging utilities
tests/        Native Node.js test suites (node:test)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for data pipeline flow, RPC dispatching, and layer invariants.

## Security

Please report vulnerabilities privately through GitHub's **Report a vulnerability** flow on the **Security** tab. See [SECURITY.md](SECURITY.md) for details.

## License

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE.md) (AGPL-3.0-or-later).
