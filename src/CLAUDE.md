# src/** — Source Instructions

## Build

- Entries are defined in `webpack.common.js`: `app` (`src/js/index.js`), `options`, `devtools`, `popup`.
- `HtmlWebpackPlugin` generates `panel.html`, `options.html`, `popup.html`, `devtools.html` from templates in `src/chrome/`.
- `CopyPlugin` copies `src/i18n/`, `src/icons/{common,foe-info}/`, `src/images/logo90.png`, and the `webextension-polyfill` browser-polyfill files into the build output verbatim — don't hand-edit build output, edit the source location instead.
- Run `npm run build` after touching anything under `src/`, `webpack.*.js`, or `package.json`.
- `npm run analyze` builds production and generates `build/bundle-report.html` if you need to check what's driving bundle size.
- Verify with `/build-verify` (or manually: `npx --yes prettier@3.9.6 --check .`, `npm run build:dev`, `npm run build`) before calling a change done.

## i18n

- Translation files live in `src/i18n/*.json` (`de`, `el`, `en`, `es`, `fr`, `gr`, `it`).
- UI strings use `data-i18n` attributes, applied via `$(selector).i18n()` (jQuery i18n plugin). Scope the selector to the container you just inserted rather than re-running `$('body').i18n()` — the existing code re-scans the whole document on almost every network response, which is expensive and easy to accidentally add to.
- `options.html` currently has no `data-i18n` coverage — if you touch it, match the pattern used in `panel.html`/`popup.html` rather than leaving new strings hardcoded.

## Formatting

- No linter or test runner is configured. Formatting is the only automated check: `npx --yes prettier@3.9.6 --check|--write <file>`.
- Prefer `let`/`const` over `var` in any code you touch, even though most of the existing codebase predates that convention — don't do a drive-by rewrite of unrelated `var` usage in the same change.

## Cross-cutting gotchas

- Server-provided strings (player names, guild names, etc.) are rendered via `innerHTML` template literals in several places without escaping. If you add a new render path that interpolates user/server-controlled text, use `textContent` or an escaping helper — don't add another unescaped `innerHTML` interpolation.
