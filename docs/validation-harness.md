# Validation Harness Design

Status: implemented locally on 2026-09-30. Readiness, named profiles, stage JSON/
JUnit reports and CI capture wiring are repository sources. Remote workflow runs,
artifact uploads remain unverified; development rules were inspected and updated
on 2026-09-30 to preserve direct maintainer pushes with linear history.
[CONTRIBUTING.md](../CONTRIBUTING.md) continues to own delivery policy.

## Detected Mapping

| Role             | Existing owner                                                                                                                                                 | Gap                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Validation       | [package.json](../package.json): `npm run verify`, focused checks, setup and isolated export                                                                   | Read-only readiness and docs/static/full profiles implemented       |
| Runtime evidence | [docs/debugging.md](debugging.md), [capture wrapper](../scripts/verify-with-evidence.mjs), [test runner](../scripts/run-tests.mjs)                             | Overall provenance plus per-stage JSON/logs and separate gate JUnit |
| CI               | [verification](../.github/workflows/ci.yml), [CodeQL](../.github/workflows/codeql.yml), [dependency review](../.github/workflows/dependency-review.yml)        | Shared capture wrapper and success/failure uploads configured       |
| Quality          | [coverage](../scripts/quality/coverage-thresholds.mjs), [bundle budget](../scripts/quality/bundle-budget.mjs), [repository contracts](repository-contracts.md) | Coverage and bundle diagnostics are primarily human-readable        |

The full gate already checks version, published references, formatting, lint,
types, architecture contracts, RPC fixtures, locale parity, application and harness
tests, focused coverage, development build, and production bundle budgets.
Test discovery recursively includes `tests/` and `.agents/tests/`. Coverage has
its own focused test selection; it does not measure every discovered test or module.
The capture wrapper writes a schema-versioned JSON manifest and console log;
the test runner writes JUnit when `CI_TEST_EVIDENCE_DIR` is set.

## Change-Type Matrix

These are minimum feedback checks during development. Every commit still requires
the entire `npm run verify` gate. Mixed changes take the union of applicable rows;
uncertain scope escalates to the full gate. No automatic path classification may
weaken that policy.

| Change type                                            | Minimum check using existing commands                                                   | Escalation / additional evidence                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Documentation and agent instructions                   | `npm run check`, `npm run audit:refs`, `npm run audit:refs:published`                   | Run affected harness tests when instructions alter executable tooling or configuration                                       |
| Scripts, agent harness, CI or validation configuration | `npm run lint`, `npm run typecheck`, `npm test`                                         | Full gate; use `npm run verify:export` when setup, publication or fresh-copy behavior changes                                |
| Layer ownership, module movement or imports            | `npm run contracts:diff`, `npm run lint`, `npm run typecheck`, affected tests           | `npm run contracts:audit`; `npm run audit:refs` after moves; `npm run audit:callsites` for removed or renamed symbols        |
| RPC handlers, intake or state lifecycle                | `npm run rpc:contract:check`, `npm run contracts:diff`, `npm run typecheck`, `npm test` | Protocol/security fixtures, ordering and teardown cases; passive browser observation when cross-context behavior changes     |
| Calculation, FP precision, boosts or locks             | `npm run typecheck:calc`, affected calculation/math tests                               | `npm run test:coverage` and integration fixtures for service consumers; explicit BigNumber rounding edge cases               |
| UI, HTML, styles or translations                       | `npm run i18n:check`, `npm run lint`, affected UI/i18n tests, `npm run build:dev`       | Browser panel smoke for visual layout, keyboard access, popovers and resize behavior; production budget for asset changes    |
| Parameter default changes                              | Affected behavioral tests and `npm run audit:default-args`                              | Check callers covered by the documented audit limitations; run the containing layer's checks                                 |
| Dependencies, bundling, fonts, manifest or packaging   | `npm run version:check`, `npm test`, `npm run check:bundle-budget`                      | Full gate and fresh export; inspect an unpacked production build; package tests and archive inspection for packaging changes |

Focused test invocations use explicit existing paths, for example:

```bash
node --test tests/scripts/run-tests-evidence.test.mjs tests/scripts/verify-with-evidence.test.mjs
```

Do not pass file selectors to `npm test`: its wrapper appends all discovered test
files. Use `npm test` whenever a complete application/harness suite is needed.
After changes to `src/`, refresh the local Graphify AST as required by AGENTS.md.
That refresh is additional structural maintenance, not runtime proof.

## Command Surface

Retain npm as the canonical surface; mise remains a convenience wrapper. Avoid
adding a Python validator or a second copy of the gate.

