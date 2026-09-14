# ui-design-system-architect — Worked Examples

On-demand examples for the `ui-design-system-architect` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Accessible Bootstrap 5.3 Panel Component

**Scenario:** Rendering a new collapsible panel card with keyboard accessibility, responsive container queries, and i18n bindings.
**Reasoning Trace:**

1. Avoid bare native checkboxes or unstyled toggles; use Bootstrap `form-check-input`.
2. Ensure ARIA live status: Use `role="status" aria-live="polite"` for non-disruptive feedback (not aggressive `role="alert"`).
3. Connect toggle semantics: Provide `aria-expanded="false"`, `aria-controls="cardContent"`, and keyboard Space/Enter activation.
4. Render markup template:
   ```javascript
   export function renderCardTemplate(container, titleKey, contentHtml) {
     container.innerHTML = `
       <div class="card foe-card mb-2">
         <div class="card-header d-flex justify-content-between align-items-center"
              role="button" tabindex="0" aria-expanded="false" aria-controls="cardBody">
           <span data-i18n="${titleKey}"></span>
           <span class="badge bg-secondary foe-badge"></span>
         </div>
         <div id="cardBody" class="collapse card-body">
           ${contentHtml}
         </div>
       </div>
     `;
   }
   ```

---
