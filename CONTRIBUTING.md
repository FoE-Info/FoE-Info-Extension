# Contributing to FoE-Info

Thanks for your interest in improving FoE-Info.

## Getting started

1. Install dependencies:
   - `npm run setup` (or `npm install`) — installs Node dependencies. Requires Node matching `engines.node` in `package.json`.
   - `mise run setup` — optional mise toolchain runner.
2. Start a development build with a watch loop: `npm run dev`.
3. Load `build/FoE-Info-DEV` as an unpacked extension in `chrome://extensions`.

## Before you commit

```bash
npm run verify
```

This runs formatting, linting, type checking, the RPC contract check, i18n
parity across all locales, the unit tests, and a development build. All of it
must pass.

Guidelines:

- Organize modules by cohesion: a module holds one thing that changes for one reason. Large files are a prompt to check for a feature boundary (see `ARCHITECTURE.md` "Cohesion Over Line Count"), not a violation to fix by splitting.
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
| `uv`                                   | `npm run setup` / `scripts/setup.mjs`                                 | Optional Python/AI agent toolchain bootstrap (`uv sync`). Plain `npm install` does not need it. |
| CDP-enabled Chrome on `127.0.0.1:9222` | `npm run metadata:download` / `scripts/download-offline-metadata.mjs` | Drives a Chrome instance over the DevTools protocol to ingest live InnoGames entity datasets.   |

The core gate (`npm run verify`) needs none of these: only Node.js, npm, and a
Chromium-based browser for manual panel testing.

### Node.js baseline (recommended)

The baseline is **Node 24.x (LTS)**, and the sources now agree on it:

- `AGENTS.md` — "Node 24+"
- `package.json` `engines` — `>=24.0.0`
- CI (`.github/workflows/ci.yml`) — Node 24.x
- local `mise` config — 26.8.2

24.x is what CI tests, what `engines` enforces as a floor, and what the
verification snapshot was produced against. Node 26+ is an allowed-but-untested
minor: local `mise` resolves to 26.8.2 and the suite passes there, but CI pins a
single major. Do not widen CI to two majors as part of a docs change; that is an
engine/CI task (`docs/TODO.md` §1, §3). A local `mise` pin newer than the
baseline is fine for development, but reproducible verification is anchored to
24.x.

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
