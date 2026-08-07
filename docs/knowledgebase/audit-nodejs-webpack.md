# Node.js Toolchain & Webpack Build Audit

**Source Files**: `package.json`, `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`

> **Note**: `foe-info-webstore.config.js` and `webpack-dev.config.js` were deleted and replaced by the modular 3-file setup (`webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`) using `webpack-merge` as of commit `5b6604d`.


## 1. Toolchain Overview

```
Node.js 22 (via mise)
Python 3.12 (via mise, for graphify)
uv latest (for Python tooling)
```

### npm Scripts

| Script         | Command                                                                | Notes                              |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `check`        | `prettier --check .`                                                   | Format validation                  |
| `format`       | `prettier --write .`                                                   | Auto-format                        |
| `dev`          | `cross-env NODE_ENV=development webpack --config webpack.dev.js --watch` | Watch + rebuild (DEV mode)       |
| `build:dev`    | `cross-env NODE_ENV=development webpack --config webpack.dev.js`       | One-shot dev build                 |
| `build`        | `cross-env NODE_ENV=production webpack --config webpack.prod.js`       | Production build (Webstore)        |
| `build-foe-info` | `npm run build`                                                      | Alias for `build`                  |
| `analyze`      | `cross-env ANALYZE=true NODE_ENV=production webpack --config webpack.prod.js` | Bundle analysis report      |

**Missing tasks** (still not added):

- `lint` — ESLint (not installed)
- `test` — no test runner configured
- `type-check` — no TypeScript

---

## 2. Dependency Audit

### 2.1 Misclassified Dependencies — ✅ RESOLVED

Previously, `sass` and `sass-loader` were in `dependencies`. Both have been moved to `devDependencies`.

### 2.2 Removed Packages

| Package                  | Was              | Status                                    |
| ------------------------ | ---------------- | ----------------------------------------- |
| `file-loader`            | devDependencies  | **Removed** — replaced by Webpack 5 Asset Modules (`type: 'asset/resource'`) |
| `license-webpack-plugin` | devDependencies  | **Removed**                               |
| `webpack-dev-middleware` | devDependencies  | **Removed** — was unused                  |

### 2.3 Installed But Not Wired

| Package                   | Purpose                   | Issue                                                      |
| ------------------------- | ------------------------- | ---------------------------------------------------------- |
| `webpack-bundle-analyzer` | Bundle size visualization | Installed; wired via `npm run analyze` (`ANALYZE=true`)    |
| `webpack-dev-server`      | Dev server                | Installed; configured in `webpack.dev.js` with `devServer.static` |

### 2.4 Dependency Usage Assessment

| Package                 | Used?               | Notes                                                                    |
| ----------------------- | ------------------- | ------------------------------------------------------------------------ |
| `dayjs`                 | Verify              | Possibly used for date formatting in treasury logs                       |
| `webhook-discord`       | Assess              | `post.js` uses raw `fetch()`/`XMLHttpRequest` — may not use this package |
| `@popperjs/core`        | Yes (via Bootstrap) | Also imported directly in index.js (`mapToStyles` — unused import)       |
| `bignumber.js`          | Yes                 | GBG sector costs, GB donation calculations                               |
| `webextension-polyfill` | Yes                 | browser.* API compatibility layer                                        |
| `cross-env`             | Yes                 | Cross-platform `NODE_ENV` injection in npm scripts                       |

---

## 3. Webpack Production Config (`webpack.prod.js`)

### 3.1 TerserPlugin — ✅ RESOLVED

The dead-config bug (`format: null` overwriting `format: {}`) has been fixed. Current config:

```javascript
new TerserPlugin({
    terserOptions: {
        ecma: 2018,
        compress: {
            pure_funcs: ['console.info', 'console.debug'],
        },
        format: {
            comments: false,
        },
        mangle: true,
    },
    extractComments: false,
}),
```

### 3.2 `optimization.splitChunks` — ✅ RESOLVED

Vendor splitting is now configured in `webpack.common.js`:

```javascript
optimization: {
    splitChunks: {
        cacheGroups: {
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
            },
        },
    },
},
```

Bootstrap and jQuery are extracted into a shared `vendors.js` chunk, eliminating duplication across entry points.

### 3.3 Asset Modules (replacing `file-loader`) — ✅ RESOLVED

`file-loader` has been removed. `webpack.common.js` uses Webpack 5 native Asset Modules:

