# opencode Plugins & Hooks

opencode counterpart to Antigravity's `hooks.json`. opencode does not execute
`hooks.json`; it runs JavaScript/TypeScript plugin modules instead.

## Locations & Registration

- Project plugins: `.opencode/plugins/*.mjs`.
- Global plugins: `~/.config/opencode/plugins/`.
- `.mjs` files are not auto-discovered in this repo (auto-discovery matches
  `.js`/`.ts`); register each one in the `opencode.json` `plugin[]` array. The
  four existing plugins are listed there.

## Basic Structure

```js
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    'tool.execute.before': async (input, output) => {
      if (input.tool === 'bash' && isDangerous(output.args?.command)) {
        throw new Error('blocked');
      }
    },
    event: async ({ event }) => {
      if (event.type === 'session.idle') {
        // notify only; cannot block
      }
    },
  };
};
```

Context: `project`, `directory`, `worktree`, `client` (opencode SDK; use
`client.app.log` for logging), and `$` (Bun shell helper).

## Hook Surface

| Hook | Signature | Use |
| :--- | :--- | :--- |
| `tool.execute.before` | `(input, output)` | Validate/mutate `output.args`; throw to deny |
| `tool.execute.after` | `(input, output)` | Post-processing; renew the Graphify query stamp |
| `event` | `({ event })` | `session.idle`, `session.status`, `permission.asked`, ... |
| `shell.env` | `(input, output)` | Inject variables into `output.env` |
| `experimental.session.compacting` | `(input, output)` | Customize compaction context or replace the prompt |
| `tool` | map | Register custom tools |

## Parity Limits vs Antigravity

Do not attempt these; opencode has no equivalent event:

- **No `PreInvocation`** — bake guardrails into `.opencode/instructions/*.md`.
- **No `Stop` gate** — `session.idle` is notification-only and cannot block.
- **No `force_ask`** — a before-hook can only throw (deny); approvals come from
  the `permission` config.
- **No `Workspace: "share"`** — create a git worktree under `.worktrees/<branch>`
  and point the writer at it.

## Step-by-Step

1. Add `.opencode/plugins/<name>.mjs`.
2. Register it in `opencode.json` `plugin[]`.
3. Reuse shared logic by importing named exports from `.agents/scripts/*.mjs` so
   both harnesses run one implementation (see the four existing plugins).
4. Stay silent in standard mode; log through `client.app.log`, never `console`.
5. Verify: a local `node --import` harness only checks API shape (types come
   from `@opencode-ai/plugin` under `.opencode/node_modules`). Live behavior must
   be confirmed with `opencode run` against a running model.

## References

- Existing plugins: `safety-gate.mjs`, `graphify-guard.mjs`, `graphify-sync.mjs`,
  `sync-state.mjs`, `stop-guard.mjs`.
- Canonical Antigravity handlers: `.agents/scripts/safety-gate.mjs`,
  `.agents/scripts/graphify-guard.mjs`,
  `.agents/scripts/post-tool-graphify-sync.mjs`.
