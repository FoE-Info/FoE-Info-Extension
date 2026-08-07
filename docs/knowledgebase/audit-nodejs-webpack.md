# Node.js Toolchain & Webpack Build Audit

**Source Files**: `package.json`, `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`, `.mise.toml`

---

## 1. Toolchain Overview

```
Node.js 22 (via mise)
Python 3.12 (via mise, for graphify)
uv latest (for Python tooling)
npm workspaces (packages/* — currently unused)
```

**mise.toml tasks** vs **npm scripts** — full redundancy:

| Task              | mise.toml                                          | package.json                                   | Status                                           |
| ----------------- | -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `check`           | `npx prettier --check .`                           | `prettier --check .`                           | Duplicate                                        |
| `format`          | `npx prettier --write .`                           | `prettier --write .`                           | Duplicate                                        |
| `dev`             | `npx webpack ... --watch`                          | `NODE_ENV=... webpack --watch`                 | Slight difference (NODE_ENV set in package.json) |
| `build`           | `npx webpack --config foe-info-webstore.config.js` | `webpack --config foe-info-webstore.config.js` | Near-duplicate                                   |
| `graphify-update` | `uv run graphify update .`                         | `graphify update .`                            | Different runners                                |

**Missing tasks** (should be added):

- `lint` — ESLint (not installed)
- `test` — no test runner configured
- `analyze` — webpack-bundle-analyzer (installed but not wired)
- `type-check` — no TypeScript

---

## 2. Dependency Audit

### 2.1 Misclassified Dependencies

**Severity**: HIGH

The following build-time tools are in `dependencies` instead of `devDependencies`:

| Package       | In `dependencies` | Should Be         |
| ------------- | ----------------- | ----------------- |
| `sass`        | ✅ (wrong)        | `devDependencies` |
| `sass-loader` | ✅ (wrong)        | `devDependencies` |

Sass and its loader are build-time tools that produce CSS. They are never required at runtime by the extension. Moving them to `devDependencies` reduces production installation size.

### 2.2 Deprecated Packages

| Package        | Version  | Issue                                           | Replacement                        |
| -------------- | -------- | ----------------------------------------------- | ---------------------------------- |
| `file-loader`  | `^6.2.0` | Deprecated — no Webpack 5 Asset Modules support | Webpack 5 `type: 'asset/resource'` |
| `style-loader` | `^4.0.0` | Dev only (correct for dev config)               | Keep in devDeps only               |

### 2.3 Installed But Not Wired

| Package                   | Purpose                   | Issue                                                      |
| ------------------------- | ------------------------- | ---------------------------------------------------------- |
| `webpack-bundle-analyzer` | Bundle size visualization | Installed but no script or task uses it                    |
| `webpack-dev-middleware`  | Dev server middleware     | Installed but unused (direct webpack --watch used instead) |
| `webpack-dev-server`      | Dev server                | Installed but devServer.contentBase config is deprecated   |
| `license-webpack-plugin`  | License extraction        | Commented out in both configs                              |

### 2.4 Dependency Usage Assessment

| Package                 | Used?               | Notes                                                                    |
| ----------------------- | ------------------- | ------------------------------------------------------------------------ |
| `dayjs`                 | Verify              | Possibly used for date formatting in treasury logs                       |
| `webhook-discord`       | Assess              | `post.js` uses raw `fetch()`/`XMLHttpRequest` — may not use this package |
| `@popperjs/core`        | Yes (via Bootstrap) | Also imported directly in index.js (`mapToStyles` — unused import)       |
| `bignumber.js`          | Yes                 | GBG sector costs, GB donation calculations                               |
| `webextension-polyfill` | Yes                 | browser.\* API compatibility layer                                       |

---

## 3. Webpack Production Config Issues

**File**: `foe-info-webstore.config.js`

### 3.1 TerserPlugin Dead Configuration

**Severity**: CRITICAL

