# CSS & HTML Audit

**Source Files**: `src/css/`, `src/chrome/*.html`, `src/js/fn/globals.js`, `src/js/fn/collapse.js`

---

## 1. CSS Architecture Overview

The extension uses Bootstrap 5.3.3 (Bootswatch Darkly dark theme variant) with a custom SCSS layer. Styles are compiled by `sass-loader` + `postcss-loader` in the Webpack pipeline and extracted to `app.css` via `MiniCssExtractPlugin`.

```
src/css/
├── _variables.scss     ← Bootswatch Darkly v4 variable overrides (Bootstrap 4 names!)
├── custom.scss         ← Project-specific overrides (mostly commented out)
├── main.scss           ← Entry point: imports Bootstrap + custom
└── options.scss        ← Options page styles
```

**Entry chain** (`index.js` → `main.scss`):

```scss
@import 'bootstrap/scss/bootstrap'; // Full Bootstrap 5 (~518 KiB CSS)
@import 'custom.scss';

.bootstrap-styles {
  @import 'bootstrap/scss/bootstrap'; // ⚠️ DUPLICATE — imported a second time
  @import 'custom.scss';
}
```

> [!CAUTION]
> Bootstrap is imported **twice** in main.scss. The `.bootstrap-styles` wrapper has no consumers anywhere in the codebase and doubles the CSS output unnecessarily. This contributes ~260 KiB of duplicate CSS to the 518 KiB bundle.

---

## 2. SCSS Organization & Bootstrap Integration

### 2.1 `_variables.scss` — Bootstrap 4 Variable Names in a Bootstrap 5 Project

**Severity**: HIGH

`_variables.scss` contains the Bootswatch Darkly theme using Bootstrap **4.5.2** variable conventions, applied to a Bootstrap **5.3.3** compilation:

| BS4 Variable                                       | BS5 Replacement          | Status                               |
| -------------------------------------------------- | ------------------------ | ------------------------------------ |
| `$yiq-contrasted-threshold`                        | `$min-contrast-ratio`    | ❌ Renamed — may be silently ignored |
| `$jumbotron-bg`                                    | Jumbotron removed in BS5 | ❌ No-op                             |
| `$close-color` / `$close-text-shadow`              | Renamed to `.btn-close`  | ❌ No-op                             |
| `$custom-file-color` / `$custom-file-border-color` | Removed in BS5           | ❌ No-op                             |

**Impact**: Several theme variable overrides are silently ignored by Bootstrap 5, meaning the intended dark theme customizations may not fully apply. The 45 Webpack build warnings (Sass deprecation) partly originate from these cross-version incompatibilities.

**Recommendation**: Migrate `_variables.scss` to Bootstrap 5 variable names. Bootstrap 5 migration guide: https://getbootstrap.com/docs/5.3/migration/

### 2.2 Sass Deprecation Warnings

**Severity**: MEDIUM

The Webpack build produces 45 warnings, all originating from Bootstrap's internal Sass using deprecated functions:

- `green()`, `blue()` color functions → migrate to `color.channel()` (Sass color module)
- `darken()`, `lighten()` → migrate to `color.adjust()`
- `if()` with non-boolean → tightened in Sass 1.85+

**Root cause**: Bootstrap 5.3.3 + Sass 1.85.0 compatibility gap. Bootstrap 5.3.x uses BS5 Sass that predates Sass's stricter deprecation enforcement.

**Short-term fix**: Pin `sass` to `^1.77.0` in `package.json` until Bootstrap 5.4+ resolves the upstream issues.

**Long-term**: Update to Bootstrap 5.4+ when available, or switch to Sass 2.x-compatible syntax.

### 2.3 `custom.scss` — Mostly Dead Code

**Severity**: LOW

`custom.scss` contains ~200 lines of commented-out CSS that was historically used. Active declarations are minimal. The file primarily serves as a historical archive.

