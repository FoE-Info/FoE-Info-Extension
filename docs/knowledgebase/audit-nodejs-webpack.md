# Node.js Toolchain & Webpack Audit

**Verified**: 2026-08-08 against `package.json`, `package-lock.json`, `.mise.toml`,
`webpack.common.js`, `webpack.dev.js`, and `webpack.prod.js`.

## Executive summary

Node.js is a build/tooling runtime in this repository; there is no Node server or API
surface to assess. Dependency resolution, formatting, production compilation, and the
npm advisory audit pass. The main gaps are application quality gates (no application
tests, linting, or type checks), oversized shared assets, an unused runtime dependency,
and Webpack configuration that loads the 218 KiB vendor chunk into even the minimal
popup/devtools pages.

## Toolchain and tasks

`.mise.toml` pins Node 22 and Python 3.12 and exposes tasks matching the npm scripts.
`mise run setup` installs the managed tools and npm packages. `npm run setup` delegates
to `mise` where available and otherwise provides npm/Graphify fallbacks.

| Capability                 | Command                            | State                    |
| -------------------------- | ---------------------------------- | ------------------------ |
| Formatting                 | `npm run check` / `npm run format` | Configured with Prettier |
| Development watch          | `npm run dev`                      | Configured               |
| One-shot development build | `npm run build:dev`                | Configured               |
| Production build/ZIP       | `npm run build`                    | Configured               |
| Bundle report              | `npm run analyze`                  | Configured               |
| Graph refresh              | `npm run graphify-update`          | Configured               |
| Graph report policy tests  | `npm run test:graphify-report`     | Configured; tooling only |
| JavaScript lint            | —                                  | Missing                  |
| Application tests          | —                                  | Missing                  |
| Type checking              | —                                  | Missing                  |
| CI workflow                | —                                  | Missing                  |

Prettier is a formatter, not a correctness or security linter. Add an explicit
`validate` task that runs formatting, ESLint, tests, and both development/production
compilation as those gates are introduced.

## Dependency audit

The lockfile resolves 461 total packages (10 production, 452 development, 15 optional,
and one peer as reported by npm; categories overlap npm's total accounting).
`npm audit --audit-level=high` reported zero known vulnerabilities on the verification
date.

Confirmed dependency observations:

- `webhook-discord` is declared but no source or Webpack configuration imports it. It
  is also unsuitable for the current browser-side posting implementation. Remove it
  after a clean build/behavior check.
- `@popperjs/core` is a required Bootstrap peer and is bundled through Bootstrap's
  tooltip/popover usage. Keeping it as a direct dependency is appropriate.
- `postcss-loader` runs without a repository PostCSS configuration or plugins such as
  Autoprefixer. It currently adds a pipeline stage with no documented transformation;
  either configure the intended policy or remove the loader.
- Runtime and development dependencies are otherwise classified consistently with
  their browser/build usage.

## Webpack architecture

`webpack.common.js` defines four entry points and four HtmlWebpackPlugin pages. Images
use Webpack 5 asset modules, static translations/icons/polyfill files are copied, and
third-party modules are forced into a named `vendors` cache group.

Development uses injected styles and inline source maps. Production extracts CSS,
minifies JavaScript with Terser, emits the Webstore manifest, creates a dated ZIP, and
can emit a static bundle-analyzer report. Stable filenames are reasonable for an
extension package whose manifest and HTML refer to local assets.

### Measured production output

| Asset/entry          |                    Size |
| -------------------- | ----------------------: |
| `vendors.js`         | 223,528 bytes (218 KiB) |
| `app.js`             | 144,044 bytes (141 KiB) |
| `app.css`            | 237,270 bytes (232 KiB) |
| `options.js`         |             8,534 bytes |
| `options.css`        | 234,124 bytes (229 KiB) |
| app entry total      |                 591 KiB |
| options entry total  |                 455 KiB |
| devtools entry total |                 220 KiB |
| popup entry total    |                 220 KiB |
| release ZIP          |                 295 KiB |

The production build completes but emits three performance warnings: release ZIP
asset size, app/options entrypoint size, and Webpack's code-splitting recommendation.

### High: minimal pages receive the global vendor chunk

Every HtmlWebpackPlugin instance explicitly includes `vendors`, including
`popup.html` and `devtools.html`. Those pages therefore each load about 218 KiB of
shared vendor JavaScript while their own entry scripts are only about 1.6–1.7 KiB.
Split cache groups by entry/dependency set or allow Webpack/HtmlWebpackPlugin to inject
only chunks actually required by each entry. Confirm the resulting chunk dependency
order in all four generated pages.

### Medium: full Bootstrap CSS is compiled twice across pages

The app and options entries each emit a roughly 230 KiB stylesheet. This is not an
accidental duplicate inside `main.scss`; it is duplication across two entry outputs.
Options uses only a small subset of Bootstrap. Import component-level Sass for each
surface, or emit a shared CSS asset if extension-page caching and CSP behavior are
verified. Any PurgeCSS approach needs a comprehensive safelist because the app builds
many Bootstrap class names dynamically in template strings.

### Medium: browser compatibility policy is implicit

The manifest says Chrome 88+, Webpack has no explicit `target`/Browserslist policy,
and no Babel rule transpiles source. The current source is therefore shipped close to
its authored syntax. Document supported Chrome/Firefox versions and encode them in
Browserslist/Webpack so dependency updates can be checked against an intentional
runtime contract.

### Low: development-server intent is unclear

The normal `dev` script uses Webpack watch, not `webpack serve`; the `devServer`
configuration is therefore dormant in the documented workflow. Remove it or add and
document a tested serve task. Extension reload is still required for relevant
manifest/runtime changes.

## Prioritized remediation

| Priority | Action                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------- |
| P0       | Add tests for storage, posting, calculations, and request dispatch before architectural refactors |
| P0       | Add ESLint and a single `validate` task; run it in CI                                             |
| P1       | Stop injecting the global vendor chunk into popup/devtools unless their chunk graphs require it   |
| P1       | Remove unused `webhook-discord` after build/runtime verification                                  |
| P1       | Reduce Bootstrap imports per entry and measure with `npm run analyze`                             |
| P2       | Configure or remove the pass-through PostCSS stage                                                |
| P2       | Encode the browser support/output target policy                                                   |
| P2       | Remove or document the dormant dev-server configuration                                           |

## Verification record

```text
npm ls --depth=0               PASS
npm run check                  PASS
npm run test:graphify-report   PASS: 2 tests
npm run build                  PASS with 3 performance warnings
npm audit --audit-level=high   PASS: 0 known vulnerabilities
```

The npm audit result is time-sensitive and should be regenerated in CI or release
maintenance rather than treated as a permanent guarantee.
