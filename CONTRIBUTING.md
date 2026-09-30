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

This checks environment readiness, then runs version and reference-integrity checks, formatting, linting, type
checking, architecture boundaries and historical debt, the RPC contract check, i18n parity across
all locales, the unit tests and focused coverage thresholds, and development
and production builds with the production asset budget. All of it must pass.

See the [validation harness design](docs/validation-harness.md) for the change-type
feedback matrix, readiness checks, profiles, stage reports and CI wiring. Partial feedback checks do not replace the full pre-commit gate.

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
| `uv`                                   | `mise run setup-full` / `node scripts/setup.mjs --full`               | Optional Python/AI agent toolchain bootstrap (`uv sync`). Plain `npm install` does not need it. |
| CDP-enabled Chrome on `127.0.0.1:9222` | `npm run metadata:download` / `scripts/download-offline-metadata.mjs` | Drives a Chrome instance over the DevTools protocol to ingest live InnoGames entity datasets.   |

With `mise activate` enabled in your shell, entering this repository activates
its existing uv-managed `.venv` automatically through
`python.uv_venv_auto = "source"` in `.mise.toml`. Run `mise run setup-full`
once to install it. `mise exec -- command` uses the same environment in scripts.

The core gate (`npm run verify`) needs Node.js, npm, Git, installed dependencies
and Bash for shared shell harness fixtures. A Chromium-based browser is needed
separately for manual panel testing.

### Node.js baseline

The baseline is **Node 26.8.2**. The version sources are:

- `package.json` `engines` — `>=26.8.2`
- CI (`.github/workflows/ci.yml`) — `26.8.2`
- local mise config (`.mise.toml`) and its lockfile — `26.8.2`
- `@types/node` — `^26.6.3` (Node 26 API declarations; package versions are
  independent of runtime patch versions)

CI and local mise verification use the same exact runtime. The engine range
sets the minimum supported version; setup checks the major, minor, and patch
before installing dependencies. Update the engine floor, CI pin, mise pin and
lockfile, and Node API declarations together when changing the baseline.

## Agent harness

AGENTS.md is the canonical repository entrypoint. The four specialist definitions,
project rules, skills, references, scripts, and harness tests in `.agents/` are
shared sources. Runtime configuration in `.codex/` and `.omp/`, and the roadmap and task tracker in
`docs/roadmap.md` and `docs/tasks.md`, are shared too. Credentials, installed
environments, and generated runtime state remain excluded. Keep task status and
long procedures in their owning documents instead of duplicating root rules.

`npm test` discovers application tests and `.agents/tests/` recursively. Harness
cases use fixtures and command mocks; they need no model server, API key, live
browser, or sibling repository. The Graphify lifecycle cases execute mocked shell
commands with Bash. The normal format, lint, and published-reference gates also
include harness sources. Missing optional runtime tools do not exempt shared
tests or documentation from validation.

### Completing tracked work

`docs/roadmap.md` owns direction, outcome priorities and sequencing.
`docs/tasks.md` owns task IDs, execution status, dependencies, acceptance criteria
and completion evidence. Superseded execution plans are removed rather than kept as competing work queues. When a change
completes, changes, or invalidates tracked work, update its relevant status in the
same logical change and commit. Keep decisions in their owning documents and
link them instead of duplicating them across records.

Update the owning design or policy first, then task scope, acceptance criteria and
status. Update the roadmap only when direction or outcome sequencing changes.
Execution steps belong under the relevant tracked task; create a
separate temporary plan only when coordination requires it, link it from that
task, and remove it once its decisions and remaining work are reconciled.

PR descriptions and commit bodies are the delivery record: link the task ID and its roadmap
priority, describe the resulting behavior, and identify the validated source
snapshot and artifacts. CHANGELOG.md owns release-facing changes; the store guide
owns listing metadata. Do not create a second ledger or task queue.

A completion note should name the accepted behavior, commands actually run and
results, evidence path or run identifier when available, and remaining limitations
or skipped checks with reasons and follow-up ownership. Required gate failures
block completion and commits; optional browser or external checks may remain
unrun only when stated explicitly. Mark work complete only when its acceptance criteria are met;
local success does not establish remote CI or live-browser success. Keep secrets,
private transcripts, captured sensitive payloads, and generated runtime artifacts
out of shared records. Small maintenance changes need no new task, plan, or ledger;
use the change description for their verification note.

