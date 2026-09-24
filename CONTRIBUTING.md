# Contributing to FoE-Info

Thanks for your interest in improving FoE-Info.

## Getting started

2. Install dependencies. npm alone is enough to build the extension:
   - `npm run setup` — Node dependencies only. Requires Node matching
     `engines.node` in `package.json`.
   - `npm run setup:full` — additionally installs the uv Python environment
     (graphify-mcp) and the default MCP profile, needed for Graphify queries and
     metadata work.
   - `mise run setup` — runs `setup:full` with the toolchain pinned in
     `.mise.toml`. mise is optional; the npm paths need no mise.

   Both entrypoints run `scripts/setup.mjs`, so the installed project is the
   same. mise only selects which Node/Python/uv binaries are on PATH; the Node
   version requirement lives in `package.json` `engines` and is checked by the
   script.

3. Start a development build with a watch loop: `npm run dev`.
4. Load `build/FoE-Info-DEV` as an unpacked extension in `chrome://extensions`.

## Before you commit

```bash
npm run verify
```

This runs formatting, linting, type checking, the RPC contract check, i18n
parity across all locales, the unit tests, and a development build. All of it
must pass.

Contributors using the Graphify knowledge graph should instead run
`npm run verify:full` (or `mise run verify-full`), which adds the AST graph
refresh. It requires `npm run setup:full` first.

Guidelines:

- Keep modules small (roughly 100-300 lines; 600 line hard cap).
- Never bundle static game data into `src/`; the runtime is driven by live
  InnoGames network payloads.
- Use `bignumber.js` for Forge Point and reward math.
- All user-visible strings must go through i18n (see `src/i18n/`).

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
