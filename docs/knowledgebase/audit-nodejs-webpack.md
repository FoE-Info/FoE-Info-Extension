# Node.js & Webpack Audit

**Verified**: 2026-08-14 against package.json, package-lock.json, and the npm script chain
(Node.js/npm lens), and against `webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`, the
four entry-point templates, and two real builds (`npm run build`, `npm run build:dev`) run
against the current source tree with their output inspected under `build/` (webpack-config
lens).

## Confirmed findings

### P1: `npm run check` (the only automated gate) currently fails on files outside the source tree

`package.json:28` (`"check": "npx --yes prettier@3.9.6 --check ."`) runs Prettier over the
whole repo. `.prettierignore` (all 8 lines: `node_modules`, `build`, `package-lock.json`,
`.idea`, `src/js/fn/constants.js`, `graphify-out`, `docs`) does not exclude `.claude/`.
Running `npm run check` in the current working tree exits 1 and reports 22 unformatted
files, all under `.claude/` (e.g. `.claude/CLAUDE.md`, `.claude/skills/007/SKILL.md`,
`.claude/skills/graphify/references/*.md`) — none of them source code. `.claude/commands/build-verify.md`
step 1 runs the identical `npx --yes prettier@3.9.6 --check .` command, so the documented
`/build-verify` workflow currently fails on an unrelated directory before it ever reaches
`build:dev`/`build`. Fix: add `.claude` to `.prettierignore` (or scope the `check`/`format`
scripts to the tracked source globs) so the sole automated gate reflects source-code
formatting, not agent-tooling docs.

### P2: `allowScripts` field in package.json has no effect

`package.json:60-63` declares an `"allowScripts"` block (`@parcel/watcher@2.6.0`,
`core-js@3.50.0`). This is not a field npm's package.json schema recognizes (verified:
`npm help package.json` has no such key), and no lifecycle-script gatekeeper that reads
this convention (e.g. `@lavamoat/allow-scripts`) is present in `dependencies`,
`devDependencies`, or anywhere in `package-lock.json` — `grep -rn "lavamoat\|allow-scripts"`
across both files returns nothing. The field is inert and may mislead a reader into
believing install-script execution is being audited/gated when it isn't. Either add the
tool that interprets it or remove the field.

### P2: `setup` script hard-fails on missing `uv`/`uvx`, with the failure surfacing after `npm install` already succeeded

`package.json:21` — `"setup": "npm install && npm --version && uv --version && npx --yes prettier@3.9.6 --version && uvx --version"`.
`uv`/`uvx` are third-party (Astral) binaries unrelated to npm; they're required later for
the `graphify:*` scripts (`package.json:22-27`) but are chained with `&&` into the same
`setup` command as the core npm bootstrap. A contributor without `uv` on PATH gets a
non-zero exit from `npm run setup` immediately after dependencies were already installed
correctly — the failure looks like a broken setup rather than "graphify tooling isn't
installed yet, that's optional." Consider splitting the npm bootstrap from the
uv/graphify version checks so a missing optional tool doesn't read as a failed install.

### P2: No `.nvmrc`/`.npmrc` to enforce the `engines.node` pin

`package.json:17-19` declares `"engines": { "node": ">=24.0.0" }`, but there is no
`.nvmrc` and no `.npmrc` in the repo root (confirmed via directory listing). Without an
`.npmrc` setting `engine-strict=true`, npm only warns on an engines mismatch by default —
it does not block `npm install` on an older Node. The pin is documentation-only, not
enforced.

### P1: The single static `vendors` cache group forces the entire jQuery/Bootstrap/i18n bundle onto `devtools.html` and `popup.html`, which don't use any of it