**Recommendation**: Delete the commented-out code and move any active overrides inline. Use version control for history.

---

## 3. `panel.html` Audit

**File**: `src/chrome/panel.html`

### 3.1 Missing `<body>` Element

**Severity**: CRITICAL

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    ...
    <style type="text/css">
      ...
    </style>
    <script type="module" src="browser-polyfill.js"></script>
  </head>
</html>
```

**panel.html has no `<body>` element.** All dynamic content (panels, tables, stats cards) is injected via `innerHTML` directly into DOM nodes that services hold references to. These nodes must already exist at panel load. Without a `<body>`, browsers auto-generate one, but the extension relies on JavaScript-injected content into pre-existing containers.

> [!WARNING]
> The panel.html body is not explicit. All panels are created at runtime via JavaScript `innerHTML` mutation. There is no static scaffold. This means no content is visible until JavaScript executes completely.

### 3.2 Inline CSS Duplication

**Severity**: HIGH

```html
<style type="text/css">
  .copy {
    color: green;
  }
  .copy:hover {
    background-color: #4caf50;
    color: white;
  }
  .notice {
    color: red;
    fw: bold;
    display: table-cell;
    padding: 0px 5px;
  }
  .table {
    padding-bottom: 1px;
  }
  .table > tbody > tr > td {
    padding-top: 1px;
    padding-bottom: 1px;
    border-top: 0;
  }
</style>
```

Issues:

1. `.copy` and `.notice` rules are already defined in the custom.scss (commented out) — this is the inline duplicate
2. `fw: bold` is **not a valid CSS property** (should be `font-weight: bold`)
3. Overrides Bootstrap `.table` padding — should be in `custom.scss` with higher specificity

**Recommendation**: Move all inline styles to `src/css/custom.scss` and fix `fw:` → `font-weight:`.

### 3.3 External CDN Font Loading

**Severity**: MEDIUM

```html
<link
  href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
  rel="stylesheet"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:..."
/>
```

**Problems**:

- Requires network access when the DevTools panel opens — fails offline
- Two separate CDN roundtrips for icon fonts
- Render-blocking — panel content invisible until fonts CSS resolves
- Chrome Extension CSP implications: not blocked by current CSP (`script-src 'self'`) since these are stylesheets, but adds external dependency

**Recommendation**: Install `@material-symbols/font-300` npm package and import locally:

```javascript
// In index.js
import '@material-symbols/font-300/outlined.css';
```

### 3.4 Missing `lang` Attribute

**Severity**: MEDIUM (a11y)

```html
<html>
  <!-- Should be: <html lang="en"> -->
</html>
```

All four HTML pages are missing the `lang` attribute on `<html>`. Required by WCAG 2.1 SC 3.1.1.

### 3.5 Manifest Link in `<head>`

```html
<link rel="manifest" href="<%= htmlWebpackPlugin.options.manifest %>" />
```

This `<link rel="manifest">` in `panel.html` will inject a web app manifest reference at build time. In a Chrome DevTools panel context, the Web App Manifest is irrelevant (DevTools panels cannot be installed as PWAs). Remove.

---

## 4. `options.html` Audit

**File**: `src/chrome/options.html`

### 4.1 Heading Hierarchy

**Severity**: MEDIUM

All section headers use `<h6>`:

```html
<h6 class="card-header">Great Buildings</h6>
<h6 class="card-header">Guild Battleground</h6>
```

`<h6>` is the lowest semantic heading level. In a document with no `<h1>`–`<h5>`, this is a heading hierarchy violation. All section headers should be `<h2>` styled to look like card headers.

### 4.2 Label/Input Association

**Severity**: MEDIUM (a11y)

```html
<label>
  Show Great Buildings
  <input type="checkbox" id="GB" />
