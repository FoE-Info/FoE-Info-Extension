# typescript-expert — Worked Examples

On-demand examples for the `typescript-expert` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Ambient Type Definition & Narrowing

**Scenario:** Defining the ambient contract for an InnoGames RPC response envelope.
**Reasoning Trace:**

1. Do not use `any`. Use generics with default `unknown`.
2. Model discriminator field `__class__`:
   ```typescript
   export interface ServerResponseEnvelope<T = unknown> {
     readonly __class__: 'ServerResponse';
     readonly requestClass: string;
     readonly requestMethod: string;
     readonly responseData: T;
     readonly requestId?: number;
   }

   export function isServerResponse(
     val: unknown,
   ): val is ServerResponseEnvelope {
     return (
       typeof val === 'object' &&
       val !== null &&
       (val as Record<string, unknown>).__class__ === 'ServerResponse'
     );
   }
   ```
3. Typecheck via `npm run typecheck` (`tsc --noEmit`).

---