| Interface                                       | State       | Responsibility                                                                                                                           |
| ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run setup`                                 | Existing    | Install dependencies and apply local Git rebase defaults; mutates setup                                                                  |
| `npm run verify`                                | Existing    | Required full gate; preserves nonzero child failures                                                                                     |
| `npm run verify:evidence`                       | Existing    | Same gate with JSON provenance, console and test JUnit artifacts                                                                         |
| `npm run verify:export`                         | Existing    | Export pending publishable regular files outside the repo, initialize an index, install fresh dependencies and run captured verification |
| `npm run browser:check`                         | Existing    | CDP availability probe; no proof of panel correctness                                                                                    |
| `npm run doctor`                                | Implemented | Check core prerequisites without installing, building, contacting game servers or changing Git configuration                             |
| `npm run verify:docs` / `npm run verify:static` | Implemented | Reuse one ordered stage registry for docs, static and full checks; never infer commit readiness from a partial profile                   |

The [readiness script](../scripts/doctor.mjs) uses Node built-ins and works before
`npm ci`. It reports missing dependencies instead of installing them.
Check the engine floor from package.json, npm availability/version, lockfile
presence, required dependency resolution, and Git/index availability for published
reference checks. Report missing prerequisites with a remedy. Keep `setup` separate.
Bash is needed by shared shell harness fixtures; uvx is required by the full
gate for font-subsetting tests. CI installs uv and selects Python before running
the gate. FontTools/Python may be downloaded by uvx on a cold run. Graphify readiness belongs
in an explicitly requested optional probe. Browser, zip and authenticated GitHub
CLI probes likewise belong to their workflows, not the core gate.

Named profiles use a [shared stage registry](../scripts/lib/validation-stages.mjs)
and [runner](../scripts/lib/validation-runner.mjs) consumed by plain verification
and evidence capture. Readiness runs first, followed by the previous full-stage
order with fail-fast behavior. Docs selects version/reference/format checks, static
adds lint/types/architecture/RPC/i18n, and full adds tests/coverage/builds/budget. Focused
behavioral tests remain explicit selections from the matrix. Do not add smart
changed-file selection until its dependency coverage can be verified.

## Report Outputs

### Existing artifacts

`npm run verify:evidence` defaults to `build/verify-evidence/`. Set
`CI_TEST_EVIDENCE_DIR` to select another directory. It records:

- `manifest.json`: schema version 1, UUID run ID, timestamps, argv, runtime, Git
  revision/dirty state, source digests before/after, result, exit code and signal.
- `verify-console.log`: streamed stdout/stderr from the full gate.
- `junit.xml`: Node test-case results if verification reaches `npm test`.

Each capture replaces the previous console/manifest and clears old JUnit before
execution. An interrupted manifest can remain `running`. Absence of JUnit means
tests did not produce a report; it must never be interpreted as zero failures.
JUnit covers the suite invocation, not lint, builds or the separate coverage gate.
The isolated export also records `export.json` and individual setup-step logs.
Repository contracts already offer JSON via `npm run contracts:audit -- --json`.

### Stage report contract

`stages.json` uses `schemaVersion: 1`; the existing manifest keeps its schema. Both files
share `runId`. The report contains profile, overall status, ordered cases and
artifact-relative paths. A stage record has the following stable shape:

```json
{
  "id": "rpc-contract",
  "layer": "contracts",
  "command": ["npm", "run", "rpc:contract:check"],
  "cwd": ".",
  "status": "failed",
  "startedAt": "2026-09-30T10:00:00.000Z",
  "finishedAt": "2026-09-30T10:00:01.000Z",
  "durationMs": 1000,
  "exitCode": 1,
  "signal": null,
  "reason": null,
  "paths": [],
  "artifacts": ["stages/rpc-contract.log"]
}
```

Allowed stage statuses: `pending`, `running`, `passed`, `failed`, `blocked`,
`skipped`, `cancelled`. IDs describe checks and remain stable across refactors.
Paths are repository-relative diagnostic locations when a checker supplies them;
an empty array is honest when a child only emits console diagnostics. Commands
are argv arrays; never embed secrets or complete environment dumps.

Initialize all selected cases before spawning children, save updates atomically,
and preserve raw child exit codes/signals. Record later stages as blocked with
reason `prior-stage-failed` after fail-fast termination. Optional omissions need
a concrete reason such as `browser-unavailable`; checks outside a profile use
`not-selected`. A required failure, block, cancellation or skip prevents a full
pass. Interrupted runs retain an incomplete status; source changes invalidate
attribution even when the child exits zero.

Keep native `junit.xml` for individual Node tests. The separate
`gates.junit.xml` report is generated with one case per gate stage, stable suite/class names, stage
logs linked in system output, failures containing argv/exit/signal/log location,
and blocked/skipped cases represented with explicit reasons. JSON remains the
source for distinctions JUnit cannot express. Readiness failures must produce
reports even when dependencies are absent. Escape XML correctly; never synthesize
passing test cases when tests have not run.

Regression acceptance: success; early failure before tests; test failure; missing
executable; signal interruption; success followed by early failure with no stale
JUnit; source changes; Unicode/XML-special diagnostics; optional probe unavailable;
and isolated export without private services. Assert reports and exit behavior
using fixtures rather than deliberate failures in the real gate.

## CI Gates

Keep the existing `Verify` job on pushes and pull requests to `development`, on
the pinned Node runtime, using `npm ci` with hooks disabled. It must run the same
full gate as contributors. CI wiring replaces the bespoke verification tee pipeline
with the capture wrapper, retaining `CI_TEST_EVIDENCE_DIR` at
`build/ci-evidence`. The workflow uploads that directory after verification on both success
and failure, using the existing run/attempt/SHA artifact naming. Upload failure
must not conceal a failed validation exit. The wiring is implemented locally; an uploaded artifact requires a remote run.

Stage reports are included in the same artifact. The installation step captures
`install-console.log` separately so an `npm ci` failure is visible even though
verification never started. Cancellation may interrupt artifact upload; a missing
artifact cannot establish success. Retention is configured at 14 days. The local
full-run evidence measured 1,560,826 bytes (about 1.5 MB); revisit retention if
run frequency or artifact volume grows.

Preserve CodeQL and dependency review as separate checks. Dependency review
currently rejects high-severity findings. Repository developers and organization members with write access push directly
after local verification; external contributors use fork pull requests. The
inspected active ruleset enforces linear history and blocks force pushes and
deletions, without requiring pull requests or pre-push status checks. Verify and
CodeQL run after direct pushes; dependency review runs on pull requests. Do not add path
filters that can strand required checks or let configuration changes bypass them.

Use one pinned Linux runtime for the minimum gate. A wider OS/runtime matrix is
justified only by a supported environment or reproduced portability defect.
Live-game/browser checks stay outside unattended CI because they need an existing
user session. A future hermetic extension-page smoke job must use synthetic data
and follow SECURITY.md; it must not issue game requests or automate gameplay.

## Fallback / Skip Policy

- Missing Node/npm/dependencies: fail readiness, name the prerequisite, and use
  the documented setup. Never replace the full gate with a successful probe.
- Browser unavailable: run fixtures and builds, record the missing browser check
  and its behavioral scope. Keep browser acceptance pending when required.
- Graphify unavailable: report the AST refresh as pending separately; static or
  runtime tests do not replace it. Core CI continues without model credentials.
- No Git history/index: Git-dependent checks need the documented export index or
  a checkout; nullable provenance fields alone do not exempt those checks.
- Fresh-copy uncertainty: use the existing isolated export; retain its directory
  and evidence path. Local export success does not establish remote CI success.
- Network unavailable during installation: record installation as blocked. Cached
  dependencies can support local feedback, but cannot prove a fresh install.

### Usage and delivery limits

```bash
npm run doctor
npm run doctor -- --json --probe browser
npm run verify:docs
npm run verify:static
npm run verify:evidence -- --profile full
```

The doctor exits nonzero for missing required prerequisites. Optional probe failures are
recorded as skipped with a remedy. Docs readiness checks formatting dependencies;
static/full readiness checks all declared packages, and full additionally checks
Bash and uvx. Type-only packages are checked through their package manifests.

Graceful SIGINT/SIGTERM cancellation forwards the signal to the active process
group on POSIX, records cancellation and blocks subsequent stages. Forced kills
can leave evidence marked running. Source mutation invalidates capture and adds
a provenance failure to gate JUnit while preserving the raw gate exit in the
manifest. No browser/game activity is part of the core gate.

Remote rules were inspected on 2026-09-30 and linear-history enforcement was
added to the existing deletion/force-push protections. Direct maintainer pushes
remain allowed. No release was created.

## Local Verification

The full captured gate passed on 2026-09-30: 1,961 tests, no failures or skips,
all focused coverage thresholds, development build and production bundle budgets.
Run ID: `2c1d011e-b387-4ae4-8acb-b2b8f1fc6f94`; source digest stayed unchanged.
ESLint retained 194 existing warnings, and production webpack retained 11 warnings.
That run preceded the final documentation/retention update; it is evidence for its
recorded source snapshot. Reports are retained locally under `build/verify-evidence`.
The failure-path fixtures also passed. No remote CI or live-browser result is claimed.