</label>
```

The wrapper `<label>` pattern is accessible (wrapping = implicit association), but missing `for=` attribute means:

- Screen readers may announce checkbox purpose differently across assistive technology
- Recommended: `<label for="GB">Show Great Buildings</label><input type="checkbox" id="GB" />`

### 4.3 Missing Meta Tags

```html
<!-- Missing in options.html: -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<html lang="en"></html>
```

The options page has none of these required tags. Added by Webpack HtmlWebpackPlugin's `meta` option only in the production webstore config — not in dev config.

---

## 5. `popup.html` Audit

**File**: `src/chrome/popup.html`

### 5.1 Broken CSS Nesting Syntax

**Severity**: CRITICAL

```html
<style type="text/css">
  .align-right {
    text-align: right;
    .align-left {           /* ← Invalid pre-CSS-Nesting syntax */
      text-align: left;
      .align-center {       /* ← Invalid pre-CSS-Nesting syntax */
        text-align: center;
      }
```

CSS nesting (`.parent { .child {} }`) requires Chrome 112+ and the `@layer` or `&` prefix syntax in standard CSS. This syntax is **incorrect** in a `<style>` tag:

- `.align-left` inside `.align-right` is **not** CSS nesting — it's invalid CSS
- Browsers parse this as `.align-right .align-left` (descendant combinator) or silently drop rules

**Result**: The alignment classes on the popup page **do not apply**.

**Fix**: Remove the nesting and write flat CSS:

```css
.align-right {
  text-align: right;
}
.align-left {
  text-align: left;
}
.align-center {
  text-align: center;
}
```

### 5.2 Missing `alt` on `<img>`

**Severity**: HIGH (a11y)

```html
<img width="200" src="icons/logo90.png" />
```

Missing `alt` attribute. Should be `alt="FoE-Info logo"` or `alt=""` if decorative.

---

## 6. `devtools.html` Audit

```html
<!doctype html>
<html>
  <head>
    <script type="module" src="browser-polyfill.js"></script>
  </head>
</html>
```

This is an intentionally minimal shell — its sole purpose is to load `devtools.js` which calls `browser.devtools.panels.create()`. The missing `<html lang>`, `<meta charset>`, `<body>` are acceptable for this shell page, but a `<meta charset="UTF-8">` is recommended.

---

## 7. Panel Height Management — `globals.js` Critique

**File**: `src/js/fn/globals.js`

**Current pattern** (repeated 12 times):

```javascript
export function setArmySize(h) {
  document.getElementById('armyCollapse').style.height = h + 'px';
  storage.set('armySize', h);
}
```

**Issues**:

1. **Direct `style.height` mutation** bypasses CSS layout — no smooth transitions possible
2. Values set in pixels, not responsive to panel zoom or font-size scaling
3. No `min-height`/`max-height` enforcement in JS — can be set to 0 or negative

**Recommended: CSS Custom Properties + `clamp()`**:

```css
/* In custom.scss */
.panel-collapse {
  height: var(--panel-height, auto);
  min-height: var(--panel-min-height, 50px);
  max-height: var(--panel-max-height, 800px);
  transition: height 150ms ease;
  overflow-y: auto;
}
```

```javascript
// In globals.js
export function setArmySize(h) {
  const el = document.getElementById('armyCollapse');
  const clamped = Math.max(50, Math.min(h, 2000));
  el.style.setProperty('--panel-height', `${clamped}px`);
  storage.set('armySize', clamped);
}
```

---

## 8. Accessibility (a11y) Gaps

| Issue                                            | Location           | WCAG Criterion | Severity |
| ------------------------------------------------ | ------------------ | -------------- | -------- |
| No `lang` attribute on `<html>`                  | All 4 HTML files   | SC 3.1.1       | MEDIUM   |
| No `aria-expanded` on collapse triggers          | `fn/AddElement.js` | SC 4.1.2       | HIGH     |
| No `aria-controls` linking trigger to panel      | `fn/AddElement.js` | SC 4.1.2       | HIGH     |
| Material Icons without `aria-hidden="true"`      | `fn/AddElement.js` | SC 1.1.1       | MEDIUM   |
| Missing `alt` on popup logo image                | `popup.html`       | SC 1.1.1       | HIGH     |
| Invalid `fw: bold` CSS (not bold text)           | `panel.html`       | SC 1.4.3       | LOW      |
| No focus-visible styles for keyboard nav         | `custom.scss`      | SC 2.4.7       | MEDIUM   |
| Checkbox labels use wrapping pattern (no `for=`) | `options.html`     | SC 1.3.1       | LOW      |

---

## 9. CSS Bundle Size Analysis

| Source                                          | Approx. Size | Issue                                                        |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------ |
| Bootstrap 5 (1st import)                        | ~260 KiB     | ~70% unused in DevTools panel context                        |
| Bootstrap 5 (2nd import in `.bootstrap-styles`) | ~260 KiB     | **Completely unused** — `.bootstrap-styles` has no consumers |
| Custom overrides                                | < 1 KiB      | Active                                                       |
| Total app.css                                   | **518 KiB**  | —                                                            |

**Quick win**: Removing the `.bootstrap-styles` duplicate import immediately saves **~260 KiB** and reduces app.css from 518 KiB to ~260 KiB with zero behavior change.

**Bigger win**: Add PurgeCSS — a DevTools panel uses only a fraction of Bootstrap components (cards, tables, collapse, popovers, badges). PurgeCSS would reduce the remaining ~260 KiB to an estimated **20–40 KiB**.

---

## 10. Recommended Improvements (Prioritized)

| Priority     | Issue                                                      | File                          | Action                                                  |
| ------------ | ---------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| **CRITICAL** | Bootstrap imported twice in main.scss                      | `src/css/main.scss`           | Remove the entire `.bootstrap-styles { ... }` block     |
| **CRITICAL** | Broken CSS nesting in popup.html `<style>`                 | `src/chrome/popup.html`       | Flatten `.align-right/left/center` to top-level rules   |
| **HIGH**     | Bootstrap 4 variable names in BS5 project                  | `src/css/_variables.scss`     | Migrate variable names to BS5 equivalents               |
| **HIGH**     | Add `aria-expanded` + `aria-controls` to collapse triggers | `src/js/fn/AddElement.js`     | Update `fAddCollapseIcon()` to include ARIA attributes  |
| **HIGH**     | Add `aria-hidden="true"` to all icon elements              | `src/js/fn/AddElement.js`     | Add to all `<i class="material-icons...">` elements     |
| **HIGH**     | Add `alt` to popup logo `<img>`                            | `src/chrome/popup.html`       | Add `alt="FoE-Info logo"`                               |
| **HIGH**     | Add `lang="en"` to all `<html>` elements                   | All 4 HTML files              | Add lang attribute                                      |
| **HIGH**     | Add PurgeCSS plugin to Webpack                             | `foe-info-webstore.config.js` | Install `purgecss-webpack-plugin`, configure for `src/` |
| **MEDIUM**   | Move inline CSS out of panel.html                          | `src/chrome/panel.html`       | Migrate to `custom.scss`                                |
| **MEDIUM**   | Fix `fw: bold` typo                                        | `src/chrome/panel.html`       | Change to `font-weight: bold`                           |
| **MEDIUM**   | Replace CDN fonts with local npm package                   | `src/chrome/panel.html`       | `npm install @material-symbols/font-300`                |
| **MEDIUM**   | Migrate height setters to CSS custom properties            | `src/js/fn/globals.js`        | Use `el.style.setProperty('--panel-height', ...)`       |
| **LOW**      | Remove `<link rel="manifest">` from panel.html             | `src/chrome/panel.html`       | Not applicable to DevTools panels                       |
| **LOW**      | Delete commented-out code in custom.scss                   | `src/css/custom.scss`         | Delete ~200 lines of dead CSS                           |
