# FoE JSON-RPC Reverse-Engineering Playbook

Use this reference after selecting `protocol-reverse-engineering`. It documents the evidence path; `add-rpc-service` owns implementation after the contract is verified.

## Evidence path

1. Start with an existing redacted fixture under `tests/fixtures/` or a user-supplied capture. Do not intercept a live session unless the user explicitly authorizes it.
2. Preserve both halves of the envelope when available:
   - `ServerRequest`: `requestClass`, `requestMethod`, `requestData`, `requestId`.
   - `ServerResponse`: `responseData`, `requestId`, and any echoed route fields.
3. Correlate by `requestId`. A nearby array element is not proof that a request and response belong together.
4. Compare the observed route against `src/js/msg/registerServices.js` and neighboring modules in `src/js/msg/`.
5. Compare payload-derived state with the matching tests in `tests/msg/`, `tests/state/`, `tests/parsers/`, or `tests/ui/`.

## Contract template

```markdown
Service: <observed requestClass>
Method: <observed requestMethod>
Request data: <shape and optionality>
Response data: <shape and optionality>
Identifiers: <meaning and evidence>
State transition: <before -> after>
Unknowns: <unproven assumptions>
Evidence: <fixture/capture paths>
Required tests: <narrow commands>
```

## Schema discipline

- Mark a field required only when every relevant sample and existing parser requires it.
- Distinguish absent, `null`, empty array, empty object, and zero; they are not interchangeable.
- Resolve dynamic building, era, goods, and unit facts from metadata rather than embedding captured values.
- Preserve raw unknown records long enough to diagnose them, but do not retain unbounded traffic history.
- Redact player IDs, names, world IDs when identifying, request tokens, cookies, and session values before saving evidence.

## Implementation handoff

A contract is ready for `add-rpc-service` only when:

- the service and method are observed, not guessed;
- request/response correlation is proven;
- malformed and partial payload behavior is specified;
- state ownership and registration location are identified;
- a redacted fixture can reproduce the expected parser result;
- narrow tests are named.

If any condition is missing, report the gap and stop rather than constructing a speculative handler.

## Verification examples

Use the narrowest existing command that covers the route, for example:

```sh
node --test tests/msg/<feature>.test.mjs
node --test tests/state/<feature>-state.test.mjs
node --test tests/parsers/<feature>-parser.test.mjs
```

Then run `npm run verify` before claiming repository integration is complete.
