# Repo Harness Assessment

Assessed 2026-09-30 against a clean working tree before this report update.
The mapped harness sources are Git-tracked. This report distinguishes local
implementation and verification from observed remote or browser results.

## Detected Mapping

| Role                        | State                                                   | Existing owner / surface                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrypoint                  | Mapped                                                  | [AGENTS.md](../AGENTS.md); [README.md](../README.md) is the contributor entrypoint.                                                                                                                                                                                 |
| Mirrors / subtree overrides | Intentionally omitted                                   | Only root AGENTS.md; no CLAUDE.md, GEMINI.md, Cursor or GitHub instruction entrypoints found.                                                                                                                                                                       |
| Work-state                  | Mapped                                                  | [Roadmap](roadmap.md) owns direction; [tasks](tasks.md) owns execution status, acceptance and completion evidence.                                                                                                                                                  |
| Ledger                      | Mapped, lightweight                                     | [CONTRIBUTING.md](../CONTRIBUTING.md#completing-tracked-work) defines completion evidence and task/change coupling; task notes, PR descriptions and [CHANGELOG.md](../CHANGELOG.md) retain delivery context. No separate ledger is required.                        |
| Contracts                   | Mapped, bounded                                         | [Architecture](architecture.md), [security](../SECURITY.md), [repository contracts](repository-contracts.md), RPC/i18n checks and reference/publication audits.                                                                                                     |
| Validation                  | Mapped                                                  | [Stage registry](../scripts/lib/validation-stages.mjs), [package.json](../package.json), [validation matrix](validation-harness.md), [doctor](../scripts/doctor.mjs) and [CI](../.github/workflows/ci.yml).                                                         |
| Runtime evidence            | Gate evidence implemented; browser correlation proposed | [Capture wrapper](../scripts/verify-with-evidence.mjs), source snapshots, stage logs/JSON, gate/test JUnit; [docs/debugging.md](debugging.md) owns diagnostics and [runtime-evidence.md](runtime-evidence.md) identifies proposed extensions.                       |
| Quality                     | Mapped                                                  | [Boundary baseline](../scripts/quality/repo-contracts-baseline.json), [coverage thresholds](../scripts/quality/coverage-thresholds.mjs), [bundle budgets](../scripts/quality/bundle-budget.mjs), lint/types and [Graphify report](../graphify-out/GRAPH_REPORT.md). |

### Existing specialist roles

| Definition                                                                | Responsibility                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [cdp-test-engineer](../.agents/agents/cdp-test-engineer.md)               | Existing-session browser/panel diagnostics, synthetic extension RPC cases, DOM checks and exception capture. Game observation remains passive. |
| [foe-combat-analyst](../.agents/agents/foe-combat-analyst.md)             | Combat, GBG, GE, QI and army mechanics from verified payloads.                                                                                 |
| [foe-economy-analyst](../.agents/agents/foe-economy-analyst.md)           | Great Buildings, investment math, production, settlements and resource economics.                                                              |
| [graph-knowledge-explorer](../.agents/agents/graph-knowledge-explorer.md) | Read-only graph investigation and verified dependency findings; the main agent owns writes.                                                    |

These definitions describe available roles and do not require delegation or
prove that a host has loaded them. No bundled reviewer definition exists in this
catalog; the main agent owns implementation review. Repository skills cover
panel/service scaffolding, extraction, localization, browser testing,
metadata/protocol investigation, graph maintenance, entrypoint maintenance and
release packaging. They supplement the owning documents.

## Entrypoint Decision

- **Canonical file:** retain AGENTS.md. First-read links, hard boundaries, minimum
  verification and precedence are discoverable by inspection within one minute.
- **Other instruction surfaces:** `.agents/rules/`, specialist definitions and
  skills are supplemental guidance, not competing entrypoints. `.codex/` and
  `.omp/mcp.json` are runtime configuration; the task tracker owns current work state.
- **Navigation changes:** none needed. README already links this report; detailed
  procedures remain in their owning documents. Reconciled supplemental references
  to an absent reviewer, browser launching and the obsolete Graphify artifact policy.
- **Drift prevention:** retain reference/publication checks and the regression
  comparing generated default MCP configuration with its shared output. No mirror
  generator is justified. Reference integrity and frontmatter checks do not prove
  semantic agreement; the canonical entrypoint and owning documents take precedence.

## Current State

Overall maturity is **established in the working tree, with broad mechanical
validation and gate evidence; remote success/failure uploads verified**.
This is a qualitative assessment rather than a numeric score.

- **Agent entrypoint:** compact navigation and explicit supplemental precedence;
  no competing root or subtree instruction files were found.
- **Source-of-truth docs:** architecture, passive observation, diagnostics,
  contribution policy and task state have named owners. Historical backlog
  findings are not current verification evidence.
- **Validation surface:** one ordered registry serves docs/static/full profiles,
  plain verification and capture. Full verification includes readiness, version,
  references, format, lint, types, architecture, RPC/i18n, tests, focused coverage,
  development build and production budgets. CI invokes `npm run verify:evidence`,
  which runs that full gate. Pre-push runs verify; pre-commit runs staged formatting/
  lint plus typecheck. Contributors still must run full verify before committing.
- **Runtime evidence:** the wrapper records source identity before/after, run ID,
  console and per-stage evidence, handles early failure and rejects source mutation.
  CI preserves installation logs and configures uploads after success or failure,
  named by run/attempt/SHA with 14-day retention. The earlier CI-capture recommendation
  is implemented, not an outstanding gap. Success and test-failure uploads were
  downloaded and inspected against their source SHAs.
- **Delivery/ledger:** completion notes require accepted behavior, actual checks,
  evidence identity and limitations, coupled to tracked status in the same change.
  Small maintenance work needs no new task, plan or standalone ledger.
- **Contracts/quality:** AST checks freeze specific dependency/browser-access debt
  and require stale allowances to shrink. They do not prove transitive dependency
  safety, arithmetic precision, input provenance or passive traffic behavior.
  Coverage is focused, not whole-repository coverage; Graphify is navigation evidence,
  not a passing quality gate.

## Implementation Status

The provenance, completion-policy and isolated-export slices are closed in
[tasks](tasks.md#reconciliation-evidence). The [validation harness](validation-harness.md)
records locally implemented readiness, feedback profiles, structured stage evidence
and CI wrapper/upload wiring. Its historical full-pass run is evidence for its
recorded snapshot, not this updated tree. [Runtime tracing](runtime-evidence.md)
is explicitly a design: causal intake-to-state-to-render IDs and a browser collector
have not been implemented. Do not reopen completed slices or present proposed
tracing as current capability.

## Gaps

1. **Live runtime proof is task-dependent.** Browser diagnostics and passive RPC
   recording exist, but causal collection is proposed and no live panel result
   was verified here. Method counts alone cannot establish rendering success.

## Current follow-through

[Roadmap](roadmap.md) owns outcome sequencing; [tasks](tasks.md) tracks execution. Workflow-contract regression
coverage is complete under [T402](tasks.md#t402-ci-capture-workflow-regression),
and remote success/failure artifacts have been inspected. Browser collection is deferred until a concrete
runtime investigation supplies expected behavior. Do not create a second task
queue from this assessment.

## Recommended Minimum Slice

- **First:** activate [T403](tasks.md#t403-passive-browser-acceptance) only for a
  bounded panel behavior and an available existing browser session.

## Do Not Build Yet

- Additional agent entrypoints, mirrors, catalogs, task boards or a ledger platform.
- A tracing backend, mandatory browser gate, broad collector implementation or
  quality dashboard without a concrete runtime investigation.
- A wider runtime/OS matrix or broad architecture checks without demonstrated drift.

## Validation Needed

This reassessment consulted the local graph and inspected current owners, registry,
workflow, hooks and specialist/configuration surfaces. Direct source owns the
conclusions because the graph excludes some tooling and pending additions.

The focused harness suites passed: **39 tests, no failures or skips**. T402 added
four workflow-contract tests, all passing; isolated mutations for capture bypass,
wrong upload directory, success-only uploads and missing stderr capture failed
as expected. Full `npm run verify:evidence` passed: **1,982 tests, no failures or
skips**, focused coverage, development build and production bundle budgets.
Run ID: `cfd5a383-8eec-45c1-9458-236d53c938af`; source digest remained unchanged.
Local artifacts are under `build/verify-evidence`. That run precedes these final
completion notes; `npm run verify:docs` and `npm run audit:refs` cover the notes
separately. Remote inspection found the active development ruleset blocks deletion and force
pushes; linear-history enforcement was added and read back successfully. It has
no mandatory pull request or pre-push status-check rule. Organization members
currently inherit write access. The authorized history replacement used an explicit
lease against the reviewed remote tip and a temporary user-only bypass; the active
rules and empty bypass list were restored and read back immediately. Only the local
sibling registry was removed from four unpublished historical trees; commit messages,
authorship, order and all other tree contents were retained. The registry remains local.

The isolated export passed with freshly installed dependencies. Published
[CI failure run 36764131911](https://github.com/FoE-Info/FoE-Info-Extension/actions/runs/36764131911), attempt 1,
retained its artifact after the missing-uvx test failure. The prerequisite fix
added uv/Python setup and full-profile readiness checks. Published
[CI success run 36765043577](https://github.com/FoE-Info/FoE-Info-Extension/actions/runs/36765043577), attempt 1,
passed all 13 stages: 1,984 tests, 1,983 passed, zero failures and one skip for
an unavailable optional sibling metadata corpus. Coverage, builds and budgets passed.
Both artifacts were downloaded; installation/console logs, stage JSON/logs,
gate/test JUnit, source SHA and unchanged source digests were checked.
Success source: `299dd2e1704ffc4619cd60ad4968626aba05c0d9`.
Manifest run ID: `4847a05d-0175-47cb-be10-33b23c370942`.
Source digest: `8eb288c6f7ef1ad97327af0b431377652ad4db961aa2a92b3298d56a5f11fff2`.
These results identify the published snapshot before this evidence-note update;
no browser session is claimed. Full `npm run verify` remains required before
committing later source changes.
