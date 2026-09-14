# webpack-expert — Worked Examples

On-demand examples for the `webpack-expert` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: DefinePlugin Compile-Time Tier Flagging

**Scenario:** Adding a compile-time feature flag to eliminate dev fixtures from production builds.
**Reasoning Trace:**

1. Avoid runtime checks that ship unused test fixtures to users.
2. Inject compile-time boolean flags via `webpack.DefinePlugin`:
   ```javascript
   new webpack.DefinePlugin({
     DEBUG_BUILD: JSON.stringify(isBeta || isDev),
     FORCE_FIXTURES: JSON.stringify(isDev),
   });
   ```
3. Terser dead-code elimination: Code inside `if (FORCE_FIXTURES) { ... }` is stripped cleanly from production output.
4. Verify bundle output: Check that production output contains 0 references to test fixtures.

---