```javascript
{
    test: /\.(png|svg|jpg|jpeg|gif)$/i,
    type: 'asset/resource',
    generator: {
        filename: 'images/[name][ext]',
    },
},
```

### 3.4 Consolidated CopyPlugin — ✅ RESOLVED

All copy patterns are now in a single `CopyPlugin` call in `webpack.common.js`.

### 3.5 No PurgeCSS

**Severity**: HIGH (bundle size)

Bootstrap 5 CSS (518 KiB) includes every Bootstrap component. A DevTools panel uses maybe 10% of Bootstrap's CSS surface. PurgeCSS removes unused rules.

**Installation**:

```bash
npm install --save-dev purgecss-webpack-plugin glob
```

**Config** (add to `webpack.prod.js`):

```javascript
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const glob = require('glob');

// In plugins array:
new PurgeCSSPlugin({
    paths: glob.sync(`${path.join(__dirname, 'src')}/**/*`, { nodir: true }),
    safelist: {
        // Bootstrap JS-toggled classes (must not purge):
        standard: [/^show$/, /^collapse/, /^modal/, /^popover/, /^tooltip/, /^bs-/],
        deep: [/^data-bs/],
    },
}),
```

**Estimated savings**: 80–90% CSS reduction → 518 KiB → ~50–100 KiB.

---

## 4. Webpack Dev Config (`webpack.dev.js`)

### 4.1 `devServer.static` — ✅ RESOLVED

The deprecated `devServer.contentBase` has been replaced with `devServer.static`:

```javascript
devServer: {
    static: {
        directory: path.resolve(__dirname, 'build/' + PACKAGE_NAME),
    },
    hot: true,
    port: 3000,
},
```

### 4.2 CSS Handling

```javascript
// Dev config CSS rules (unified):
{
    test: /\.(sa|sc|c)ss$/,
    use: [
        'style-loader',
        'css-loader',
        'postcss-loader',
        { loader: 'sass-loader', options: { sassOptions: { quietDeps: true } } },
    ],
},
```

All CSS/SCSS variants go through `postcss-loader` and `sass-loader` in dev mode.

### 4.3 Slow Source Maps

```javascript
// Current:
devtool: 'inline-source-map',  // ← Slowest rebuild: full source maps inlined

// Recommended for faster rebuilds:
devtool: 'eval-cheap-module-source-map',  // 10x faster, still debuggable
```

### 4.4 HMR Note

The dev config uses webpack-dev-server with `hot: true`. Since this is a Chrome Extension (not a web app), HMR has limited applicability (extension pages need manual reload after rebuild). The watch approach via `npm run dev` is appropriate for development iteration.

---

## 5. Bundle Size Analysis

| Entry Chunk | JS Size  | CSS Size | Total       | Recommendation         |
| ----------- | -------- | -------- | ----------- | ---------------------- |
| `app`       | 359 KiB  | 518 KiB  | **877 KiB** | splitChunks + PurgeCSS |
| `options`   | ~245 KiB | ~5 KiB   | ~250 KiB    | Share vendor chunk     |
| `popup`     | ~87 KiB  | ~5 KiB   | ~92 KiB     | Share vendor chunk     |
| `devtools`  | ~5 KiB   | 0        | ~5 KiB      | OK                     |

**Post-optimization estimates** (with all recommendations applied):

| Entry Chunk        | JS Size  | CSS Size | Total    | Saving   |
| ------------------ | -------- | -------- | -------- | -------- |
| `app`              | ~150 KiB | ~80 KiB  | ~230 KiB | -647 KiB |
| `vendors` (shared) | ~220 KiB | —        | ~220 KiB | —        |
| `options`          | ~20 KiB  | ~20 KiB  | ~40 KiB  | -210 KiB |
| `popup`            | ~5 KiB   | 0        | ~5 KiB   | -87 KiB  |

---

## 6. Missing Build Infrastructure

| Missing Tool          | Purpose                | Priority | Install                                               |
| --------------------- | ---------------------- | -------- | ----------------------------------------------------- |
| ESLint                | Code linting           | **HIGH** | `npm install --save-dev eslint @eslint/js`            |
| Vitest or Jest        | Unit testing           | HIGH     | `npm install --save-dev vitest`                       |
| TypeScript (optional) | Type safety            | LOW      | `npm install --save-dev typescript`                   |
| PurgeCSS              | Unused CSS elimination | **HIGH** | `npm install --save-dev purgecss-webpack-plugin glob` |
| CI/CD                 | Automated build/lint   | MEDIUM   | `.github/workflows/build.yml`                         |

