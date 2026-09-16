---
name: protocol-reverse-engineering
description: Analyze FoE JSON-RPC payloads and document handlers.
---

# Protocol Reverse Engineering

Derive Forge of Empires service behavior from observed InnoGames JSON-RPC traffic. This skill owns capture analysis and protocol contracts; use `add-rpc-service` only after the contract is verified and implementation begins.

## When to Use

- A live game feature has no documented service or method.
- A handler disagrees with a captured payload.
- Metadata, request, response, or registration behavior must be mapped.

Do not use this skill to invent payload fields from UI behavior alone.

## Inputs

Require at least one redacted capture or fixture containing the full envelope. Preserve `__class__`, `requestClass`, `requestMethod`, `requestId`, `requestData`, and `responseData`. Remove player identifiers, session material, and credentials before committing fixtures.

## Procedure

1. Read `../../references/foe/game-data-protocol.md` for verified envelope and service facts.
2. Read `references/implementation-playbook.md` for the repository evidence path.
3. Correlate request and response envelopes by `requestId`; never read `responseData` from `ServerRequest`.
4. Compare at least two payloads when classifying optional fields, arrays, identifiers, timestamps, or state transitions.
5. Record a protocol contract containing service, method, envelope, schema, unknowns, source evidence, and fixture path.
6. Validate malformed, missing, empty, partial, and unknown-entity cases before handing off to `add-rpc-service`.
7. Run the narrow parser/state tests selected by the changed domain, then `npm run verify`.

## Invariants

- Observed payloads outrank names inferred from game UI labels.
- Dynamic entity data comes from `StaticDataService.getMetadata`; do not hardcode changing stats.
- Unknown entities and partial payloads must fail safely.
- RPC diagnostics use the module logger: silent normally, structured in debug mode.
- Use `BigNumber` for values covered by the precision rule.
- Bound retained capture/event buffers for long browser sessions.

## Deliverable

Return the verified service/method contract, evidence locations, remaining unknowns, and the exact tests an implementation must pass. Stop when the envelope shape is ambiguous or the available evidence cannot distinguish competing interpretations.

## References

- `../../references/foe/game-data-protocol.md` — observed FoE envelope, service, metadata, precision, and interception facts.
- `references/implementation-playbook.md` — fixture-first repository workflow.

## Reference Catalog

- [Reference catalog](references/README.md) — load only task-relevant supporting material.