```javascript
// Current (broken):
new TerserPlugin({
    terserOptions: {
        format: {
            comments: false,    // ← This config object
        },
        // ...
        output: null,           // ← Deprecated key (renamed to 'format')
        format: null,           // ← This NULL overwrites the format: {} above!
        // ...
    },
    extractComments: false,
}),
```

**Result**: `format: null` overwrites `format: { comments: false }`. Comments are NOT stripped. The `output: null` is a deprecated alias that is also a no-op.

**Fix**:

```javascript
new TerserPlugin({
    terserOptions: {
        ecma: 2015,
        compress: {
            pure_funcs: ['console.info', 'console.debug'],
        },
        format: {
            comments: false,   // ← Only here, not overridden
        },
        mangle: true,
        module: true,
    },
    extractComments: false,
}),
```

### 3.2 No `optimization.splitChunks`

**Severity**: HIGH

Without `splitChunks`, every entry point bundles its entire dependency tree independently:

```
app.js (359 KiB)     = index.js + Bootstrap JS + jQuery + all services
options.js (~245 KiB) = options.js + Bootstrap JS + jQuery (duplicated!)
popup.js             = popup.js + Bootstrap JS + jQuery (duplicated!)
devtools.js          = devtools.js + Bootstrap JS (duplicated!)
```

Bootstrap (~130 KiB) and jQuery (~87 KiB) are duplicated across all 4 entry chunks.

**Fix**:

```javascript
optimization: {
    minimize: true,
    minimizer: [/* TerserPlugin */],
    runtimeChunk: 'single',
    splitChunks: {
        cacheGroups: {
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 20,
            },
            bootstrap: {
                test: /[\\/]node_modules[\\/](bootstrap|@popperjs)[\\/]/,
                name: 'bootstrap',
                chunks: 'all',
                priority: 30,
            },
        },
    },
},
```

**Estimated saving**: ~220 KiB deduplicated across chunks.

### 3.3 `file-loader` → Asset Modules Migration

**Severity**: HIGH

`file-loader` is deprecated in Webpack 5. Webpack 5 natively supports asset modules:

```javascript
// Before (file-loader):
{
    test: /\.(png|svg|jpg|gif)$/,
    use: ['file-loader'],
},

// After (Webpack 5 Asset Modules):
{
    test: /\.(png|svg|jpg|gif)$/,
    type: 'asset/resource',
    generator: {
        filename: 'assets/[name].[contenthash][ext]',
    },
},
```

### 3.4 Consolidated CopyPlugin

**Severity**: LOW

5 separate `CopyPlugin` instances can be merged:

```javascript
// Before (5 separate calls):
new CopyPlugin({ patterns: [{ from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js' }] }),
new CopyPlugin({ patterns: [{ from: './src/i18n', to: 'i18n' }] }),
new CopyPlugin({ patterns: [{ from: './src/icons/common', to: 'icons' }] }),
new CopyPlugin({ patterns: [{ from: './src/icons/foe-info', to: 'icons' }] }),
new CopyPlugin({ patterns: [{ from: 'src/images/logo90.png', to: 'icons/' }] }),

// After (single call):
new CopyPlugin({
    patterns: [
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js' },
        { from: './src/i18n', to: 'i18n' },
        { from: './src/icons/common', to: 'icons' },
        { from: './src/icons/foe-info', to: 'icons' },
        { from: 'src/images/logo90.png', to: 'icons/' },
    ],
}),
```

### 3.5 No PurgeCSS

**Severity**: HIGH (bundle size)

Bootstrap 5 CSS (518 KiB) includes every Bootstrap component. A DevTools panel uses maybe 10% of Bootstrap's CSS surface. PurgeCSS removes unused rules.

**Installation**:

```bash
npm install --save-dev purgecss-webpack-plugin glob
```

**Config** (add to `foe-info-webstore.config.js`):

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

## 4. Webpack Dev Config Issues

**File**: `webpack-dev.config.js`

### 4.1 Deprecated `devServer.contentBase`

**Severity**: MEDIUM

