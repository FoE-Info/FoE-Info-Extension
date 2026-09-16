# FoE-Info API and Message-Handler Test Playbook

Use this reference when testing browser-extension boundaries, InnoGames message handlers, storage adapters, and observable state changes.

## Test surfaces

| Surface | Typical source | Typical tests |
| --- | --- | --- |
| InnoGames RPC route | `src/js/msg/*Service.js` | `tests/msg/*.test.mjs` |
| Parsed domain state | `src/js/state/` | `tests/state/*.test.mjs` |
| Payload parser | parser module | `tests/parsers/*.test.mjs` |
| Browser storage or runtime bridge | extension adapter | `tests/ui/` and `tests/helpers/` |
| Logging/diagnostics | module logger | `tests/utils/logger.test.mjs` |

## Fixture rules

1. Build the smallest real-shaped JSON-RPC envelope needed by the handler.
2. Preserve `requestClass`, `requestMethod`, `requestId`, `requestData`, and `responseData` semantics.
3. Redact player, world, and session identifiers before committing a fixture.
4. Include malformed, absent, empty, and unknown-entity variants when the handler branches on shape.
5. Assert the observable state or emitted bridge event, not private helper calls.

## Browser API doubles

Mock only the browser boundary. Keep parser, state, and handler code real.

- Create fresh `browser.storage` data per test; never share mutable state across files.
- Model callback and Promise behavior according to the production adapter.
- Verify listeners are registered once and cleaned up where the lifecycle supports cleanup.
- Restore globals after each test so unrelated Node tests cannot inherit an extension mock.

## Observability contract

- Standard mode remains silent.
- Debug mode emits structured route and state-transition facts without raw credentials or complete player payloads.
- Expected malformed input may log a bounded warning but must not throw through the dispatcher.
- Long-lived arrays and event buffers have an explicit cap and a boundary test.

## Verification

Run one focused file first:

```sh
node --test tests/msg/<feature>.test.mjs
node --test tests/state/<feature>-state.test.mjs
node --test tests/parsers/<feature>-parser.test.mjs
```

Then run `npm run verify`. A passing isolated mock with failing integration tests is not complete.
