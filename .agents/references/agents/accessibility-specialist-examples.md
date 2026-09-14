# accessibility-specialist — Worked Examples

On-demand examples for the `accessibility-specialist` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Accessible Button & Live Announcer

**Scenario:** Implementing an interactive copy button with screen reader feedback.
**Reasoning Trace:**

1. Avoid `role="alert"` for non-urgent feedback; use `#foeCopyStatus` with `role="status" aria-live="polite"`.
2. Provide keyboard activation: Enter activates on `keydown`, Space activates on `keyup` to prevent repeat triggering.
3. Code template:
   ```javascript
   export function setupCopyButton(btn, textToCopy) {
     btn.setAttribute('aria-label', t('copy'));
     btn.addEventListener('click', async () => {
       const ok = await copyToClipboard(textToCopy);
       const announcer = document.getElementById('foeCopyStatus');
       if (announcer) {
         announcer.textContent = ok ? t('copied') : t('copy_failed');
       }
     });
   }
   ```

---
