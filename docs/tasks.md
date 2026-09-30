# Tracked tasks

[Roadmap](roadmap.md) owns direction, outcomes and sequencing. This file owns
concrete scope, dependencies, status, acceptance criteria and completion evidence.
IDs remain stable when priorities change. Statuses are `open`, `in progress`,
`deferred` and `done`; code presence or a historical gate pass alone does not close
a task. Update this file in the same logical change as the work.

## R0: Pending work acceptance

Direction: [roadmap R0](roadmap.md#r0-finish-pending-work).

### T001: Migration write and cleanup safety

**Status:** in progress. **Roadmap:** R0.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Migration: a replacement-write failure must propagate, leave legacy keys
intact, and avoid filling migrated memory caches. Cleanup runs only after a
successful write; cleanup failure reports a scoped warning and preserves the
replacement data. Test success, rejection, retry, and cleanup rejection.

**Acceptance:** Success, write rejection, retry and cleanup rejection fixtures prove the stated key/data invariants.

### T002: Explicit registration and callback delivery

**Status:** in progress. **Roadmap:** R0.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Registration: bootstrap supplies dependencies before first registration;
importing the registry must not register services. Repeated bootstrap preserves
the first configuration and delivers each route once. Update import-side-effect
tests and prove a supplied callback executes through an actual RPC route.

**Acceptance:** Importing the registry has no registration effect; repeated bootstrap delivers routes once and an injected callback runs through an RPC route.

### T003: Presentation callback ownership

**Status:** in progress. **Roadmap:** R0.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Callback wiring: complete service-to-presentation removal without extracting
startup coordinators or recreating panel micro-files. Review the pending
singleton callback configuration for accidental rebinding and module interop.
UI adapters own DOM lookup, popovers, translation application, and teardown.

**Acceptance:** Adapters own DOM, localization, popovers and teardown; fixtures prove callback delivery without accidental singleton rebinding.

### T004: Pending-source acceptance verification

**Status:** in progress. **Roadmap:** R0.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Restore full test/build evidence before closing any item. The latest complete
test run passed 1,978 tests, and the full capture gate passed; focused callback
acceptance and live-browser evidence remain distinct follow-through.

**Acceptance:** Focused acceptance fixtures and the full gate pass on the same snapshot; loading warnings are assessed and browser limitations recorded.

## R1: Domain boundaries

Direction: [roadmap R1](roadmap.md#r1-enforce-domain-boundaries).

### T101: Service presentation boundary behavior

**Status:** in progress. **Roadmap:** R1.

**Dependencies:** R0 registration/composition acceptance; preserve existing pending implementation.

**Scope:** Complete view/target callback injection for CityMap, GE, QI, and Conversation;
FP/reward/reset callbacks for Inventory, Great Buildings, donation, and GBG;
and presentation adapters for StartupService. Use the existing composition
point and state subscriptions. Do not add a generic event bus or a second
service registry.

**Acceptance:** Contract audit has no service/UI or calculator boundary debt, and feature fixtures prove callback behavior.

### T102: Domain inputs and startup lifecycle

**Status:** in progress. **Roadmap:** R1.

**Dependencies:** R0 registration/composition acceptance; preserve existing pending implementation.

**Scope:** Keep service inputs/outputs domain-oriented. Existing container-passing paths
need review for UI ownership even after their direct imports disappear.
Preserve startup barrier identity guards, metadata recovery, coalescing, and
boost updates; moving an import is not sufficient acceptance evidence.

**Acceptance:** Domain-oriented inputs preserve startup success/failure, barrier identity, stale completion handling, metadata recovery and boost refresh.

### T103: Goods formatter purity

**Status:** in progress. **Roadmap:** R1.

**Dependencies:** R0 registration/composition acceptance; preserve existing pending implementation.

**Scope:** Finish goods formatter separation: resolve names at composition, reuse the
existing era mapper, and pass current goods explicitly. Preserve grouped clan
boosts, tooltips, localization, and explicit rounding.

**Acceptance:** Explicit goods/name inputs preserve grouped boosts, tooltip localization and rounding; focused fixtures and contracts pass.

## R2: Cache and persistence lifecycle

Direction: [roadmap R2](roadmap.md#r2-repair-cache-and-persistence-lifecycle).

### T201: Persistent metadata admission

**Status:** open. **Roadmap:** R2.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Metadata hydration: `storageMetadataHydrator.js` admits persistent entries
without the version/seven-day checks in `MetadataResolver.js`. Add fixtures for
valid, expired, missing-timestamp, and incompatible-version entries at snapshot
and change-event intake. Reuse one admission policy; rejected entries must not
establish metadata readiness. Preserve live/legacy definition intake and
missing-entity recovery without changing stored formats.

**Acceptance:** Snapshot and change-event fixtures cover valid, expired, missing-timestamp and incompatible-version entries without rejected entries establishing readiness.

### T202: GB alias index cleanup

**Status:** open. **Roadmap:** R2.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** GB aliases: eviction deletes the canonical record before unindexing, while
registration can add multiple alias buckets. Reads filter missing records,
but that does not bound index retention. Reproduce eviction and alias-changing
re-registration; remove every derived reference and verify world reset clears
both indexes. Keep canonical capacity and owner lookup precedence.

**Acceptance:** Eviction, alias changes and world reset remove all derived references while preserving lookup precedence and capacity.

### T203: Metadata subscription reset lifecycle

**Status:** open. **Roadmap:** R2.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Metadata reset: check subscription ownership and reattachment after store reset;
prove updates still render once and stale completions cannot release a new
startup barrier. Preserve existing singleton stores unless evidence requires
a separate ownership change.

**Acceptance:** Reset and reattachment render updates once, and stale completion cannot release a new startup barrier.

### T204: Cross-context storage concurrency

**Status:** open. **Roadmap:** R2.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Storage concurrency: use two independent extension-context simulations to
reproduce same-field/global lost updates. Process-local queues are not a
cross-context guarantee. Specify a single writer only if a reproducer requires
it; disjoint per-field writes should continue to work.

**Acceptance:** Independent-context fixtures reproduce or rule out lost updates; any remedy preserves disjoint writes and states its concurrency guarantee.

## R3: Types and numerical semantics

Direction: [roadmap R3](roadmap.md#r3-expand-types-and-validate-numerical-semantics).

### T301: Incremental calculator type checking

**Status:** open. **Roadmap:** R3.

**Dependencies:** R1 formatter boundaries for affected goods paths; observed metadata for formula changes.

**Scope:** Opt spatial utilities into the passing check, then military boost extraction
and calculation. Add narrow entity/metadata-reader/callback JSDoc types; keep
strict checking and native Node/webpack loading behavior. Do not suppress the
wider audit or enable every runtime module at once.

**Acceptance:** Spatial utilities then military calculations join the passing strict check without any-based escapes or native/webpack loading regressions.

### T302: Production discrepancy fixtures

**Status:** open. **Roadmap:** R3.

**Dependencies:** R1 formatter boundaries for affected goods paths; observed metadata for formula changes.

**Scope:** Reproduce production discrepancies with realistic inputs: explicit zero random
reward probability currently falls through `dropChance || 1`; current versus
maximum goods-by-era boosts treat GB shares differently; goods classification
uses different exclusion sets; own-city set-adjacency results may not reach
production; era chronology and mapping accept different Discovery aliases.

**Acceptance:** Realistic fixtures establish expected zero probability, GB exclusions, adjacency and era aliases with explicit rounding; fix only demonstrated discrepancies.

### T303: Observed-metadata formula validation

**Status:** open. **Roadmap:** R3.

**Dependencies:** R1 formatter boundaries for affected goods paths; observed metadata for formula changes.

**Scope:** Check dual production-option paths, native-number accumulation, castle stage
approximations, static GBG attrition mappings, and Blue Galaxy optional goods
weighting against observed metadata before changing formulas. Distinct own/aid
production engines are not automatically redundant implementations.

**Acceptance:** Observed payloads establish expected production, attrition, castle and Blue Galaxy behavior before formula changes.

## R4: Focused follow-through

Direction: [roadmap R4](roadmap.md#r4-target-evidence-driven-follow-through).

### T401: Graphify source scope and labels

**Status:** open. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Add a Graphify scope regression that forbids generated memory/reflection nodes
after refresh, then verify semantic label freshness separately. Keep raw memory
provenance local; do not reindex its contents as repository source.

**Acceptance:** Refresh excludes generated memory/reflections; separately assess semantic extraction and label freshness. Ignore rules are already present; investigate only if refresh still violates them.

### T402: CI capture workflow regression

**Status:** open. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Add a workflow-contract regression for verification capture, evidence directory,
installation logs, and success/early-failure uploads. Avoid pinning incidental
YAML formatting or action versions. Inspect real uploads when publication is
authorized; remote CI and branch protection remain unverified.

**Acceptance:** Regression checks validate capture command, evidence path, installation logs and upload conditions; remote artifact claims require actual published run evidence.

### T403: Passive browser acceptance

**Status:** deferred. **Roadmap:** R4.

**Dependencies:** An available existing browser session and a bounded expected behavior.

**Scope:** Observe existing-session panel startup, world switching, rewards, target
dismissal, popovers, collapse/resize teardown, option saving, locale application,
keyboard/focus behavior, and heading semantics. Record unavailable browser
evidence explicitly. Game actions remain operator-owned.

**Acceptance:** Sanitized expected/observed notes cover the chosen panel behavior; unavailable checks remain explicit and game input stays operator-owned.

### T404: Template and clipboard input provenance

**Status:** open. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Review data provenance into HTML templates and clipboard/popover paths; preserve
escaping fixes. Encoding concerns do not by themselves prove CSP execution.
Do not resurrect the retired heuristic rule classifiers as security proof.

**Acceptance:** Trace real input into chosen templates/copy/popover sinks and provide a focused regression for each demonstrated defect.

### T405: Runtime intake and retention investigations

**Status:** open. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Triage actionable empty catches, floating promises, slow render freshness,
WebSocket frame filtering/correlation, reused-XHR listeners, and fallback-cache
retention with actual callers or measured behavior. Measure dedup collisions
with distinct same-length payloads before selecting a replacement policy.

**Acceptance:** Actual callers or measured fixtures demonstrate each chosen catch/promise, WebSocket, XHR, dedup or retention defect before changes.

### T406: Publication helper callsite audit

**Status:** open. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Audit callers of `renderGbgTargetMessage` before fixing or deleting its random
alert-ID mismatch. Keep `postData`: it has active transport callers. Remove
other publication helpers only after production callsite/export review, updating
affected tests and all seven locale dictionaries together.

**Acceptance:** Callsite/export evidence supports each deletion or fix; active postData remains and affected tests/locales are updated.

### T407: External export behavior decision

**Status:** deferred. **Roadmap:** R4.

**Dependencies:** An explicit product decision before changing configured export behavior.

**Scope:** Retain existing configured Discord/Sheets behavior pending an explicit product
decision. Validate/redact destinations and credentials; do not infer historical
provenance or gameplay writes from external HTTP posting.

**Acceptance:** An explicit product decision precedes behavior removal; destination validation and redaction are verified for any chosen change.

### T408: Measured diagnostics and performance maintenance

**Status:** deferred. **Roadmap:** R4.

**Dependencies:** None; reproduce the discrepancy before selecting a remedy.

**Scope:** Move remaining raw hot-path diagnostics to scoped logging where useful. Measure
bundle composition, startup, fonts/images, and rendering cost before lazy loading
or format changes. Locale alias deduplication is optional maintenance, not a
demonstrated player defect.

**Acceptance:** Measurements justify any optimization; affected behavior, accessibility and locale checks pass.

## Reconciliation evidence

The reviewed graph had 2,570 nodes, 4,716 edges, and 242 named communities;
SHA-256 `8ff25c61eeb790feda0f5b58093e93d84fb0fdf57444028c1eafc0c1864ff095`.
Memory records include repeated node/edge inventories and source witnesses;
these are coverage evidence, not hundreds of independent tasks. The corrected
reconciliation uses native hyperedge IDs. An undirected graph, export references,
or indirect-call edges do not establish execution, callback identity, or runtime
ordering. Saved findings must be checked against changed source. Six guide/rule
extraction fingerprints were stale in the saved reconciliation. The subsequent
AST refresh indexed 2,670 generated memory nodes despite the intended scope.
An explicit generated-directory exclusion was added, those generated-only AST
nodes and incident edges were removed, and native reclustering regenerated the
report/viewer: 2,584 nodes, 4,747 edges, 233 communities, zero generated-source
nodes. Upstream refresh retention needs a regression investigation; a second
refresh with the exclusion alone did not evict the existing memory nodes.
Community labels need semantic refresh before treating the new clusters as topics.
The original memory coverage is not coverage of this updated graph.

## Already implemented: preserve, do not repeat

| Capability                   | Current source evidence and disposition                                                                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional consolidation     | Network intake, startup phases, GBG helpers, domain stores, and feature panels are consolidated. `ui/renderBindings.js` explicitly initializes bindings and returns teardown. Supporting tables/renderers may remain when cohesive.                                    |
| Calculation separation       | Own/visited calculators receive metadata stores; the visited singleton is composed outside `calc/`. Shared FP helpers and harvest accumulation use explicit BigNumber rounding. Preserve naming fallbacks that do not replace resolved metadata or numeric statistics. |
| Intake correctness           | Origin/URL validation, trusted WebSocket destinations, ordered dispatch, generation checks, bounded replay suppression, and listener teardown exist. A generation guard does not cancel already running work; sampled dedup keys do not prove full equality.           |
| Session and storage behavior | World settings are applied before stale switch completions are discarded. Per-field world writes, observable save failures, and process-local global write queues exist. Cross-context atomicity is not established.                                                   |
| Bounded caches               | Canonical GB registry capacity, player-name cache limits, persistent metadata pruning, and a bounded metadata URL cache exist. Derived alias indexes and hydration admission still need work below.                                                                    |
| UI/input handling            | Existing escaping fixes, popover/resize lifecycle work, synchronous language bootstrap, seven-locale parity, and referenced-key checks exist. These are bounded checks, not an exhaustive browser or input-provenance audit.                                           |
| Toolchain and quality        | Node pins, shared harness publication policy, readiness, named verification profiles, architecture debt checks, focused coverage, asset budgets, and reproducible font subsetting exist. Do not recreate these harnesses.                                              |
| Verification provenance      | Local manifest/source identities, stage logs/JSON/JUnit, isolated-export verification, and CI capture configuration exist. Local artifacts do not prove remote CI upload or live-browser correctness.                                                                  |

The former plans were removed after reconciliation. Their useful rationale is
represented above and in the owning documents. Their obsolete line anchors,
line-count targets, repeated fixes, and proposed module conversions are not
instructions to execute.

## Completion and verification

Update task status here with the implementation and its actual validation results.
Run affected tests plus contract/type/RPC/i18n checks, callsite audits for removed
symbols, default-argument audits for changed defaults, and reference audits after
moves/deletions. Every commit requires `npm run verify`; fresh-copy changes also
need isolated-export evidence. No extra ledger is required.

The full capture gate passed on 2026-09-30 with 1,978 tests, focused coverage,
development/production builds, and production asset budgets. Its run ID was
`a4df61dd-a0d7-4aad-b595-e3141d5eda9b`, with `sourceChanged: false`; that run preceded the documentation reorganization recorded below.
Documentation/reference success and a zero-debt structural report do not prove
all pending behavioral acceptance. Keep local, remote, fixture,
and live-browser evidence distinct. Raw Graphify memories/reflections remain local
provenance and are not authoritative task lists.

### Documentation reconciliation delivered

Project guides now use lowercase kebab-case filenames under `docs/`; conventional
repository entrypoints retain their root names. [The index](index.md) assigns
design, work state, acceptance, delivery and artifact ownership. The four
superseded OMP plans and TODO compatibility pointer are removed. Contribution
policy couples design and task updates to the same logical change and uses
PR/commit descriptions for delivery evidence. Reference tooling follows the new
architecture path and no longer exempts retired plans.

The reorganized source passed the full capture gate on 2026-09-30, run
`c7eb2554-a564-46aa-95d2-928bc696c351`, with `sourceChanged: false`: 1,978 tests,
focused coverage, development/production builds and bundle budgets passed.
This completion note and explicit memory ignore rules were added afterward and
checked with documentation/reference validation. No commit, remote CI run or
live-browser verification was performed. Semantic graph extraction remains a
separate follow-up; AST refresh and generated-memory exclusion were reconciled.
