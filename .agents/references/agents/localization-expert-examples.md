# localization-expert — Worked Examples

On-demand examples for the `localization-expert` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Adding a Translatable Key

**Scenario:** A new button labeled "Refresh Data" is added to the UI header.
**Reasoning Trace:**

1. Avoid hardcoded string `Refresh Data` in JavaScript or HTML.
2. Define key in reference locale `src/i18n/en.json`:
   ```json
   "refresh_data": "Refresh Data"
   ```
3. Synchronize to remaining 6 locales (`de`, `el`, `es`, `fr`, `gr`, `it`) using native translation or English fallback to prevent parity failure.
4. Bind in template: `<button data-i18n="refresh_data"></button>`.
5. Run parity gate: `npm run i18n:check` must report 100% complete across all 7 files.

---
