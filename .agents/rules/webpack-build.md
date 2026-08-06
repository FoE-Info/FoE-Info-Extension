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

- **Environment Integration**: Project environment variables and tool paths are managed locally via `.mise.toml`, `.envrc`, and `.env`.
- **Sandbox Execution**: When executing `npm` or `node` build commands in shell tasks, set `BypassSandbox: true` to ensure system Homebrew binaries (`/var/home/linuxbrew/.linuxbrew/bin`) are accessible.
- **Verification Rule**: Always verify changes by running `npm run check` and `npm run build-foe-info` before merging topic branches.
