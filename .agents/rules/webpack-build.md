# Webpack Build & Bundling Rules

This repository uses Webpack 5 to compile JavaScript, Sass/SCSS, and asset bundles for the extension.

## Build Configurations & Scripts

- **Development Build**: [`webpack-dev.config.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/webpack-dev.config.js)
  - Run via `npm run dev`.
  - Enables watch mode (`--watch`), source maps, and fast incremental builds.
- **Production / Webstore Build**: [`foe-info-webstore.config.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/foe-info-webstore.config.js)
  - Run via `npm run build-foe-info`.
  - Compiles optimized production bundle into `build/` directory and creates extension ZIP packages.

## Environment & Tool Execution

- **Environment Integration**: Project environment variables and tool paths are managed cross-platform via `.mise.toml`, `.envrc`, and `.env`.
- **Command Execution**: Execute `npm` or `node` build tasks via standard npm script invocation (`npm run dev`, `npm run build-foe-info`).
- **Verification Rule**: Always verify changes by running `npm run check` and `npm run build-foe-info` before merging topic branches.
