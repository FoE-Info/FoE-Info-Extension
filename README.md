# FoE-Info

A passive Chrome Manifest V3 extension and real-time companion for [Forge of Empires](https://en.forgeofempires.com) players. FoE-Info reads the game's live network traffic and surfaces information the base game does not, without game mutation, botting, or automation. Traffic reaches the extension over two read-only intake paths — the DevTools dock, and a MAIN-world observer injected into the game page at `document_start` that wraps the page's own `XMLHttpRequest`/`fetch`/`WebSocket` interfaces (see [SECURITY.md](SECURITY.md) § Data Intake Paths for the exact boundary).

- Great Building investment, suggested donations, and 1.9x snipe math
- City production, collection times, and harvest yields
- Blue Galaxy harvest assistant and high-value production ranking
- Military, attack, and city boost totals across all combat arenas (GBG, GE, QI, PvP)
- Guild Battlegrounds (attrition, province lock timers, target generator token copy)
- Guild Expedition progress, encounters, and guild contribution rankings
- Treasury log and resource flows
- Incidents, cultural settlement outposts, and historical allies
- Resizable army inventory and player social rosters (Friends, Neighbors, Guild)

- **Source code:** <https://github.com/FoE-Info/FoE-Info-Extension>
- **Issues & support:** <https://github.com/FoE-Info/FoE-Info-Extension/issues>
- **Architecture Guide:** [docs/architecture.md](docs/architecture.md)
- **Debugging & Diagnostics:** [docs/debugging.md](docs/debugging.md)
- **Web Store & Compliance:** [docs/chrome-web-store.md](docs/chrome-web-store.md)

This README is the canonical shared entrypoint for a fresh clone. Start with [docs/architecture.md](docs/architecture.md), [SECURITY.md](SECURITY.md), [docs/debugging.md](docs/debugging.md), and [CONTRIBUTING.md](CONTRIBUTING.md); run `npm run verify` before committing. These documents own architecture, passive-observation boundaries, diagnostics, and contribution policy respectively.

## Core Principles & Invariants

- **Passive Observation Only**: Strictly zero network write-backs, botting, auto-clicking, or request injection into the game client. Traffic is only read — through the DevTools dock, and through a MAIN-world observer that wraps the game page's network interfaces to see what the DevTools listener may miss. It injects no DOM nodes and issues no game requests of its own; the interception is an observation hook, not gameplay automation.
- **Dynamic Metadata Streaming**: Game metadata streams dynamically from InnoGames CDNs and RPC responses. No hardcoded entity statistics or static game dumps in `src/`.
- **BigNumber Precision**: Forge Points, Great Building locks, Arc bonuses, and military boosts use BigNumber precision arithmetic to prevent floating-point drift.
- **Full Internationalization (i18n)**: All UI strings, tooltips, and labels support 7 locales (`en`, `de`, `fr`, `es`, `it`, `el`, `gr`) with 100% key parity.

## Requirements

### Always required

- Node.js >= 26.8.2 (local tooling and CI pin 26.8.2)
- npm >= 9
- Chromium-based browser (Chrome, Edge, Brave, Opera, ...)

### Required only by specific commands

These tools are not bundled. Each one fails at the point of use, so install it
before running the command that needs it.

| Tool                                                        | Needed by                                                                                               |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `zip`                                                       | `npm run package:beta`, `npm run release:prod`, `npm run release` (`scripts/package-extension.js`)      |
| [GitHub CLI](https://cli.github.com/) (`gh`), authenticated | `npm run release` (`scripts/release.mjs`)                                                               |
| Chrome with remote debugging on `127.0.0.1:9222`            | `npm run metadata:download` — attaches to a live game session                                           |

## Building

```bash
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension
npm install

# Development build with watch/reload loop
npm run dev

# One-off builds
npm run build:dev    # development bundle  -> build/FoE-Info-DEV
npm run build:beta   # beta bundle         -> build/FoE-Info-Beta
npm run build:prod   # production bundle   -> build/FoE-Info-Prod
```

## Installing the Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the generated folder, e.g. `build/FoE-Info-DEV` for a development build

## Using the Extension

1. Open your game world, e.g. `https://en0.forgeofempires.com` (any language works)
2. Press `Ctrl+Shift+I` to open DevTools
3. Click `>>` in the DevTools tab bar and select **FoE-Info (DEV)**
4. Load/enter the game to start FoE-Info
5. Click the tools icon in the panel header to change options

## Debugging

- Right-click the FoE-Info panel and choose **Inspect**, then open the **Console** tab.
- Click the FoE-Info logo in the panel header to toggle **debug mode** (switches to a bug icon), activating module-scoped diagnostics (`[FoE-Info:<Module>]`).
- See [docs/debugging.md](docs/debugging.md) for full diagnostic tags, out-of-scope RPC filtering, and AI pair-debugging runbooks.

## Commands & Verification Pipeline

| Stage                  | Command                           | Purpose                                                                                                                   |
| :--------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Verification Gate**  | `npm run verify`                  | Version, reference audit, format, lint, typecheck, RPC/i18n, tests, focused coverage, dev build, production bundle budget |
| **Setup**              | `npm run setup`                   | Verify the Node version against `engines`, apply the local rebase defaults, install dependencies                          |
| **Unit Tests**         | `npm test` / `npm run test:watch` | Native Node.js test runner (`node:test`)                                                                                  |
| **Coverage Gate**      | `npm run test:coverage`           | Focused per-module line, branch and function thresholds                                                                   |
| **Bundle Budget**      | `npm run check:bundle-budget`     | Fresh production build, asset composition report and size budgets                                                         |
| **Format Check**       | `npm run check`                   | Prettier dry-run check                                                                                                    |
| **Format Write**       | `npm run format`                  | Prettier automatic format write                                                                                           |
| **Lint**               | `npm run lint`                    | ESLint 10 static analysis                                                                                                 |
| **Type Check**         | `npm run typecheck`               | TypeScript compiler check (`tsc --noEmit`)                                                                                |
| **RPC Contract Check** | `npm run rpc:contract:check`      | Validate JSON-RPC schemas and contract fixtures                                                                           |
| **i18n Parity Check**  | `npm run i18n:check`              | Verify key parity across all 7 supported locales                                                                          |
| **i18n Auto-Fix**      | `npm run i18n:fix`                | Synchronize missing translation keys                                                                                      |
| **Metadata Ingest**    | `npm run metadata:download`       | Ingest live InnoGames entity datasets                                                                                     |
| **Reference Audit**    | `npm run audit:refs`              | Check every path, command and task in the docs (local scope, includes shared agent surfaces)                              |
| **Reference Audit**    | `npm run audit:refs:published`    | Same check restricted to git-tracked surfaces; runs on a clean checkout without siblings                                  |
| **Callsite Audit**     | `npm run audit:callsites`         | Flag symbols a diff removed or renamed that still have live references                                                    |
| **Default-arg Audit**  | `npm run audit:default-args`      | Flag callers relying on a parameter default the diff changed or removed                                                   |
| **Package (beta)**     | `npm run package:beta`            | Verify, build and zip a beta Web Store archive                                                                            |
| **Release (prod)**     | `npm run release:prod`            | Verify, build and zip a production Web Store archive                                                                      |
| **Publish release**    | `npm run release`                 | Full release: verify, package, create the GitHub release, then push the tag                                               |

`npm run verify:docs` checks readiness, versions, published references and format.
`npm run verify:static` adds lint, types, architecture, RPC and i18n checks.
These are feedback profiles; every commit still requires the full gate. Capture

Verification order executed by `npm run verify`:

```bash
npm run doctor             # read-only full-profile prerequisite checks
npm run version:check       # version consistency check
npm run audit:refs:published # reference audit on tracked surfaces only
npm run check               # format check
npm run lint                # lint
npm run typecheck           # TypeScript check
npm run contracts:audit     # architecture boundaries and historical debt
npm run rpc:contract:check  # JSON-RPC contract check
npm run i18n:check          # i18n parity check
npm test                    # unit tests
npm run test:coverage       # focused coverage thresholds
npm run build:dev           # dev build
npm run check:bundle-budget # fresh production build + asset budget
```

### Static audits: callsites and default arguments

Both are deterministic checks, not judgements, and both exit non-zero on a
finding. They exist because a patch can break a working tree without producing
a single error, and because that is the commonest failure mode of a
machine-authored diff.

`audit:callsites` covers removal. For every symbol a diff removes or renames, it
greps the working tree for surviving references. Scope is **module surface
only** — `module.exports` keys, in both the `= { a, b }` block form and the
`module.exports.x = x` property form — because a repo-wide name grep cannot
tell one module's local `after` from another's. `-- --all-bindings` widens it
to every local binding and is correspondingly noisy.

`audit:default-args` covers the case a callsite check structurally cannot. If a
parameter's default is changed or removed, no symbol is removed by name, so
`audit:callsites` reports a clean tree — and the code does not fail, it simply
computes something different. The reference case is the 2026-09-28 `calc/`
dependency-injection patch: four constructors defaulted their metadata store to
`null`, both calculators build module-level singletons that pass no argument, and
production and boost arithmetic became quietly wrong while the test suite stayed
green. For each changed default the script reports the call sites whose argument
count is at or below the affected parameter's index, meaning the default is in
force.

Shared flags: `-- --staged` (index only), `-- --base <ref>` (compare against a
ref), `-- --json` (machine output), `-- --all` (every reference).

A clean run is necessary but not sufficient. `audit:default-args` cannot follow
a function passed as a value and invoked under another name, a spread or
runtime-assembled argument list, a method reached by destructuring, or a default
that references a constant edited in a file the diff never touched. The same
applies to `audit:callsites` and code reached by indirection. Neither replaces
reading the diff; they exist so that the class of defect which is invisible in a
diff review is at least flagged before the diff is accepted.

### Reference audit scope

`audit:refs` supports two scopes:

- **`--scope=local` (default, `npm run audit:refs`)** — scans the working tree,
  including shared agent sources and locally present files. It can resolve
  optional sibling roots and roots listed in `.audit-siblings`. Use it to inspect
  cross-repository notes when those repositories are available.
- **`--scope=published` (`npm run audit:refs:published`)** — scans tracked files
  plus nonignored untracked additions, including the shared agent harness, plans,
  and backlog. It resolves references only against that publishable set and its
  ancestor directories. Credentials and generated machine state must stay
  excluded; forcibly tracked credential files are policy findings. Optional
  sibling repositories never satisfy a published reference. This scope runs in
  `npm run verify` and checks pending files without requiring staging.

Reusable guidance can mark a line of hypothetical paths or commands with the
HTML comment `<!-- audit-refs: illustrative -->`. This excludes only literal
path and command findings on that line in the normal audit; Markdown links,
publication policy, and unmarked references remain checked. Strict mode retains
these findings for inspection.

Limitations: the audit is token-based. Prose that happens to contain a slash,
a `UPPER_SNAKE` identifier, or a command-shaped backtick span may be flagged
and needs triage. `--strict` additionally reports the docs/architecture.md module
line-ceiling prompt. Sibling references in tracked files are only resolved when
the sibling repository is present; published scope never invents a sibling that
does not exist locally.

### Verification evidence

The CI workflow is a separate consumer of verification on GitHub. Its configured
failure uploads are available per run after the workflow changes are published.

## Project Structure & Architecture

```text
src/
  chrome/     MV3 manifests, panel.html, options.html
  css/        Bootstrap 5.3 theme and component stylesheets
  i18n/       7-language localization dictionaries (de, el, en, es, fr, gr, it)
  types/      TypeScript declarations for the typecheck gate
  js/
    calc/       Pure calculation engines (boosts, production, goods, units)
    fn/         Feature-scoped UI bindings and DOM helpers
    msg/        InnoGames JSON-RPC service handlers
    parsers/    Game-payload parsers
    protocol/   Network routing, message dispatching, packet interception
    state/      In-memory reactive state & metadata stores
    ui/         DOM rendering, cards, popover components
    utils/      Storage, copy, i18n, and logging utilities
    vars/       Panel option and view state
tests/        Native Node.js test suites (node:test)
```

See [docs/architecture.md](docs/architecture.md) for data pipeline flow, RPC dispatching, layer invariants, and the module loading policy: webpack bundles mixed ESM/CommonJS source, while native Node follows the package's CommonJS `.js` and ESM `.mjs` rules. `npm run typecheck` checks declarations and four runtime calculator leaves with `checkJs`; the broader `typecheck:calc` migration audit is not yet green.

## Security

Please report vulnerabilities privately through GitHub's **Report a vulnerability** flow on the **Security** tab. See [SECURITY.md](SECURITY.md) for details.

## License

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE.md) (AGPL-3.0-or-later).

Mechanical layer checks and historical debt policy are documented in
[repository contracts](docs/repository-contracts.md). Run `npm run contracts:diff` for
a changed-file check and `npm run contracts:audit` for the full audit; the full
audit is included in `npm run verify`.

The [documentation index](docs/index.md) maps document ownership, naming, work state, and delivery artifacts.
