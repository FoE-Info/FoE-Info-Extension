# Tech Stack

## Runtime & Engine

- **Target Browser**: Google Chrome (Chromium) Manifest V3.
- **Node.js**: Node 24+ LTS.
- **Package Manager**: npm.

## Build System & Packaging

- **Bundler**: Webpack 5 multi-target (`dev`, `prod`).
- **Entry Points**: `src/manifest.json`, `src/devtools.html`, `src/panel.html`, `src/options.html`, `src/background.js`.
- **CSS / Styling**: Bootstrap 5.3, SCSS compiler, Modern-web Tier 3 CSS Anchor Positioning & CSS Grid 0fr/1fr collapse animations.
- **Packaging Scripts**: `scripts/package-extension.js`, `scripts/release.mjs`.

## Architecture & Libraries

- **Mathematics & Precision**: `bignumber.js` for all FP, boost, lock, and donation calculations to prevent floating point drift.
- **State Management**: Reactive state stores in `src/js/state/` (`MetadataStore.js`, `viewState.js`, `storageListener.js`).
- **Protocol Dispatching**: Decoupled JSON-RPC services in `src/js/msg/` registered with `MessageDispatcher.js` via `registerServices.js`.
- **UI Architecture**: Modular rendering pipelines in `src/js/ui/` adhering to strict file line ceilings ($\le 500$ lines, target $\le 250$ lines).

## Testing & Quality Assurance

- **Test Runner**: Node.js native test runner (`node --test --test-reporter=dot`).
- **Test Invariants**: Zero external test mocks for pure calculations; fixture-backed RPC contracts.
- **Linting & Formatting**: ESLint 9, Prettier.
- **Verification Gate**: `npm run verify` (format check, lint, RPC contract audit, i18n parity check, full test suite, development webpack build).