Before committing, inspect `git status`, relevant unstaged diffs, and staged diffs.
Stage exact paths for one logical purpose, excluding unrelated work; avoid
`git add .` in a mixed worktree. Include the relevant task update, run the
required verification, then inspect the commit and remaining worktree state.

### MCP configuration

The source of truth is [.agents/mcp-registry.json](.agents/mcp-registry.json).
The shared [.omp/mcp.json](.omp/mcp.json) is generated from its **default** profile,
which enables only this repository's graph. Regenerate it with:

```bash
node .agents/scripts/mcp-profile.mjs default
```

A regression compares the shared config with generated default output. The
browser profile additionally enables Chrome DevTools; research/full profiles
are opt-in. To generate a sibling profile, supply explicit `FORGE_HAMMER_ROOT`,
`ORIGINAL_DIR`, `METADATA_DIR`, and `LOW_TOOL_ROOT` values for its requested
repositories. Missing values fail before configuration is written. Verify the
peer graph's existence, source, and labels before querying it.

Graphify servers use `uv run --project . graphify-mcp`, so they use this project's
Python declarations instead of an unrelated global installation. Run
`mise run setup-full` before using them. Execute profiles from the repository
root. Runtime activation can change the config; restore the default before a
shared commit so the drift check and fresh-copy behavior remain predictable.
Graphify MCP servers inherit provider credentials, base URL, and model from the
host environment; the registry does not pin a local inference provider. Load
your private environment before launching the agent host. The explicit local
Graphify scripts retain their own inference policy.

Codex permissions in `.codex/config.toml` are separate runtime settings and do
not duplicate AGENTS.md instructions. Hosts other than OMP are not claimed to
be supported by the MCP generator.

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

### Rebasing and the tracked graph

The shared graph indexes extension source under `src/` and selected canonical
project guidance, as defined by `.graphifyignore`: README, architecture, security,
debugging, contribution and agent entrypoint documents, repository contracts,
the validation harness, and `.agents/rules/`. Backlogs, proposal/design records,
generic skills, generated graph output, tests and tooling stay outside the graph.
Graph scope is independent of Git publication policy. Code is parsed through AST;
selected documentation is processed through model-based semantic extraction.

Commit `graphify-out/graph.json`, `GRAPH_REPORT.md`, and `graph.html` so developers
can query the graph or open its viewer immediately. Also share `manifest.json`
(relative-path fingerprints for incremental updates) and `.graphify_labels.json`
with `.graphify_labels.json.sig` (community names and membership signatures used
to validate them on refresh). Labels already embedded in `graph.json` suffice
for queries; the label sidecars help preserve names during later updates.
This follows [upstream team setup](https://github.com/Graphify-Labs/graphify/blob/v8/README.md#team-setup),
with portable label state included for our labeled graph workflow.

Other generated output stays local: caches, dated backups, optional exports,
analysis/learning sidecars, runtime markers, raw `memory/`, `reflections/`, and
`findings/`. Review useful findings against current source and incorporate
durable conclusions into their owning project documents, such as
`docs/architecture.md` or `docs/debugging.md`, rather than committing raw session notes.

`graphify-out/graph.json` is marked `merge=graphify` in `.gitattributes`, so git
resolves it with the union merge driver from `merge.graphify.driver` instead of
as text. A rebase that replays commits touching that file needs that driver
registered in the clone: without it git falls back to the default binary merge
and stops on an unmerged `graphify-out/graph.json`. `mise run setup-full`
installs the toolchain and registers a clone-local driver using
`uv run --project <clone> graphify merge-driver`. It preserves shared Husky
hooks; do not run upstream hook installation over these customized hooks.

The husky hooks already detect a rebase in progress — they test for
`$GIT_DIR/rebase-merge` and `$GIT_DIR/rebase-apply`, the same two directories
git creates mid-rebase — and exit before rebuilding, so replaying a run of
commits does not launch a graph rebuild per commit.

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
