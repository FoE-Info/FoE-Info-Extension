# CSS & HTML Audit

**Verified**: 2026-08-08 against `src/css/`, `src/chrome/*.html`, the generated
production HTML, and the production CSS bundles.

## Executive summary

The Sass pipeline compiles successfully and the static options controls use native
form elements. The largest concerns are accessibility of click-only custom controls,
incomplete document structure in three extension shells, and the cost of compiling
all of Bootstrap into both CSS entry points.

The previous version of this audit described code that is no longer present. In the
current tree:

- Bootstrap is 5.3.8, not 5.3.3.
- `main.scss` uses Sass modules and does not contain a second
  `.bootstrap-styles { @import ... }` bundle.
- `popup.html` has flat, valid alignment selectors and its logo has alt text.
- `options.html` already has `lang`, charset, viewport, and a title.
- `panel.html` already has `lang`, charset, viewport, and a title.

## Current stylesheet architecture

| Source            | Consumer               | Contents                                                        |
| ----------------- | ---------------------- | --------------------------------------------------------------- |
| `main.scss`       | DevTools panel (`app`) | Bootstrap plus `custom.scss`                                    |
| `options.scss`    | Options page           | Bootstrap plus three small layout rules                         |
| `custom.scss`     | `main.scss`            | Panel-specific colors, sizing, overflow, icon, and layout rules |
| `_variables.scss` | None                   | Unused legacy Bootswatch/Darkly 4.5.2 variables                 |

`main.scss` and `custom.scss` both `@use` Bootstrap, but Sass's module system loads a
module once per compilation. The measured production `app.css` is 237,270 bytes,
which is consistent with one uncompressed Bootstrap build plus project rules—not the
518 KiB duplicate previously documented. `options.css` is 234,124 bytes because it
also compiles the full framework.

`_variables.scss` is not referenced by any Sass entry. Its Bootstrap 4-era variables
therefore do not theme the current build at all. Either remove it as dead historical
configuration or migrate it to Bootstrap 5.3 variables and load it before Bootstrap
with `@use ... with (...)`.

## Findings

### High: custom controls are mouse-only

`popup.html` uses the `#go-to-options` SVG itself as a click target. The panel also
generates collapse, copy, post, settings, and debug controls as `<span>`, `<p>`, or
`<img>` elements and attaches click listeners. These elements have no native button
semantics, accessible name, keyboard activation, or reliable focus indicator.

The most concentrated source is `src/js/fn/AddElement.js`, which emits clickable
material-icon spans. Bootstrap collapse attributes do not add button semantics.
Replace action spans and paragraphs with `<button type="button">`; keep decorative
icons `aria-hidden="true"`, and maintain `aria-expanded`/`aria-controls` on disclosure
buttons.

### High: extension shell structure is incomplete

| Template        | Current issue                                                                  |
| --------------- | ------------------------------------------------------------------------------ |
| `devtools.html` | No `lang`, charset, title, or explicit body                                    |
| `panel.html`    | No explicit body; all visible content depends on successful JavaScript startup |
| `popup.html`    | No source doctype, charset, viewport, or title                                 |
| `options.html`  | No `<main>`/`<form>` landmark and no page-level heading                        |

Browsers and HtmlWebpackPlugin repair some omitted structure, but the source remains
harder to validate and the empty panel has no usable failure state when JavaScript
does not initialize.

### High: options-page hierarchy and status feedback are weak

The options page begins with repeated `<h6>` card headers and has no `<h1>`. Grouped
settings are visually card-like but are not represented with `fieldset`/`legend` or
another semantic grouping pattern. Labels wrap controls, which is valid HTML, but
explicit `for`/`id` associations are more robust across assistive technology.

`#status` contains the Save button but is not a live region, and `options.js` does not
provide a visible or announced success/failure result. Add a page heading, meaningful
section hierarchy, explicit control labels, and a separate `aria-live="polite"`
status node. Add `type="text"` explicitly to `donationSuffix`, `targetText`, and
`targets`.

### Medium: CSS lacks a coherent accessibility layer

- There are no project-defined `:focus-visible` rules.
- Hover styling such as `.copy:hover` has no matching focus state.
- There is no `prefers-reduced-motion` policy for Bootstrap/custom transitions.
- `body { font-size: 0.8em; }` and 12 px icon classes create small targets/text.
- Absolute-positioned action controls and a fixed `25em × 15em` container are brittle
  under zoom and narrow DevTools layouts.
- `.container { overflow: hidden; }` can clip content at 200% zoom.
- There are no project media or container queries.

Add a small shared accessibility layer before visual redesign: visible focus rings,
focus parity for hover states, minimum 24×24 CSS pixel pointer targets (prefer 44×44
where the panel permits), zoom-safe overflow, and reduced-motion overrides.

### Medium: remote icon fonts are render-blocking

`panel.html` loads two Google Fonts stylesheets for Material Icons/Symbols. This adds
network and privacy dependencies to a local extension page and can leave controls
without understandable glyphs offline. Prefer bundled SVGs or self-hosted font files.
If fonts remain, consolidate to one family and provide text-accessible control names.

### Medium: invalid or ineffective declarations remain

- `panel.html` and `custom.scss` use `fw: bold`; the browser ignores it. Use
  `font-weight`.
- `.cell { float: center; }` is invalid. Use grid/flex alignment or a valid float.
- `var(--color-text-primary)` and `var(--color-background)` have no definitions in
  the repository. They fall back to inherited/transparent behavior.
- `custom.scss` contains a large commented historical block. Version control is the
  better archive.

### Low: panel-only markup includes an irrelevant web manifest link

`panel.html` links the extension manifest with `rel="manifest"`. A DevTools panel is
not a PWA document; remove this link unless a tested browser behavior requires it.

## Generated HTML validation

`html-validate` reported 67 findings against the four production pages. Many are
repository-style policy findings introduced or preserved by minification—lowercase
doctype, self-closing void elements, and `defer="defer"`—rather than browser parsing
failures. Actionable source findings include the missing shell metadata/body/title,
three implicit text input types, and inline styles. Configure an HTML validator in
the repository so generated-code style rules can be separated from semantic rules.

## Prioritized remediation

| Priority | Action                                                                                                    | Primary files                                                   |
| -------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| P0       | Replace click-only spans, paragraphs, images, and SVGs with named buttons                                 | `popup.html`, `index.js`, `fn/AddElement.js`, message renderers |
| P0       | Add explicit document structure and a non-JavaScript panel failure state                                  | `devtools.html`, `panel.html`, `popup.html`                     |
| P1       | Add a real heading/grouping structure and announced save result                                           | `options.html`, `options.js`                                    |
| P1       | Add focus-visible, zoom-safe, and reduced-motion styles                                                   | `custom.scss`, `options.scss`                                   |
| P1       | Bundle or replace remote icon fonts                                                                       | `panel.html`, Webpack assets                                    |
| P2       | Remove or activate/migrate unused `_variables.scss`                                                       | `src/css/_variables.scss`                                       |
| P2       | Reduce CSS by importing only used Bootstrap components; safelist all runtime-generated classes if purging | Sass entries, Webpack                                           |
| P2       | Move inline styles into Sass and remove invalid declarations                                              | HTML templates, `custom.scss`                                   |

## Verification record

```text
npm run check       PASS
npm run build       PASS with 3 Webpack performance warnings
html-validate       67 findings; see qualification above
app.css             237,270 bytes
options.css         234,124 bytes
```

This was a static and build audit. Keyboard, screen-reader, zoom, contrast, and
DevTools-panel behavior still require browser testing before accessibility claims can
be closed.
