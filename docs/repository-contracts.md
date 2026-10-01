# Repo Contracts And Boundaries

## Protected Boundaries

AST extraction covers literal CommonJS requires, ESM imports, dynamic imports and reexports. Calculators and parsers cannot add dependencies on UI, bindings, services or protocol. Services cannot add UI imports. Direct member access on `document`, `window`, `$` and `jQuery` is blocked in these domain layers.

This is a bounded structural check: aliases, computed imports, bare browser identifiers, transitive dependencies and HTML strings require review. It does not establish arithmetic precision, absence of static metadata, or passive network behavior; existing domain tests and security review remain necessary. Do not infer those properties from a clean boundary report.

## Diff Checks

`npm run contracts:diff` scans working-tree files changed against HEAD, including staged changes and nonignored untracked source. Use `npm run contracts:diff -- --base development` to include branch changes. New paths and new dependency targets have zero allowance. A replacement dependency cannot borrow another target's allowance. Editing the baseline or checker triggers a full scan even in diff mode, so allowances for unchanged or deleted source cannot escape validation.

## Audit Checks

`npm run contracts:audit` scans all runtime `.js`, `.mjs` and `.cjs` modules and runs in the verification gate. Historical violations are printed as debt even when the command succeeds. Removed or reduced debt fails until its allowance is removed or lowered. Parse errors fail closed and identify the source path.

Module line counts over 500 are informational cohesion prompts, never size gates. They appear with paths in JSON output. Follow the functional-cohesion guidance below rather than splitting solely to lower a count.

## Baseline / Allowlist Policy

The [baseline](../scripts/quality/repo-contracts-baseline.json) recorded 14 dependency targets at rollout. The current pending boundary cleanup has removed all entries; the full contract audit must stay green. Each entry requires a path, rule, exact target, occurrence maximum, owning area, reason and repayment direction. There are no blanket directory exceptions.

Maintainers review baseline changes with the implementation. Lower or delete entries as debt is repaid; never regenerate the baseline to make a failing gate green. A new or increased exception requires an explicit architecture decision, an accountable owning area, a concrete reason and repayment note in the change description. The checker validates metadata and duplicates; review enforces approval and the substance of those notes.

## Generated Reports / Snapshots

`npm run contracts:audit -- --json` emits current evidence, including its source command, comparison base, scan scope, paths, counts, allowances, debt, regressions and large-module metrics. Reports are generated on demand; no committed snapshot can become silently stale. The baseline is reviewed policy, not an automatically refreshed report. Existing coverage and bundle reports retain their own source commands.

## Garden Loop

Run the audit, select one presentation dependency, inject a UI callback or move its rendering to UI, and lower or remove its baseline entry in the same change. Run diff and audit checks plus the relevant feature tests. Finish with the full verification gate. Repay one coherent boundary at a time; no aggregate quality score obscures remaining debt.

## Failure Message Shape

Findings name path, rule, exact target/global, current count, threshold, reason and suggested direction. JSON also distinguishes permitted historical debt from regressions. Stale entries identify the path, target and old maximum to remove or lower.

## Rollout Plan

The full audit gate starts immediately with explicit historical allowances. Diff checks provide a faster local loop. Existing RPC/i18n, coverage and asset gates remain authoritative for their contracts; future checks should protect a demonstrated risk with a repeatable collector before adding thresholds.

## Module cohesion

- **Cohesion Over Line Count**: A module holds one thing that changes for one reason. Length is a symptom, not the defect. Split when two parts change independently or on different schedules — for example when a user would name them as separate features, or when one part is arithmetic and the other is markup. Do **not** split sequential phases of a single operation; that only adds coupling.
  - Target range is 100–300 lines per module in `src/js/`. Modules that exceed it are expected: `msg/StartupService.js` and `msg/GuildBattlegroundService.js` are single-domain modules whose phases share one state owner, and `protocol/networkListener.js` is the intended result of consolidating that file's phases, which deliberately reversed an earlier micro-file split. Read current sizes from the audit below rather than from numbers copied here.
  - `npm run audit:refs -- --strict` lists modules over 500 lines. Treat that list as a prompt to check for a feature boundary, not as a violation to fix by splitting.
