# Build & Tooling Invariants

- **Modular Webpack Setup**: Webpack configuration uses `webpack-merge` to combine `webpack.common.js` with `webpack.dev.js` (for dev builds) and `webpack.prod.js` (for production webstore builds and ZIP creation). Do not recreate monolithic `webpack-dev.config.js` or `foe-info-webstore.config.js`.
- **Webpack 5 Asset Modules**: Use native Webpack 5 Asset Modules (`type: 'asset/resource'`) for image assets rather than deprecated `file-loader`.
- **Cross-Platform NPM Scripts**: Use `cross-env` for setting `NODE_ENV` in `package.json` scripts.
- **Webpack SplitChunks Vendor Optimization**: Configure `optimization.splitChunks` for shared vendor dependencies (`node_modules`) to eliminate bundle duplication across multi-entrypoint setups (app, options, popup, devtools) and keep asset JS sizes under Webpack performance warning limits (< 244 KiB).
