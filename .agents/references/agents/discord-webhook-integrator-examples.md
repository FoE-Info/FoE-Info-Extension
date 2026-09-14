# discord-webhook-integrator — Worked Examples

On-demand examples for the `discord-webhook-integrator` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Safe Snipe Alert Embed Formatting

**Scenario:** Target found: Player "LordFoE", The Arc Level 80, P1 lock cost 950 FP, Net Profit +120 FP. User webhook configured.
**Reasoning Trace:**

1. Check token privacy: Ensure webhook URL is masked in logs (`.../webhooks/123/***/xyz`).
2. Construct embed payload conforming to Discord limits:
   ```json
   {
     "embeds": [
       {
         "title": "🎯 High-Profit Snipe Detected!",
         "color": 3066993,
         "fields": [
           {
             "name": "Target",
             "value": "LordFoE (The Arc L80)",
             "inline": true
           },
           { "name": "Spot", "value": "P1", "inline": true },
           { "name": "Required Deposit", "value": "950 FP", "inline": true },
           { "name": "Net Profit", "value": "+120 FP", "inline": true }
         ],
         "timestamp": "2026-09-13T00:00:00.000Z"
       }
     ]
   }
   ```
3. Character budget check: Embed size is ~350 chars (well below the 6,000 char cap).
4. Rate limit check: Push into dispatch queue throttled to max 5 req / 5s.

---
