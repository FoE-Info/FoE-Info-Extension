# Runtime Evidence And Tracing

Status: design, 2026-09-30. Existing verification capture is implemented; the
runtime correlation and collection extensions below are proposed. No live-browser
validation or new tracing instrumentation is claimed. Scope: passive traffic
intake through RPC routing, state updates and panel rendering, plus local gate
execution. [SECURITY.md](../SECURITY.md) owns observation and publication boundaries.

## Detected Mapping

- runtime-evidence: [docs/debugging.md](debugging.md), scoped console tags,
  [RPC log](../src/js/protocol/rpcRouter.js),
  [passive recorder](../scripts/record-live-rpc.mjs) and
  [verification capture](../scripts/verify-with-evidence.mjs).
- validation: [validation harness](validation-harness.md), existing npm profiles,
  source snapshots, stage logs and separate gate/test JUnit reports.
- ledger: PR descriptions and completion notes under
  [CONTRIBUTING.md](../CONTRIBUTING.md); [roadmap](roadmap.md) prioritizes this deferred design and [tasks](tasks.md) owns tracked implementation work.

Intake begins at the DevTools network listener or MAIN-world observer, crosses
an isolated bridge, and converges on
[networkListener.js](../src/js/protocol/networkListener.js) and RPC dispatch.
Admission tokens already carry generation/sequence for stale-work rejection.
The RPC buffer retains at most 500 entries with timestamps, class/method and
game request IDs; debug mode can retain full responses. Panel diagnostics carry
render sequences. These signals do not currently establish causal links between
intake, state commits and rendering. The recorder reports method counts rather
than response outcomes or traces, and prints the game URL even without its URL
option. Its output requires sanitization before sharing.

## ID Contract

- Run ID: UUID v4, matching the existing verification manifest. One ID per
  collection attempt, never reused on retries. Directory names may equal the UUID.
  Related verification and browser runs use separate IDs with `relatedRunIds`.
- Request ID: preserve the observed game RPC ID as `gameRequestId`, nullable.
  It is scoped to a local session alias and generation; it is neither globally
  unique nor authenticated. Allocate a local `observationId` per admitted intake
  envelope and `rpcIndex` per message within a batch. Repeated game IDs remain
  separate observations. Missing IDs never become fabricated game IDs.
- Transport IDs: CDP request IDs are separate from RPC IDs and scoped to target
  session and redirect hop. Store an explicit mapping when available. Independent
  bridge and DevTools observations remain separate unless identity is proven;
  time proximity or matching class/method alone is only a correlation candidate.
- Header propagation: do not add `X-Request-ID` or `X-Harness-Run-ID` to game,
  CDN, ranking or publication requests. This project has no owned server requiring
  header propagation. IDs travel in local evidence records and proposed
  extension-side diagnostic context, never game payloads or frame writes.

Proposed context is allocated inside the extension after intake validation:
`runId`, `sessionAlias`, `generation`, `observationId`, `rpcIndex` and nullable
`gameRequestId`. Pass it separately from domain payloads through routing and
async continuations. Do not trust page-supplied correlation fields. A render
record carries `renderSeq` and an array of causal observation IDs because updates
can coalesce. Use a bounded, opt-in local buffer, disabled by default, with
explicit dropped-event counts and teardown on run completion. No telemetry or
persistent game storage is added by this design.

## Artifact Bundle

Reuse ignored `build/` instead of creating another artifact root. Existing
verification defaults remain `build/verify-evidence`; select a unique directory
through `CI_TEST_EVIDENCE_DIR` when retaining history. Proposed browser bundles
use `build/runtime-evidence/<run_id>/`.

