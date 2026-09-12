# FoE-Info

A browser extension and real-time companion for [Forge of Empires](https://en.forgeofempires.com) players. FoE-Info reads the game's live network data through the DevTools panel and surfaces information the base game does not, including:

- Great Building investment, suggested donations, and snipe math
- City production, collection times, and harvest yields
- Military, attack, and city boost totals
- Guild Battlegrounds and Guild Expedition data
- Inventory, historical allies, and Antiques Dealer values

- **Documentation:** <https://foe-info.github.io/FoE-Info-Docs/>
- **Source code:** <https://github.com/FoE-Info/FoE-Info-Extension>
- **Issues & support:** <https://github.com/FoE-Info/FoE-Info-Extension/issues>

## Requirements

- Node.js >= 24
- npm >= 9
- A Chromium-based browser (Chrome, Edge, Brave, Opera, ...)

## Building

```bash
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension
npm install

# Development build with a watch/reload loop
npm run dev

# One-off builds
npm run build:dev    # development bundle  -> build/FoE-Info-DEV
npm run build:beta   # beta bundle         -> build/FoE-Info-Beta
npm run build:prod   # production bundle   -> build/FoE-Info-Prod
```

## Installing the extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the generated folder, e.g. `build/FoE-Info-DEV` for a development build

## Using the extension

1. Open your game world, e.g. `https://en0.forgeofempires.com` (any language works)
2. Press `Ctrl+Shift+I` to open DevTools
3. Click `>>` in the DevTools tab bar and select **FoE-Info (DEV)**
4. Load/enter the game to start FoE-Info
5. Click the tools icon in the panel header to change options

## Debugging

- Right-click the FoE-Info panel and choose **Inspect**, then open the **Console** tab
- Click the FoE-Info logo in the panel header to toggle **debug mode**, which prints module-scoped diagnostics (`[FoE-Info:<Module>]`)

## Testing & verification

```bash
npm test          # unit tests (node:test)
npm run test:watch
npm run verify    # full gate: format, lint, typecheck, RPC contract,
                  # i18n parity, unit tests, and dev build
```

`npm run verify` is the required gate and is also run in CI on every push and pull request to `development`.

## Project structure

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

## Security

Please report vulnerabilities privately through GitHub's **Report a vulnerability**
flow on the **Security** tab. See [SECURITY.md](SECURITY.md) for details.

## License

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE.md)
(AGPL-3.0-or-later).