---

## 7. Recommended Improvements (Prioritized)

| Priority     | Issue                                                                 | File                          | Action                                                        | Effort   | Status       |
| ------------ | --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- | -------- | ------------ |
| **CRITICAL** | TerserPlugin dead config (`format: null` overwrites `format: {}`)     | `webpack.prod.js`             | Consolidated to single `format: { comments: false }`          | 5 min    | ✅ DONE      |
| **HIGH**     | No `splitChunks` — Bootstrap/jQuery duplicated in all entry chunks    | `webpack.common.js`           | Added `optimization.splitChunks` vendor cache group           | 1 hr     | ✅ DONE      |
| **HIGH**     | `file-loader` deprecated                                              | Both configs                  | Migrated to Webpack 5 Asset Modules (`type: 'asset/resource'`)| 30 min   | ✅ DONE      |
| **HIGH**     | `sass` + `sass-loader` in `dependencies` instead of `devDependencies` | `package.json`                | Moved to `devDependencies`                                     | 5 min    | ✅ DONE      |
| **HIGH**     | Wire `webpack-bundle-analyzer`                                        | `package.json`                | Added `analyze` script (`ANALYZE=true npm run build`)         | 30 min   | ✅ DONE      |
| **HIGH**     | `devServer.contentBase` deprecated                                    | `webpack.dev.js`              | Updated to `devServer.static.directory`                       | 5 min    | ✅ DONE      |
| **HIGH**     | 5 separate `CopyPlugin` calls                                         | `webpack.common.js`           | Merged into one `patterns` array                              | 10 min   | ✅ DONE      |
| **HIGH**     | No PurgeCSS — full Bootstrap 5 CSS (518 KiB) in bundle                | `webpack.prod.js`             | Add `purgecss-webpack-plugin`                                 | 2 hrs    | ⏳ PENDING   |
| **HIGH**     | No ESLint                                                             | project root                  | Add ESLint with `no-var`, `prefer-const`, `no-unused-vars`    | 2 hrs    | ⏳ PENDING   |
| **MEDIUM**   | Slow `inline-source-map` devtool                                      | `webpack.dev.js`              | Switch to `eval-cheap-module-source-map`                      | 2 min    | ⏳ PENDING   |
| **MEDIUM**   | No `optimization.runtimeChunk`                                        | `webpack.prod.js`             | Add `runtimeChunk: 'single'`                                  | 2 min    | ⏳ PENDING   |

---

## 8. Proposed Config Snippets

### 8.1 Fixed TerserPlugin

```javascript
new TerserPlugin({
    terserOptions: {
        ecma: 2015,
        compress: {
            pure_funcs: ['console.info', 'console.debug'],
        },
        format: {
            comments: false,
        },
        mangle: true,
        module: true,
    },
    extractComments: false,
}),
```

### 8.2 splitChunks Vendor Extraction

```javascript
optimization: {
    minimize: true,
    minimizer: [/* TerserPlugin */],
    runtimeChunk: 'single',
    splitChunks: {
        chunks: 'all',
        cacheGroups: {
            defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: -10,
            },
        },
    },
},
```

### 8.3 PurgeCSS Plugin Integration

```javascript
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin');
const glob = require('glob');

// In plugins array (production config only):
new PurgeCSSPlugin({
    paths: glob.sync(`${path.resolve(__dirname, 'src')}/**/*`, { nodir: true }),
    safelist: {
        standard: [
            /^show$/,
            /^collaps/,
            /^popover/,
            /^tooltip/,
            /^bs-/,
            /^modal/,
            /^fade$/,
            /^alert/,
            /^badge/,
        ],
    },
}),
```

### 8.4 Asset Modules (replacing file-loader)

```javascript
{
    test: /\.(png|svg|jpg|gif)$/,
    type: 'asset/resource',
    generator: {
        filename: 'assets/[name][ext]',
    },
},
```

### 8.5 New mise.toml Tasks

```toml
[tasks.lint]
description = "Lint JavaScript with ESLint"
run = "npx eslint src/js"

[tasks.lint-fix]
description = "Auto-fix ESLint issues (var->let/const, etc.)"
run = "npx eslint src/js --fix"

[tasks.analyze]
description = "Analyze webpack bundle sizes"
run = "npm run analyze"

[tasks.test]
description = "Run unit tests"
run = "npx vitest run"
```