| Artifact             | Contract                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest.json`      | Run ID, schema version, profile, sanitized command/entry action, UTC start/end, runtime versions, source identity, result and artifact inventory |
| `summary.md`         | Expected/observed behavior, classification, supporting IDs, reproduction, limitations and missing evidence                                       |
| Existing gate files  | Console, stage JSON/logs and gate/test JUnit as documented in the validation harness                                                             |
| `events.jsonl`       | Proposed ordered local trace of admission, decode, route, state commit, render and error/drop boundaries                                         |
| `network.jsonl`      | Sanitized transport/RPC mappings, endpoint category, status, timing and failure reason; no bodies or full URLs                                   |
| `console.jsonl`      | Sanitized scoped messages with context IDs where supported                                                                                       |
| `interactions.jsonl` | Timestamped operator actions, expected outcomes and passive observation windows                                                                  |
| `screenshots/`       | Cropped/redacted panel evidence, indexed with capture time and causal IDs when known                                                             |
| `metrics.json`       | Counts, durations, buffer capacity, dropped events and capture coverage; measured values only                                                    |

The current gate manifest remains schema version 1 unchanged. A proposed browser
manifest uses its own versioned schema with `kind: browser`, `profile`, `command`,
`runId`, `relatedRunIds`, `source`, timestamps, `result`, `classification` and
`artifacts`. Each artifact record has relative path, SHA-256, size, redaction
status and collection status/reason. Missing evidence is recorded explicitly;
empty files do not establish successful collection. Write the initial manifest
and summary before attachment so setup failures leave evidence. Finalize
atomically on normal completion and graceful cancellation. A forced kill leaves
an incomplete run, never an inherited pass.

Trace records have schema version, run/observation IDs, event sequence, UTC time,
monotonic elapsed milliseconds, layer, event, outcome and sanitized reason.
Use monotonic durations within one collector clock; do not subtract timestamps
from unrelated browser clocks. Record parent observations for asynchronous jobs,
span start/end for duration, and explicit queue/drop/error events. Payload bytes,
player/entity identifiers, world hosts, chat text and storage snapshots are
excluded. If existing logs cannot carry IDs, record that coverage gap rather
than assigning guessed causality after collection.

## Collection Flow

1. Specify a neutral profile: target panel flow, expected behavior, fixture or
   operator-owned existing session, required metadata, observation duration and
   redaction policy. Record source digest and extension/browser build versions.
2. Create the manifest/summary and run ID. Check prerequisites with
   `npm run doctor -- --json --probe browser`. A readiness probe proves availability,
   not panel correctness. Keep endpoint discovery output private and sanitized.
3. Attach only to the existing browser. The operator authenticates and performs
   any game actions. Collection tools must not navigate, reload, click, type,
   change focus or write into game frames. Enable extension diagnostics through
   its panel when necessary; never dump raw debug responses into shared artifacts.
4. Start scoped console/network observation before the operator action, record
   the action time, and observe until the specified outcome or bounded deadline.
   Collect panel screenshots and trace boundaries, then record missing metadata,
   routing errors, stale-generation drops, render completion and buffer loss.
5. Stop collection, sanitize using field allowlists before durable writes, remove
   sensitive captures, inventory sanitized artifacts and finalize classification.
   Preserve incomplete status on interruptions. Never export raw HAR by default.
6. Run applicable fixtures/gates separately. Link their run IDs and source digests
   to the browser summary; a gate pass cannot substitute for observed behavior.

Existing auditable gate capture, with a unique directory:

```bash
run_id=$(node --input-type=module -e 'import { randomUUID } from "node:crypto"; console.log(randomUUID())')
CI_TEST_EVIDENCE_DIR="build/runtime-evidence/$run_id" npm run verify:evidence -- --profile docs
```

The wrapper generates its own manifest run ID; the shell UUID names the directory
only. Use the manifest ID in references. Select `full` for commit readiness.
Existing `npm run browser:record -- brave 30` supplies method-count observations
only; redact its host-bearing output and record that it lacks request mapping,
responses and screenshots. The proposed browser collector is not implemented.
Until then, manually assemble sanitized console/panel evidence and a manifest/
summary in the ignored bundle, explicitly marking unavailable trace boundaries.
No browser means fixture/gate evidence only and pending browser acceptance.

## Failure Classification

Keep execution result (`passed`, `failed`, `blocked`, `cancelled`, `incomplete`)
separate from attribution. Passing runs have null failure classification.

| Classification                  | Required evidence / interpretation                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code regression                 | Valid input reaches an owned layer, then the expected behavior fails; cite boundary logs or a reproducing fixture and a baseline when calling it a regression |
| Environment unavailable         | Browser/CDP, extension build, tooling or local setup unavailable; identify prerequisite and remedy                                                            |
| External dependency unavailable | Observed CDN/ranking failure, timeout or access/quota refusal; do not infer from missing traffic alone                                                        |
| Data missing                    | Required RPC/metadata was not observed or is incomplete; identify the absent prerequisite and collection window                                               |
| Not evaluable                   | Missing causal links, source mutation, truncation, ambiguous intake provenance or interrupted collection prevents attribution                                 |

For mixed failures record a primary classification plus contributing conditions.
A stale-generation drop can be expected behavior, not a failure. An unhandled
out-of-scope RPC is not automatically a regression. HTTP success does not prove
service processing or rendering. Absence of traffic cannot prove server failure.

## PR / Ledger Reference

Record manifest run ID, profile, source digest, bundle location or access-controlled
artifact link, result/classification, causal observation IDs, checks actually run
and unavailable boundaries. CI run/attempt IDs are upload identities, distinct
from the manifest UUID. Large or sensitive captures stay outside Git; small
sanitized summaries may appear in the PR or tracked completion note. Local paths
are local evidence only and require an approved transfer to be reviewable remotely.
Existing CI gate retention is 14 days; use the same default for local runtime
bundles, then delete unless needed for an active investigation. `npm run clean`
can remove evidence under `build/`. Review console text, argv, errors, URLs and
screenshots for credentials, private hosts, contact details and player names;
redaction applies to failure paths as well as successful collection.

Implementation acceptance for a future collector: success, pre-attachment failure,
missing browser, cancellation, batch RPCs, repeated/missing game IDs, overlapping
intake paths, async/coalesced renders, world-generation changes, bounded-buffer
loss and sensitive input all produce honest manifest/summary evidence. Verify
that no game requests, header modifications or automated game actions occur.
