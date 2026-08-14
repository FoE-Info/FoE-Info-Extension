# CSS & HTML Audit

**Verified**: 2026-08-14 against src/css/main.scss, src/css/options.scss, src/css/custom.scss, src/css/_variables.scss, and src/chrome/*.html templates (panel.html, options.html, popup.html, devtools.html).

## Confirmed findings

### P0: Debug rainbow colors override a live, currently-rendered icon

`src/css/custom.scss:57-66`:

```scss
.bi-tools {
  color: red;
  stroke: green;
  fill: blue;
}
```

This is not dead code — `src/chrome/popup.html:32-44` renders the "go to options"
toolbar icon as `<svg id="go-to-options" class="bi bi-tools" fill="currentColor" ...>`.
The SVG was authored to inherit its color via `fill="currentColor"` + CSS `color`, but
`.bi-tools` sets `fill: blue` directly as a CSS property, which wins over the
`fill="currentColor"` presentation attribute in the cascade, and `color: red` recolors
anything that does key off `currentColor`. Net effect: the popup's options icon
currently renders blue-filled with a green stroke instead of a normal monochrome icon.
`OtherPlayerService.js:991` shows a second, currently-commented-out `bi-tools` usage,
confirming this class was meant for a single coherent icon style, not literal
red/green/blue debug values.
**Fix**: replace the three declarations with a single intentional color (or delete the
rule and let `fill="currentColor"` + inherited `color` do the work).

### P1: Undefined custom properties silently fall back to `transparent`/inherited

`src/css/custom.scss:14-15`:

```scss
color: var(--color-text-primary);
background: var(--color-background);
```

No `:root` block (or any selector) defining `--color-text-primary` or
`--color-background` exists anywhere in `src/` — confirmed via repo-wide grep, the only
other `--color-*`/`--nord*` references in the file are commented out (`custom.scss:4-5,
19-20`). Per the CSS custom-property spec, an unresolved `var()` with no fallback makes
the declaration invalid at computed-value time: `background` (a shorthand whose
`background-color` longhand initial value is `transparent`) genuinely renders
transparent, exposing whatever is behind the panel body; `color` (an inherited
property) falls back to the inherited/initial value instead, not literally to
"transparent" text.
**Fix**: define both custom properties in a `:root` block (light/dark values), or
replace the two lines with literal Bootstrap/`_variables.scss` tokens.

### P1: `_variables.scss` is never imported — the whole Bootstrap override file is dead

`src/css/_variables.scss` (191 lines of Bootswatch "Darkly" color/font/component
variable overrides) is not referenced by anything that actually builds:

- `src/css/main.scss:1-2` only does `@use 'bootstrap/scss/bootstrap' as *;` and
  `@use 'custom.scss';`.
- `src/css/options.scss:1` only does `@use 'bootstrap/scss/bootstrap' as *;` (and
  doesn't even pull in `custom.scss`).
- `webpack.dev.js:24-30` and `webpack.prod.js:46-52` configure `sass-loader` with only
  `sassOptions: { quietDeps: true }` — no `additionalData`/`prependData` that would
  inject `_variables.scss` globally.
- A repo-wide grep for `_variables`/`variables.scss` outside `src/css/CLAUDE.md`'s own
  prose returns nothing.

So none of the `$blue`, `$body-bg`, `$card-bg`, pagination/dropdown/modal token
overrides in `_variables.scss` ever reach the compiled CSS — the build compiles stock
Bootstrap 5.3.8 defaults instead of the intended Darkly theme. This also means the
`src/css/CLAUDE.md` instruction to "use `_variables.scss` tokens... instead of
hardcoding hex values" currently has no compiled effect to point to, which compounds
the hardcoded-color finding below.
**Fix**: `@use '_variables.scss' as *;` (with a variable-override forward, per
Bootstrap's Sass customization pattern) before `@use 'bootstrap/scss/bootstrap' as *;`
in `main.scss` and `options.scss`, or confirm the file is intentionally retired and
delete it.

### P1: Hardcoded colors bypass design tokens

`custom.scss` has drifted into many literal hex/rgb colors instead of Bootstrap or
(the currently-unused) `_variables.scss` tokens, e.g.: `.favorite-btn` background
`#3d1472` (`custom.scss:91`), `.gvg-warn` `#808000` (`custom.scss:86`), the
`.alert-error`/`.alert-indigo`/`.bg-indigo`/`.alert-light`/`.alert-grey` blocks
(`custom.scss:103-131`), `.green`/`.red`/`.invest-*` (`custom.scss:133-158`),
`.button-container` border `rgb(111, 41, 97)` (`custom.scss:260`), the scrollbar rules
`#f1f1f1`/`#888`/`#555` (`custom.scss:345,351,358`), and the Material Icons `rgba(...)`
opacity rules (`custom.scss:383,386,391,394`). Don't add more; route new colors through
Bootstrap variables (once `_variables.scss` is actually wired in — see above).

### P1: Invalid CSS silently dropped, breaking the intended styling

- `custom.scss:136` and `custom.scss:142` — `fw: bold;` inside `.green`/`.red`. `fw` is
  not a CSS property (should be `font-weight: bold;`). The parser drops it silently, so
  the bold styling these classes were clearly meant to apply never happens — no build
  error, no visual bold text.
- `custom.scss:286` — `.cell { float: center; }`. `center` is not a valid `float`
  keyword (only `left`/`right`/`none`/`inline-start`/`inline-end`/`inherit` are), so
  this declaration is dropped and `.cell` never floats/centers as intended.

Confirmed no build-time signal for either: compiling `main.scss` directly with `sass`
(with `--quiet-deps`, isolating warnings to the repo's own files) produced zero
warnings — invalid property names/values are silently accepted by the Sass compiler
and only dropped later by the CSS parser at runtime.

### P2: Large commented-out dead-style block

`custom.scss:397-681` (roughly 285 of the file's 681 lines, ~42%) is a commented-out
block that duplicates/shadows nearly every live rule above it. Per `src/css/CLAUDE.md`,
don't add to it — delete dead styles instead of commenting out more.

### P2: `.dark-mode` class is unreachable dead code

`custom.scss:18-24` defines `.dark-mode { background-color: rgb(41 42 45); }` (with the
`color`/`background` lines commented out). The only code that ever toggled this class,
`src/js/index.js:242`, is itself commented out
(`// newelement.classList.toggle("dark-mode");`). Nothing in the current codebase adds
`.dark-mode` to any element, so this rule never applies.

### P1: `panel.html`'s own inline `<style>` block repeats the `fw: bold;` bug independently of custom.scss

`src/chrome/panel.html:26-31`:

```html
.notice {
  color: red;
  fw: bold;
  display: table-cell;
  padding: 0px 5px;
}
```

This is a second, independent occurrence of the invalid-property bug already flagged in
`custom.scss:136,142` above — `fw` is not a CSS property (should be `font-weight: bold;`),
so it's silently dropped by the CSS parser and `.notice` elements render red but never
bold. Because this rule lives in `panel.html`'s own inline `<style>` tag rather than in
compiled Sass, fixing the `custom.scss` instances would not fix this one — they're
separate declarations in separate files that happen to share the same typo.
**Fix**: change `fw: bold;` to `font-weight: bold;` at `panel.html:28`.

### P1: Static HTML templates have zero `data-i18n` coverage — `src/CLAUDE.md:16`'s "match panel.html/popup.html" guidance points at nothing in those files

A repo-wide grep for `data-i18n` (`grep -rn "data-i18n" src/`) confirms every one of the
~90 matches lives in JS-generated markup — `src/js/msg/*Service.js` (GreatBuildingsService.js
alone has 24), `src/js/index.js` (13), `src/js/fn/AddElement.js`, `src/js/fn/helper.js`,
`ClanBattleService.js`, `BonusService.js`, `ResourceService.js`, `GuildBattlegroundService.js`,
`OtherPlayerService.js` — and **none** appear in `src/chrome/panel.html`,
`src/chrome/options.html`, `src/chrome/popup.html`, or `src/chrome/devtools.html`
themselves. `panel.html` has no `data-i18n` to match because it has no `<body>` — all of
its content is injected by JS at runtime (where the `data-i18n` attributes above actually
live), so "the pattern used in panel.html" from `src/CLAUDE.md:16` isn't something visible
in that file at all. More concretely, `popup.html:24-28`'s static instructional text
("How to activate:", "Ctrl+Shift+I (Win/Linux)", "Right-Click, then select Inspect",
"Browser Menu > More Tools > Developer Tools", "Click on tab >>") is hardcoded English with
no `data-i18n` attribute anywhere on it — the exact same untranslated-string gap already
documented for `options.html`, just undocumented for `popup.html`.
**Fix**: either correct `src/CLAUDE.md:16` to point at an actual JS-generated example
instead of the template files, or wrap `popup.html`'s static strings in `data-i18n`-tagged
spans and add corresponding `src/i18n/*.json` keys to match the pattern used elsewhere.

### P1: `popup.html`'s clickable options icon has no accessible name and isn't keyboard-operable

`src/chrome/popup.html:32-49` renders `<svg id="go-to-options" class="bi bi-tools" ...>`
as a bare, unwrapped `<svg>` element. `src/js/popup.js:16` attaches its only interactivity:
`document.querySelector('#go-to-options').addEventListener('click', function () {...})`,
which opens the extension's options page. The markup has no `role="button"`, no
`tabindex`, and no `aria-label`/`aria-labelledby`/`<title>` child — SVG elements are not
in the default browser focus order and have no accessible name by default, so a
keyboard-only user cannot tab to this control at all, and a screen-reader user who does
reach it (e.g., via touch exploration) hears nothing describing what it does. This
compounds the CSS lens's finding above that this same icon currently also renders
mis-colored.
**Fix**: wrap the SVG in a real `<button type="button" aria-label="Options">` (or add
`role="button" tabindex="0"` plus a keydown handler for Enter/Space if a wrapper element
isn't feasible), and give the SVG an accessible name via `aria-label` or a `<title>` child.

### P2: `devtools.html` is missing the `lang` attribute present on the other three templates

`src/chrome/devtools.html:2` — `<html>` with no `lang` attribute, while `panel.html:2` and
`options.html:2` both correctly declare `<html lang="en">`. `devtools.html` renders no
visible text of its own (its `<head>` is empty aside from whitespace), so this has no
user-facing effect today, but it's an inconsistency that would matter the moment any
content is ever added to this template, and fails HTML validation (WCAG 3.1.1 expects a
page-level language declaration).
**Fix**: add `lang="en"` to `devtools.html:2` for consistency with the other templates.

### P2: Heading levels skip straight to `<h6>`/`<h2>` with no `<h1>` anywhere

`src/chrome/options.html` uses `<h6 class="card-header">` for all eleven of its section
headers (e.g. `options.html:15,40,90,103,140,153,170,187,204,244,253`) with no `<h1>`
through `<h5>` present anywhere on the page — the heading level jumps straight from
nothing to `h6`. `src/chrome/popup.html:22` similarly opens directly at `<h2>` with no
`<h1>` before it. Skipped heading levels break the logical outline screen-reader users
rely on to navigate by heading (WCAG 1.3.1 "Info and Relationships" / 2.4.6 "Headings and
Labels" best practice), even though visually the `h6`-as-section-header styling looks
intentional (small, bold card headers).
**Fix**: not urgent given the small size of these pages, but if either template is
reworked, start from `<h1>` (page title) and step down one level at a time rather than
jumping to `h6`.

## What's solid

- `main.scss` and `options.scss` cleanly separate the two Webpack entry stylesheets
  (confirmed via `src/js/index.js:76` importing `main.scss` and
  `src/js/options.js:15` importing `options.scss`); Bootstrap + jQuery are the only
  styling/DOM stack, no framework sprawl.
- Compiling `main.scss` with `sass --load-path=node_modules --quiet-deps` succeeds with
  no errors and produces valid output CSS (~283KB unminified) — the invalid-CSS and
  undefined-custom-property findings above are silent-by-design gaps, not build
  failures.
- Modern `@use` module syntax is used consistently in both entry stylesheets, avoiding
  global-namespace Sass import pollution in the (small) amount of code that does load.
- All four `src/chrome/*.html` templates (`panel.html`, `devtools.html`, `options.html`,
  `popup.html`) were checked for inline `on*=` event-handler attributes and inline
  `<script>` tags — none exist in any of them, confirmed by reading each file in full.
  This matches the manifest's `content_security_policy.extension_pages: "script-src
  'self' ; object-src 'self'"` (`src/chrome/manifest.json:44`) and the `script-src 'self'`
  invariant documented in `src/chrome/CLAUDE.md:6` — verified from the HTML side, not just
  the manifest side.
- `options.html` gives every one of its ~30 checkboxes/text/number/url inputs a correctly
  associated label: all but one are implicit (input nested inside `<label>...</label>`,
  e.g. `options.html:17-20`), and the one `<select id="language">` uses an explicit
  `<label for="language">` (`options.html:255-256`) that correctly matches the `id`. No
  unlabeled form control was found in this file.
- `popup.html:19`'s `<img src="icons/logo90.png">` has a descriptive `alt="FoE-Info logo"`
  attribute — the one meaningful image across the four templates is not missing alt text.
- `src/chrome/CLAUDE.md:13`'s claim that `panel.html`/`devtools.html` have no `<body>`
  element (relying on `HtmlWebpackPlugin`'s fallback of injecting bundles into `<head>`)
  is re-confirmed accurate from this pass too — both files end at `</head></html>` with no
  `<body>` tag. This is already tracked in detail in `docs/knowledgebase/audit-chrome-devtools.md`,
  not re-litigated as a separate finding here.
