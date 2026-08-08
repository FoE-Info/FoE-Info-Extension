# Webpack Build & Bundling Rules

This repository uses Webpack 5 with `webpack-merge` to compile JavaScript, Sass/SCSS, and asset bundles for the extension.

## Build Configurations & Scripts

- **Common Base Config**: [`webpack.common.js`](../../webpack.common.js)
  - Manages common entry points, HTML templates, `optimization.splitChunks` vendor cache group, and asset module rules (`type: 'asset/resource'`).
- **Development Build**: [`webpack.dev.js`](../../webpack.dev.js)
  - Run via `npm run dev` (watch mode) or `npm run build:dev` (single build).
  - Enables inline source maps, fast incremental compilation, and quieted SCSS deprecation warnings.
- **Production / Webstore Build**: [`webpack.prod.js`](../../webpack.prod.js)
  - Run via `npm run build` or the equivalent `mise run build` task.
  - Compiles optimized production bundle into `build/FoE-Info_WEBSTORE/` and creates extension ZIP packages via `zip-webpack-plugin`.
  - Run `npm run analyze` or `mise run analyze` to generate `build/bundle-report.html` without opening a browser.

## Environment & Tool Execution

- **Environment Integration**: Project environment variables and tool paths are managed via `.mise.toml`, `.env`, `.env.local`, `.agents/env.sh`, and `cross-env`.
- **Command Execution**: Execute `npm` or `node` build tasks via standard npm script invocation (`npm run dev`, `npm run build:dev`, `npm run build`).
- **Dependency Maintenance**: Always run `npm outdated` when performing dependency updates to ensure all packages (runtime and dev) are upgraded to their latest release versions, and verify correct classification between `dependencies` and `devDependencies`.
- **Verification Rule**: Always verify changes by running `npm run check` and `npm run build` before merging topic branches.
