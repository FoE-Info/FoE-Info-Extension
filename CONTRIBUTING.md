# Contributing

## Getting started

Install Node.js 26.8.2 or newer, npm 9 or newer, Git, and uv (which supplies
`uvx` for the extension's font tooling). Use your ordinary user or system
installation. npm and uv use their normal caches; no project Python environment
is required. FontTools and Python may be downloaded by uvx on a cold run.

```bash
npm run setup
npm run build:dev
```

Setup checks Node, applies local rebase defaults, and runs `npm ci`. Load
`build/FoE-Info-DEV` as an unpacked extension in `chrome://extensions`.
See the [application guide](docs/application.md) for panel usage.

## Verification

Run `npm run verify` before committing or pushing. It checks version consistency,
published references, formatting, lint, types, architecture boundaries, RPC
contracts, locale parity, tests, focused coverage, development builds, production
builds, and bundle budgets. CI runs the same command after `npm ci` with hooks
disabled. CodeQL and dependency review remain separate workflows.

Use `npm test` for all tests. For focused tests, run `node --test` with explicit
paths. `npm run test:watch` and `npm run test:verbose` select Node reporters.
After moving or deleting modules, run `npm run audit:refs`; after removing or
renaming symbols, run `npm run audit:callsites`. Changes to parameter defaults
also require `npm run audit:default-args`. These audits have bounded static
coverage; review dynamic callers and transitive dependencies separately.

Inspect the working tree and staged diff, preserve unrelated changes, and stage
files for one logical purpose. Report checks actually run and unresolved
limitations in the change description. Manual browser testing uses an existing
game session and the [browser debugging guide](docs/browser-debugging.md).

## Optional tools and release

Browser helpers require a CDP-enabled Chrome session. Metadata downloads observe
live CDN responses; see the [security architecture](docs/security-architecture.md).
Release packaging requires `zip`; GitHub releases require authenticated `gh`.
See the [store and release guide](docs/chrome-web-store.md). Runtime credentials
may be exported in your shell or kept in ignored private environment files;
setup does not generate or load them. Never commit credentials or captures.

## Source modules and tests

For native Node tests, use native module classification: CommonJS source remains `.js` under the current package type; ESM source uses `.mjs`. Keep explicit extensions in relative imports. Tests may stub browser-only dependencies, but must not override source formats or add extension-search fallbacks. Node 26 can synchronously require ESM graphs without top-level await; verify the actual namespace/export shapes instead of assuming webpack's synthetic named-import behavior matches Node.

`webpack.common.js` resolves `.ts`, `.js`, `.mjs`, `.cjs`, and `.json`, disables the `fs` browser fallback, and provides `browser` via `webextension-polyfill`. **Decision: migrate incrementally toward ESM.** The hybrid is transitional: existing ESM modules use `.mjs`, while CommonJS modules and root webpack configurations retain `.js`. Convert coherent dependency groups, updating imports, consumers, source scanners, contracts, and documentation together. Verify both native Node consumers and bundled browser entries for each slice. Once most source is ESM, adopt `"type": "module"` with `.js` ESM and `.cjs` for remaining CommonJS files; do not flip the package type while CommonJS `.js` consumers still depend on it. TypeScript checking remains separate from runtime module classification and does not require a new compilation step for this migration.

The passing `npm run typecheck` gate checks declarations plus four runtime calculator leaves with `checkJs: true`: `src/js/calc/utils/bignumberUtils.js`, `src/js/calc/utils/eraUtils.js`, `src/js/calc/goods/goodsClassification.js`, and `src/js/calc/boosts/CastleBoostCalculator.js`. The broader `npm run typecheck:calc` migration audit checks all of `calc/` and still reports errors; extend the passing slice only after resolving the new files' diagnostics, not by loosening `strict` or silencing them with `any`.

Mechanical layer checks and historical debt policy are documented in
[repository contracts](docs/repository-contracts.md). Run `npm run contracts:diff` for
a changed-file check and `npm run contracts:audit` for the full audit; the full
audit is included in `npm run verify`.

## Git workflow

`development` is linear. Repository developers and organization members with
write access may rebase locally and push directly to `development`; a pull request
is not required for their work. External contributors fork the repository and
open pull requests targeting `development`. Merge those contributions with rebase
or squash so the branch stays linear.

The active GitHub ruleset blocks branch deletion, force pushes and merge commits.
It does not require pull requests or status checks before direct pushes. Run the
full local gate before pushing; CI Verify and CodeQL run after the push. Dependency
review runs on pull requests. Organization membership currently inherits write
access; membership must still confer repository write access to push.
Three local git settings make a plain `git pull` use rebase:

| Setting             | Effect                                                                 |
| :------------------ | :--------------------------------------------------------------------- |
| `pull.rebase`       | `git pull` replays local commits onto the upstream instead of merging. |
| `rebase.autoStash`  | A dirty working tree survives a `git rebase` you run by hand.          |
| `rebase.autosquash` | `git rebase -i` folds `fixup!` / `squash!` commits into their target.  |

Apply them to a clone with:

```bash
npm run setup:git
```

`npm run setup` performs the same step, so a clone that followed
[Getting started](#getting-started) already has them. All three are written
with `--local`: they live in that clone's `.git/config` and no other
contributor inherits them.

`fixup!` and `squash!` subjects pass the `commit-msg` hook, which is what makes
the autosquash row above usable. Git applies `rebase.autosquash` to
`git rebase -i` only — the non-interactive rebase behind `git pull --rebase`
leaves those commits alone.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): imperative summary
```

- Subject <= 72 characters, no trailing period, lowercase after the colon.
- Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`,
  `build`, `ci`, `revert`.
- A `commit-msg` git hook validates the format locally.

## Issues and feature requests

Open an issue at <https://github.com/FoE-Info/FoE-Info-Extension/issues>.
For security issues, see [SECURITY.md](SECURITY.md).
