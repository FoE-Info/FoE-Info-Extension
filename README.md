# FoE Info Extension

Chrome extension panel for Forge of Empires that augments in-game data, guild tooling, and quality-of-life overlays.

## Quick Start

1. Clone the repository.
2. Install dependencies.

```bash
npm install
```

3. Build extension assets.

```bash
npm run build-foe-info
```

4. Open `chrome://extensions`, enable Developer Mode, and load unpacked extension from `build/FoE-Info_WEBSTORE`.

## Development Commands

1. Watch-mode dev build:

```bash
npm run dev
```

2. TypeScript check:

```bash
npm run typecheck
```

3. Handler regression tests:

```bash
npm run test:handlers
```

4. Formatting checks:

```bash
npm run check
npm run format
```

## Runtime Usage

1. Open Forge of Empires in the browser.
2. Open DevTools.
3. In DevTools tabs, choose FoE-Info panel.
4. Use the options icon to configure feature toggles.

## Project Structure

1. `src/js/index.ts`:
Main extension entry and dispatcher wiring.
2. `src/js/msg/`:
Service handlers and request-handler modules.
3. `src/css/`:
Shared styles and page-level stylesheets.
4. `src/chrome/`:
Manifest and extension HTML templates.
5. `tests/handlers/`:
Vitest regression suite for request handlers.

## Additional Documentation

1. Architecture guide: `ARCHITECTURE.md`.
2. Multi-phase roadmap: `ROADMAP_PHASES.md`.
3. Permission reduction strategy: `PERMISSIONS_AUDIT.md`.

## Debugging Tips

1. Right-click inside FoE-Info panel and choose Inspect.
2. Use console output for service routing and payload diagnostics.
3. Enable extension debug mode from the FoE-Info UI when deeper traces are needed.