`webpack.common.js:28-38` defines one `splitChunks.cacheGroups.vendor` with a hardcoded
`name: 'vendors'`, and `webpack.common.js:53,59,65,71` list `'vendors'` in every
`HtmlWebpackPlugin` `chunks` array (panel/options/popup/devtools alike). Because the name is
a fixed string rather than a function of the requesting chunk, webpack merges *all*
`node_modules` code reachable from *any* entry into one shared chunk, and every HTML page is
wired to load it regardless of whether that page's own entry script references it.
`src/js/devtools.js:14` and `src/js/popup.js:14` each import only `webextension-polyfill` —
verified by reading both files in full, neither references jQuery, Bootstrap, `dayjs`,
`bignumber.js`, or `@wikimedia/jquery.i18n`, all of which are pulled in exclusively by
`src/js/index.js` (`bootstrap`, `bignumber.js`, `@wikimedia/jquery.i18n` imports at
`src/js/index.js:14-22`) for the `app` entry. A real `npm run build` confirms the emitted
`build/FoE-Info_WEBSTORE/devtools.html` and `popup.html` both `<script defer src="vendors.js">`
(224 KiB minified) ahead of their own 1.6-1.8 KiB entry script, and the webpack stats line
reads `Entrypoint devtools 220 KiB = vendors.js 218 KiB devtools.js 1.58 KiB` /
`Entrypoint popup 220 KiB = vendors.js 218 KiB popup.js 1.71 KiB`. In the dev build (no
minification) this is 1.8 MiB of unused vendor JS loaded every time the DevTools panel is
created or the toolbar popup is opened. Fix: give the vendor cache group a per-entry name
(e.g. `name: (module, chunks) => ...` or `chunks: 'initial'` scoped per entry) or drop
`'vendors'` from the `devtools`/`popup` `HtmlWebpackPlugin` chunk lists so those pages only
load what they actually import.

### P1: `postcss-loader` runs in both dev and prod CSS pipelines with no PostCSS config anywhere in the repo

