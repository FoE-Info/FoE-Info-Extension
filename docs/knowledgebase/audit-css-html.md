# CSS & HTML Audit

**Verified**: 2026-08-14 against `src/css/**` and `src/chrome/*.html` via the
`css-expert` and `html-expert` subagents.

## Confirmed findings

### P1: Undefined custom properties silently fall back to `transparent`

`custom.scss:14-15` references `--color-text-primary`/`--color-background` custom
properties that are never defined anywhere (e.g. `:root`). No build error — the
property silently falls back to `transparent`.

### P1: No `<body>` element in HTML templates

`panel.html` and `devtools.html` have no `<body>` element. This only works today
because `HtmlWebpackPlugin` falls back to injecting bundles into `<head>`. Any new
template should include an explicit `<body>`.

### P2: Invalid CSS silently dropped

`custom.scss:136,142` uses `fw: bold` (not a real property) and `custom.scss:286` uses
`float: center` (not a valid keyword value) — both silently dropped by the parser with
no build-time warning. Double-check property names/values compile before assuming new
rules take effect.

### P2: Hardcoded colors bypass design tokens

`custom.scss` has drifted into a lot of hardcoded hex colors that bypass the existing
`_variables.scss`/Bootstrap tokens. Use the tokens (or Bootstrap's own variables)
instead of adding more hardcoded values.

### P2: Dead CSS

Roughly 44% of `custom.scss` (lines ~397-680) is commented-out dead styles. If
replacing dead styles, delete them rather than commenting out more.

### P2: `options.html` accessibility and i18n gaps

- No `<fieldset>`/`<legend>` grouping; jumps straight to `<h6>` with no heading
  hierarchy across 11 sections, zero `<h1>`-`<h5>`.
- The only page with no `data-i18n` coverage — if touched, match the pattern used in
  `panel.html`/`popup.html` rather than leaving new strings hardcoded.

## What's solid

- `main.scss`/`options.scss` cleanly separate the two Webpack entry stylesheets;
  Bootstrap + jQuery are the only styling/DOM stack (no framework sprawl).
- Sass modules compile cleanly with no build-time warnings surfaced by the compiler
  itself — the invalid-CSS findings above are silent by nature, not flagged failures.
