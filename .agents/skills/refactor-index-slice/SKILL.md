---
name: refactor-index-slice
description: Carve out modular domain services from monolithic src/js/index.js.
---

# Workflow: Refactor Monolithic Index Slice

This skill outlines the step-by-step procedure to safely decouple logic from the monolithic `src/js/index.js` file into modular service files without breaking runtime state.

> [!NOTE]
> **RPC Service Handlers**:
> If the slice being extracted is an InnoGames RPC message handler (handling server packets like `*Service.*`), use [/service-extractor](../service-extractor/SKILL.md) instead to create a decoupled handler in `src/js/msg/`.

## Steps

1. **Identify Isolated Domain Slice**:
   * Choose a specific feature (e.g., Tavern boosts, GB overview calculation, or Army manager).
   * Identify all state variables, DOM elements, and RPC service hooks it touches.

2. **Create New Module**:
   * Create target file in `src/js/fn/<FeatureName>.js` or `src/js/msg/<ServiceName>.js`.
   * Export discrete functions taking needed state explicitly as parameters (avoid relying on hidden globals).

3. **Import and Wire in `index.js`**:
   * Import the new module at the top of `src/js/index.js`.
   * Replace the inline code block in `index.js` with a clean call to the extracted function.

4. **Verify Build & Types**:
   ```bash
   npm run build:dev
   ```

5. **Runtime Verification**:
   * Test in Chromium DevTools via `node .agents/scripts/inspect-extension.js 5000 --target panel.html` to confirm no ReferenceError or missing variable exceptions.
