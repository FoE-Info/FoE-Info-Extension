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

- Organize modules by cohesion: a module holds one thing that changes for one reason. Large files are a prompt to check for a feature boundary (see `docs/architecture.md` "Cohesion Over Line Count"), not a violation to fix by splitting.
- Never bundle static game data into `src/`; the runtime is driven by live
  InnoGames network payloads.
- Use `bignumber.js` for Forge Point and reward math.
- All user-visible strings must go through i18n (see `src/i18n/`).

## External tool prerequisites

Some developer workflows rely on tools that `npm install` does **not** provide.
Install them separately if you need the matching workflows:

| Tool                                   | Required by                                                           | Why                                                                                             |
| :------------------------------------- | :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `zip`                                  | `npm run package:beta` / `scripts/package-extension.js`               | Builds the release ZIP artifacts.                                                               |
| `gh`                                   | `npm run release` / `scripts/release.mjs`                             | Creates GitHub releases and uploads assets (requires `gh auth login` first).                    |
| CDP-enabled Chrome on `127.0.0.1:9222` | `npm run metadata:download` / `scripts/download-offline-metadata.mjs` | Drives a Chrome instance over the DevTools protocol to ingest live InnoGames entity datasets.   |

The core gate (`npm run verify`) needs Node.js, npm, Git, installed dependencies
and Bash for shared shell harness fixtures. A Chromium-based browser is needed
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

## Git workflow

`development` is linear. It is fast-forwarded, work arrives through
short-lived branches, and no merge commit is authored on top of it. Three
local git settings make a plain `git pull` behave that way:

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