```javascript
// Current (deprecated in webpack-dev-server v4):
devServer: {
    contentBase: './build/' + PACKAGE_NAME,
},

// Fix (webpack-dev-server v4+):
devServer: {
    static: {
        directory: path.join(__dirname, 'build/' + PACKAGE_NAME),
    },
},
```

### 4.2 Inconsistent CSS Handling

```javascript
// Dev config CSS rules (inconsistent):
{
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],  // ← No postcss-loader
},
{
    test: /\.scss$/,
    use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],  // ← Has postcss
},
```

If `postcss.config.js` has autoprefixer (common), `.css` files won't get autoprefixed in dev mode but `.scss` files will. This inconsistency causes different CSS output between dev and prod.

**Fix**: Add `postcss-loader` to the `.css` rule.

### 4.3 Slow Source Maps

```javascript
// Current:
devtool: 'inline-source-map',  // ← Slowest rebuild: full source maps inlined

// Recommended for faster rebuilds:
devtool: 'eval-cheap-module-source-map',  // 10x faster, still debuggable
```

### 4.4 No Hot Module Replacement

The dev config uses `--watch` flag (via npm script) rather than HMR. Since this is a Chrome Extension (not a web app), HMR has limited applicability (extension pages need manual reload after rebuild). The watch approach is appropriate.

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

| Priority | Issue | File | Action | Effort |
| ------------ | --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------- | ------------------------ | ------ |
| **CRITICAL** | TerserPlugin dead config (`format: null` overwrites `format: {}`) | `foe-info-webstore.config.js` | Consolidate to single `format: { comments: false }` | 5 min |
| **HIGH** | No `splitChunks` — Bootstrap/jQuery duplicated in all entry chunks | `foe-info-webstore.config.js` | Add `optimization.splitChunks` + `runtimeChunk: 'single'` | 1 hr |
| **HIGH** | No PurgeCSS — full Bootstrap 5 CSS (518 KiB) in bundle | `foe-info-webstore.config.js` | Add `purgecss-webpack-plugin` | 2 hrs |
| **HIGH** | `file-loader` deprecated | Both configs | Migrate to Webpack 5 Asset Modules (`type: 'asset/resource'`) | 30 min |
| **HIGH** | `sass` + `sass-loader` in `dependencies` instead of `devDependencies` | `package.json` | Move to `devDependencies` | 5 min |
| **HIGH** | No ESLint | project root | Add ESLint with `no-var`, `prefer-const`, `no-unused-vars` | 2 hrs |
| **HIGH** | Wire `webpack-bundle-analyzer` | `package.json` + `mise.toml` | Add `analyze` script: `webpack ... --profile --json           | webpack-bundle-analyzer` | 30 min |
| **MEDIUM** | `devServer.contentBase` deprecated | `webpack-dev.config.js` | Update to `devServer.static.directory` | 5 min |
| **MEDIUM** | Inconsistent postcss-loader in dev CSS rules | `webpack-dev.config.js` | Add `postcss-loader` to `.css` rule | 5 min |
| **MEDIUM** | Slow `inline-source-map` devtool | `webpack-dev.config.js` | Switch to `eval-cheap-module-source-map` | 2 min |
| **MEDIUM** | No `optimization.runtimeChunk` | `foe-info-webstore.config.js` | Add `runtimeChunk: 'single'` | 2 min |
| **LOW** | 5 separate `CopyPlugin` calls | `foe-info-webstore.config.js` | Merge into one `patterns` array | 10 min |
| **LOW** | `verbose: true` on `CleanWebpackPlugin` | Both configs | Set `verbose: false` | 2 min |
| **LOW** | Unused `webpack-dev-middleware` dependency | `package.json` | `npm uninstall webpack-dev-middleware` | 2 min |
| **LOW** | Redundant mise.toml / npm scripts duplication | `mise.toml` | Keep mise.toml as canonical, remove npm script duplicates | 15 min |

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
run = "npx webpack --config foe-info-webstore.config.js --profile --json > build/stats.json && npx webpack-bundle-analyzer build/stats.json"

[tasks.test]
description = "Run unit tests"
run = "npx vitest run"
```
