---
name: refactor-index-slice
description: 'Extract modular domain services from monolithic index.js.'
---

# Workflow: Refactor Monolithic Index Slice

This skill outlines the step-by-step procedure to safely decouple logic from the monolithic `src/js/index.js` file into modular service files without breaking runtime state.

> [!NOTE]
> **RPC Service Handlers**:
> If the slice being extracted is an InnoGames RPC message handler (handling server packets like `*Service.*`), use [/service-extractor](../service-extractor/SKILL.md) instead to create a decoupled handler in `src/js/msg/`.

## Steps

1. **Identify Isolated Domain Slice**:
   - Choose a specific feature (e.g., Tavern boosts, GB overview calculation, or Army manager).
   - Identify all state variables, DOM elements, and RPC service hooks it touches.

2. **Create New Module**:
   - Create target file in `src/js/fn/<FeatureName>.js` or `src/js/msg/<ServiceName>.js`.
   - Export discrete functions taking needed state explicitly as parameters (avoid relying on hidden globals).
   - Instantiate `const logger = createLogger('<FeatureName>')` from `../utils/logger.js`.
   - Instrument computation steps, cache operations, and render triggers with `logger.debug(...)`.

3. **Import and Wire in `index.js`**:
   - Import the new module at the top of `src/js/index.js`.
   - Replace the inline code block in `index.js` with a clean call to the extracted function.

4. **Verify Build & Types**:

   ```bash
   npm run build:dev
   ```

5. **Runtime Verification**:
   - Test in Chromium DevTools via `node .agents/scripts/inspect-extension.js 5000 --target panel.html` to confirm no ReferenceError or missing variable exceptions.
## 5. Record Usage in the Skill Work Log

A skill that only accumulates notes never changes behaviour. Record each real
run and fold the lesson back into this file:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> \
  --outcome pass|fail|partial \
  --lesson '<imperative rule + why>'
```

`--outcome` is `pass`, `fail`, or `partial`, and every `--signal` is a command
that can actually fail. Patch the workflow above with the lesson in the same
change — the worklog is the audit trail, `SKILL.md` is what the next run reads.
See [Skill Work Log & Memory](references/skill-memory.md) for the full loop.

