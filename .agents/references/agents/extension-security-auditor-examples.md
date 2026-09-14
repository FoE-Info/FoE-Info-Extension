# extension-security-auditor — Worked Examples

On-demand examples for the `extension-security-auditor` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: DOM XSS Prevention

**Scenario:** Reviewing a proposed change that displays player names from a visited city RPC:

```javascript
// Prohibited unsafe insertion:
container.innerHTML = `<div>Player: ${player.name}</div>`;
```

**Reasoning Trace:**

1. Player names are user-generated content from external servers; inserting directly via string interpolation into `innerHTML` is vulnerable to DOM XSS.
2. Require safe DOM construction or `textContent`:
   ```javascript
   const div = document.createElement('div');
   div.textContent = `Player: ${player.name}`;
   container.appendChild(div);
   ```
3. If templates require HTML strings, enforce escaping with `escapeHTML()` (`src/js/utils/formatters.js`).
4. Verdict: Flag as blocker; demand `textContent` or `escapeHTML()`.

---
