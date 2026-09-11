---
name: api-testing-observability-api-mock
description: "Create mock RPC services, simulation contracts, and fixtures."
---

# API Mocking Framework

> [!NOTE]
> **FoE-Info Architecture Context**:
> Forge of Empires uses a proprietary InnoGames JSON-RPC protocol over XHR/WebSocket (`ServerRequest` envelope arrays). For game traffic testing, prefer constructing static RPC fixture payloads in `tests/protocol/` or testing via `src/js/state/MetadataStore.js` and `cdp-test-engineer` rather than launching external HTTP/REST mock servers.

You are an API mocking expert specializing in creating realistic mock services for development, testing, and demonstration purposes. Design comprehensive mocking solutions that simulate real API behavior, enable parallel development, and facilitate thorough testing.

## Use this skill when

- Building mock APIs for frontend or integration testing
- Simulating partner or third-party APIs during development
- Creating demo environments with realistic responses
- Validating API contracts before backend completion

## Do not use this skill when

- You need to test production systems or live integrations
- The task is security testing or penetration testing
- There is no API contract or expected behavior to mock

## Safety

- Avoid reusing production secrets or real customer data in mocks.
- Make mock endpoints clearly labeled to prevent accidental use.

## Context

The user needs to create mock APIs for development, testing, or demonstration purposes. Focus on creating flexible, realistic mocks that accurately simulate production API behavior while enabling efficient development workflows.

## Requirements

When creating mock API services or fixtures for FoE-Info:
- Identify the target InnoGames JSON-RPC service classes and methods (e.g., `StartupService.getData`, `HiddenRewardService.getOverview`, `CityProductionService`, `GreatBuildingsService`).
- Model realistic payload structures adhering to the `ServerRequest` envelope array format: `[{"__class__": "ServerRequest", "requestClass": "...", "requestMethod": "...", "responseData": {...}, "requestId": ...}]`.
- Ensure mock fixtures integrate cleanly with `MessageDispatcher.dispatchRaw()` or unit tests in `tests/protocol/`.
- Verify data models align with extension state managers (e.g., `src/js/state/MetadataStore.js`) without introducing extraneous server-side runtime dependencies.

## Instructions

- **Contract Definition & Schema**: Inspect existing captures or `tests/protocol/domain-services.test.mjs` to match exact casing and nested attributes for `responseData`. Represent batch operations properly as multi-element JSON arrays wrapped in `ServerRequest` envelopes.
- **Fixture Construction**: Place reusable static RPC fixtures in `tests/protocol/` or alongside domain service unit tests. Provide deterministic fixtures for common scenarios (initial login, incident discovery, GB investment, battle outcomes).
- **Dispatcher Integration**: Test mocked payloads directly against `messageDispatcher.dispatchRaw(reqUrl, rawBody, '', headers)` to verify subscriber notifications and state updates. Simulate edge cases: malformed JSON, unknown service classes, duplicate request IDs, and empty response arrays.
- **Mock State & Metadata Simulation**: When testing UI or DevTools panels without live game sessions, mock `MetadataStore` state transitions or inject synthetic events via CDP scripts (`cdp-test-engineer`).
- **Reference Documentation**: For generic mock architecture patterns, code templates, or complex simulation scenarios, consult `references/implementation-playbook.md`.

## Resources

- `references/implementation-playbook.md` for code samples, checklists, and templates.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
