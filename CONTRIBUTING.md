# Contributing to FoE-Info

Thanks for your interest in improving FoE-Info.

## Getting started

## Before you commit

```bash
npm run verify
```

This checks environment readiness, then runs version and reference-integrity checks, formatting, linting, type
checking, architecture boundaries and historical debt, the RPC contract check, i18n parity across
all locales, the unit tests and focused coverage thresholds, and development
and production builds with the production asset budget. All of it must pass.

Guidelines:

- Organize modules by cohesion: a module holds one thing that changes for one reason. Large files are a prompt to check for a feature boundary (see [module cohesion](docs/repository-contracts.md#module-cohesion)), not a violation to fix by splitting.
- Never bundle static game data into `src/`; the runtime is driven by live
  InnoGames network payloads.
- Use `bignumber.js` for Forge Point and reward math.
- All user-visible strings must go through i18n (see `src/i18n/`).

## External tool prerequisites

Some developer workflows rely on tools that `npm install` does **not** provide.
Install them separately if you need the matching workflows:

| Tool                                   | Required by                                                                            | Why                                                                                                                         |
| :------------------------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `zip`                                  | `npm run package:beta` / `scripts/package-extension.js`                                | Builds the release ZIP artifacts.                                                                                           |
| `gh`                                   | `npm run release` / `scripts/release.mjs`                                              | Creates GitHub releases and uploads assets (requires `gh auth login` first).                                                |
| CDP-enabled Chrome on `127.0.0.1:9222` | `npm run metadata:download` / `scripts/download-offline-metadata.mjs`                  | Drives a Chrome instance over the DevTools protocol to ingest live InnoGames entity datasets.                               |

The core gate (`npm run verify`) needs Node.js, npm, Git, installed dependencies
and Bash for shared shell harness fixtures, plus uv/uvx for font-subsetting tests.
`uvx` obtains Python and FontTools on its first run when not cached; install uv
through mise or the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/). A Chromium-based browser is needed
separately for manual panel testing.

### Node.js baseline

The baseline is **Node 26.8.2**. The version sources are:

- `package.json` `engines` — `>=26.8.2`
- CI (`.github/workflows/ci.yml`) — `26.8.2`
- `@types/node` — `^26.6.3` (Node 26 API declarations; package versions are
  independent of runtime patch versions)

CI and local mise verification use the same exact runtime. The engine range
sets the minimum supported version; setup checks the major, minor, and patch
before installing dependencies. Update the engine floor, CI pin, mise pin and
lockfile, and Node API declarations together when changing the baseline.

### Dependency install-script policy

`package.json#allowScripts` is the project's single install-script approval
policy. Keep its exact package/version approvals there. The repository `.npmrc`
configures peer-dependency handling and the local npm cache; do not duplicate script approvals in it.
A user/global `.npmrc` `allow-scripts` entry applies to one-off/global tooling and
causes npm to warn when this project's package policy supersedes it. Remove stale
user entries rather than disabling warnings or permitting every dependency script.
Check an existing user policy before removing it: other tools may rely on those
approvals. `scripts/setup.mjs` also removes inherited `npm_config_allow_scripts`
from the nested `npm ci` environment, because npm treats that as a forbidden
project-install CLI override.

### Optional local CodeQL analysis

CodeQL is separate from npm dependencies. Its CLI may live in an ignored build
folder; the default query-pack cache is under `~/.codeql/packages`. A repository
can keep query packs local too by explicitly selecting its ignored download and
search directories:

```bash
codeql pack download --dir build/codeql-packs codeql/javascript-queries@2.4.6
codeql database analyze <database> codeql/javascript-queries:codeql-suites/javascript-code-scanning.qls --search-path=build/codeql-packs/codeql/javascript-queries/2.4.6 --format=sarif-latest --output=build/codeql-results.sarif
```

These commands pin the validated query-pack version; update the download and
search path together when upgrading it. Use the installed CLI executable's path
when it is not on PATH. Keep binaries,
query packs, databases and SARIF output out of Git. Record CLI/query-pack versions,
source snapshot and results in the owning task; a local pass does not close GitHub
alerts until the published commit is analyzed remotely.

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

Mechanical layer checks and historical debt policy are documented in
[repository contracts](docs/repository-contracts.md). Run `npm run contracts:diff` for
a changed-file check and `npm run contracts:audit` for the full audit; the full
audit is included in `npm run verify`.
