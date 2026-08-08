# Node.js Toolchain & Webpack Build Audit

**Verified against**: `package.json`, `.mise.toml`, `webpack.common.js`, `webpack.dev.js`, and `webpack.prod.js` on 2026-08-08.

## Toolchain

The supported local environment is Node.js 22, Python 3.12, and the latest `uv`, all managed by `mise`. npm owns JavaScript dependencies through `package-lock.json`; Python is used only for repository tooling such as graphify.

`mise run setup` is the canonical bootstrap command. It installs the pinned tools and runs `npm install`. `npm run setup` delegates to that task when `mise` is available and otherwise installs npm dependencies plus a graphify-capable Python runner.

## Task parity

| Task              | `mise` behavior                                            | npm behavior                               | Status  |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------ | ------- |
| `setup`           | Installs tools and npm packages                            | Delegates to `mise`, with manual fallbacks | Aligned |
| `check`           | Runs Prettier in check mode                                | Same                                       | Aligned |
| `format`          | Formats with Prettier                                      | Same                                       | Aligned |
| `dev`             | Development Webpack watcher                                | Same, with `NODE_ENV=development`          | Aligned |
| `build:dev`       | One development compilation                                | Same, with `NODE_ENV=development`          | Aligned |
| `build`           | Optimized production compilation                           | Same, with `NODE_ENV=production`           | Aligned |
| `build-foe-info`  | Production-build alias                                     | Delegates to `npm run build`               | Aligned |
| `analyze`         | Production build with bundle report                        | Same, with `ANALYZE=true`                  | Aligned |
| `outdated`        | Runs `npm-check-updates`                                   | Same                                       | Aligned |
| `graphify-update` | Updates the graph through `uvx`, `pipx`, or local graphify | Same                                       | Aligned |

The project does not currently define lint, unit-test, or type-check tasks. `npm run check` validates formatting only.

## Dependency classification

Runtime libraries are in `dependencies`; Webpack, its loaders and plugins, Sass, Prettier, and development tooling are in `devDependencies`. The earlier Sass misclassification has been corrected. The current manifest does not depend on the deprecated `file-loader`, `webpack-dev-middleware`, or `license-webpack-plugin` packages.

Items still worth reviewing:

- `webhook-discord` should remain a runtime dependency only if bundled application code imports it.
- `@popperjs/core` is provided transitively by Bootstrap but may still be justified if source code imports it directly.
- There is no automated dependency-security script; use `npm audit --audit-level=high` during maintenance.

## Webpack architecture

### Shared configuration

`webpack.common.js` defines four entry points (`app`, `options`, `devtools`, and `popup`), extracts shared third-party modules into `vendors.js`, emits images through Webpack 5 asset modules, generates the four extension HTML pages, and copies static icons, translations, and the browser polyfill.

### Development build

`webpack.dev.js`:

- writes unpacked-extension assets to `build/FoE-Info-DEV`;
- uses `inline-source-map` and injects styles with `style-loader`;
- processes CSS and Sass through `css-loader`, `postcss-loader`, and `sass-loader`;
- uses the current `devServer.static.directory` configuration;
- sets `DEV=true` and emits a development manifest.

The normal `dev` task runs Webpack in watch mode. Although a dev-server configuration exists, Chrome extensions still need an extension reload when background or manifest behavior changes.

### Production build

`webpack.prod.js`:

- writes the Webstore extension to `build/FoE-Info_WEBSTORE`;
- extracts CSS with `mini-css-extract-plugin`;
- minifies JavaScript with a valid Terser configuration and removes selected debug logging;
- emits a dated release ZIP beside the build directory;
- sets `WEBSTORE=true` and emits the release manifest;
- generates `build/bundle-report.html` when `ANALYZE=true` (`mise run analyze` or `npm run analyze`).

The earlier Terser, asset-module, shared-vendor, CopyPlugin, bundle-analyzer, and deprecated dev-server findings have all been resolved.

## Current improvement opportunities

| Priority | Area                      | Recommendation                                                                                                                  |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| High     | Automated tests           | Add a focused test runner for calculation and message-dispatch logic.                                                           |
| High     | JavaScript linting        | Add ESLint separately from the existing Prettier formatting check.                                                              |
| Medium   | CI                        | Run setup, formatting, tests (once present), and production compilation in CI.                                                  |
| Medium   | CSS size                  | Measure the production bundle before adopting PurgeCSS; dynamically generated Bootstrap class names require a careful safelist. |
| Low      | Development rebuild speed | Compare `inline-source-map` with a cheaper development source-map mode using representative rebuild timings.                    |
| Low      | Runtime dependency review | Confirm `webhook-discord` and direct Popper usage remain necessary.                                                             |

## Verification commands

```bash
mise run setup
mise run check
mise run build:dev
mise run build
mise run analyze
mise run graphify-update
```

Use `build/FoE-Info-DEV` for an unpacked development extension and `build/FoE-Info_WEBSTORE` for production verification.
