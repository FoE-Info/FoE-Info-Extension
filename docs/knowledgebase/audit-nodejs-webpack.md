# Node.js & Webpack Audit

**Verified**: 2026-08-14 against `package.json`, `webpack.*.js`, and the build output,
via the `nodejs-expert` and `webpack-expert` subagents.

## Confirmed findings

### P1: No lint, type-check, or test gate

The application has no ESLint, type checker, or test runner configured — `npm run
check` (Prettier) is the only automated gate. This means every finding in the other
audit files here was caught by manual reading, not by CI. A successful `npm run build`
does not cover any of the highest-risk paths documented elsewhere (storage,
`innerHTML` sinks, service dispatch logic).

### P1: Production build has no source maps

`webpack.prod.js` ships no source maps — a real user crash report against the
production bundle is undebuggable as-is.

### P2: Dependency pinning inconsistency

`@wikimedia/jquery.i18n` is exact-pinned (`1.0.9`) while every other dependency uses a
caret range. Confirm whether this is intentional (known breaking releases) or just
drift.

### P2: Prettier invoked via `npx`, not a pinned devDependency

`npm run check`/`format` shell out to `npx --yes prettier@3.9.6` rather than depending
on a pinned `prettier` devDependency. Works, but means formatting isn't reproducible
purely from `npm ci` without a network call to resolve the package the first time.

## What's solid

- Dependency placement is correct: jquery/bootstrap/dayjs/bignumber.js/etc. are listed
  under `dependencies` (not `devDependencies`) since they're bundled into the shipped
  extension.
- Four explicit Webpack entry points (`app`, `options`, `devtools`, `popup`) with a
  clean dev/prod split via `webpack-merge`.
- `CopyPlugin`/`HtmlWebpackPlugin` wiring correctly keeps generated output out of the
  source tree.