`webpack.dev.js:22` and `webpack.prod.js:44` both include `'postcss-loader'` in the
`.(sa|sc|c)ss` rule's loader chain, but there is no `postcss.config.js`, `.postcssrc`, or
`"postcss"` key in `package.json` anywhere in the repo root — confirmed via `find` for any
postcss-config filename and `grep -n "postcss" package.json` (only the `devDependencies`
entry for `postcss-loader` itself matches). Nor is `autoprefixer` or `postcss-preset-env`
present in `devDependencies` (full list checked against `package.json:36-55`). Without a
config, `postcss-loader` v8 runs with zero plugins and passes CSS through unchanged — it adds
a build step for every `.scss`/`.css` module (including Bootstrap 5's ~460 KiB of compiled
CSS, confirmed via the prod build's `app.css 232 KiB` / `options.css 229 KiB` assets) without
performing any transformation. This most likely means the intended vendor-prefixing/autoprefixing
for the extension's declared browser floor (`manifest.json:9` `"minimum_chrome_version": "88.0"`)
is not happening, while the loader's presence in the chain gives the opposite impression. Fix:
either add a `postcss.config.js` with `autoprefixer` (and add it as a dependency), or remove
`postcss-loader` from both configs if no PostCSS transform is actually needed.

### P2: Two dead/no-op module rules in `webpack.common.js`

- `webpack.common.js:15-18` — `{ test: /\.js$/, exclude: /node_modules/ }` has no `use` or
  `loader` key. There is no `babel-loader` (or any other JS transform) in `devDependencies`
  (verified against the full `devDependencies` list in `package.json:36-55`), so this rule
  matches `.js` files and does nothing beyond webpack's built-in JS handling — it's vestigial.
- `webpack.common.js:19-25` — the `asset/resource` rule for `.png|.svg|.jpg|.jpeg|.gif` with
  `filename: 'images/[name][ext]'` appears unused by the current source tree. `grep` across
  `src/js/**` and `src/css/**` for `import`/`url(...)` references to raster/SVG files (excluding
  `data:` URIs) found none — Bootstrap's own icons compile to inline `data:image/svg+xml,...`
  strings via its SCSS functions (verified in `node_modules/bootstrap/scss/_functions.scss`),
  not file references that would route through this rule, and `popup.html`'s
  `<img src="icons/logo90.png">` is served as a static path via `CopyPlugin`
  (`webpack.common.js:87`), never through webpack's module graph. Neither rule is causing harm,
  but both should either be wired to something or removed so the config doesn't imply
  transforms that aren't happening.

### P2: `webpack.dev.js`'s `devServer` block is unreachable from any npm script and wouldn't help this project's dev loop if it were

`webpack.dev.js:35-41` configures a full `devServer` (`hot: true`, `port: 3000`, `static.directory`
pointed at `build/FoE-Info-DEV`), but no script in `package.json:20-34` invokes `webpack serve` —
the only dev-facing scripts are `dev` (`webpack --config webpack.dev.js --watch`) and `build:dev`
(same, one-shot). `webpack-dev-server` is present as a devDependency (`package.json:51`,
`^6.0.0`) but nothing wires it up. Even manually run via `npx webpack serve`, HMR over
`http://localhost:3000` would not reach a Chrome extension loaded unpacked from disk — the
actual (working, verified above) dev loop is `npm run dev`'s `--watch` mode writing straight to
`build/FoE-Info-DEV`, followed by a manual reload in `chrome://extensions`. The `devServer`
config is dead weight that could mislead a contributor into expecting a live-reload workflow
this project doesn't have.

## What's solid

- `npm audit` (both with and without `--omit=dev`) reports **0 vulnerabilities** against
  the current `package-lock.json` (lockfileVersion 3).
- `npm outdated` reports nothing to update — every pinned range in `dependencies` and
  `devDependencies` already resolves to its latest published registry version. Spot-checked
  directly against the registry: `prettier@3.9.6` (latest), `npm-check-updates@23.0.2`
  (latest), `webpack-cli@7.2.2` (latest), `webpack-dev-server@6.0.0` (latest),
  `jquery@4.0.0` (latest, not a stale major), `@wikimedia/jquery.i18n@1.0.9` (latest, not
  deprecated).
- `npm run build` and `npm run build:dev` / `npm run dev` (webpack `--watch`) both execute
  successfully end-to-end against the current source tree, producing all four entry-point
  bundles (`app`, `options`, `devtools`, `popup`) and, for `build`, the zipped Web Store
  artifact — the documented script chain works as written.
- `packageManager: "npm@12.0.2"` (`package.json:16`) matches the npm actually installed in
  this environment (`npm --version` → `12.0.2`), and `engines.node: >=24.0.0`
  (`package.json:17-19`) is satisfied by the running Node (`v26.7.0`) — the version claims
  in the manifest are accurate, not aspirational.
- No deprecated packages found among the direct dependencies checked (`zip-webpack-plugin`,
  `webpack-extension-manifest-plugin`, `webextension-polyfill`, `copy-webpack-plugin`,
  `jquery`, `@wikimedia/jquery.i18n` — `npm view <pkg> deprecated` returned empty for all).
- Ran both builds fresh from a clean `build/` and inspected the real output against config
  claims: `CopyPlugin` (`webpack.common.js:73-89`) correctly places `icons/` (8 files matching
  every `icons/IconNN.png` path `manifest.json:16-23` / `manifest_release.json:16-23`
  reference), `i18n/*.json` (7 locale files), `browser-polyfill.js` + `.js.map`, and
  `icons/logo90.png` matching `popup.html`'s `<img src="icons/logo90.png">` — no broken asset
  paths in the built output.
- `ZipPlugin`'s `path: '../'` (`webpack.prod.js:81`) correctly resolves one level above
  `output.path` (`build/FoE-Info_WEBSTORE/`), so the release zip is emitted as a sibling
  (`build/FoE-Info_WEBSTORE_<version>_<date>.zip`) rather than nested inside the folder it
  zips — confirmed by listing `build/` after a real `npm run build`.
- The `analyze` script's `ANALYZE=true` gating (`webpack.prod.js:84-92`) is correctly scoped:
  `BundleAnalyzerPlugin` is only spread into the prod plugin array when
  `process.env.ANALYZE === 'true'`, so a normal `npm run build` is unaffected.
- `devtool` handling is a deliberate, working split, not an oversight: `inline-source-map` in
  dev (`webpack.dev.js:14`) for local debugging, and no `devtool` at all in prod (neither
  `webpack.prod.js` nor `webpack.common.js` sets one), so the Web Store zip ships with no
  source maps — reasonable for not exposing readable source in the public package.
- `src/chrome/manifest.json` and `src/chrome/manifest_release.json` — the two `baseManifest`
  files each `webpack.dev.js:6` and `webpack.prod.js:10` load — are byte-identical
  (`diff` exits 0); `WebpackExtensionManifestPlugin`'s per-build `extend` block
  (`webpack.dev.js:53-62`, `webpack.prod.js:70-79`) is doing all the actual dev/prod
  differentiation (`name`/`short_name`/`version`), which the build output confirms.
