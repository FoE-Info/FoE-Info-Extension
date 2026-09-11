# opencode and Antigravity coexistence

The canonical skills, role descriptions, rules, scripts, and Antigravity registrations remain in `.agents/`. opencode reads the same source material. Its separate registrations live in `.opencode/`; there is no second copy of the 53 skills or 36 specialist documents.

## Start here

1. Read `docs/README.md` (coordination hub), `AGENTS.md`, and `docs/STATUS.md` (live work/todos), then inspect `git status` and current source before executing an old plan; `docs/HANDOFF.md` holds verified state and resume-safely notes.
2. Read `.agents/rules/` entries marked `always_on` and the scoped rules applicable to the task. Antigravity frontmatter is not automatic rule activation in opencode; all 16 rules are injected as instructions (`opencode.json` `instructions` glob, `.agents/rules/*.md`) and the agent decides applicability per task.
3. Use the workspace skill path from the available-skills catalog. Several global/plugin skills have identical names; prefer the repository runbook for repository work.
4. Query the host graph before broad source searches. The `graphify-guard` plugin enforces this mechanically (see Hooks below).
5. Run `npm run verify` and `npm run typecheck` before claiming an implementation verified. A passing unit suite is not a browser behavior test.

## Tool and role mapping

| Antigravity instruction                              | opencode equivalent                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_command` / `CommandLine`                        | `bash` tool, permissions configured in `opencode.json`                                                                                      |
| `grep_search`, `find_by_name`                        | `grep` / `glob` tools, after graph consultation                                                                                             |
| `view_file`, `replace_file_content`, `write_to_file` | `read`, `edit`, `write` tools                                                                                                               |
| `invoke_subagent` with a named specialist            | `task` tool with `subagent_type: <name>`; the 36 specialists are thin shims in `.opencode/agents/` (pointing at `.agents/agents/<name>.md`) |
| `Workspace: "share"`                                 | Worktrees under `.worktrees/<branch>`; assign each cooperating agent its own branch-checkout cwd                                            |
| `call_mcp_tool` / `ServerName`                       | MCP servers declared in `opencode.json`; tool names follow the `_server_tool_` sanitized convention                                         |
| `<appDataDir>/brain/` artifacts                      | Do not invent an Antigravity brain path. Keep implementation plans in `docs/plans/` and disposable analysis under ignored `graphify-out/`   |

Role Markdown is reusable instruction content, not automatic native named-agent registration. Actual tool schemas and user instructions govern dispatch. A skill's reference to unavailable tool/model parameters must be adapted, not copied verbatim.

### What still needs adaptation

Antigravity sessions need no migration for opencode coexistence. The following differences are opencode responsibilities; they do not require rewriting the canonical Antigravity files.

| Difference                                                              | Working procedure in opencode                                                                                                                         | Additional automation needed for parity                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Rule frontmatter (`always_on`/`model_decision`) is not read by opencode | All 16 rules are injected as instructions; applicability is decided by the agent per task                                                             | None (single always-on injection bucket)                              |
| Named specialist registration is not auto-imported                      | `.opencode/agents/<name>.md` shims add `subagent_type` for each of the 36 specialists                                                                 | None                                                                  |
| `Workspace: "share"` does not create an isolated checkout               | Create explicit worktrees and assign each writer its cwd                                                                                              | A worktree-aware dispatch wrapper                                     |
| Graph-query tool names differ                                           | The `graphify-guard` plugin blocks broad bash source searches without a shared 1800-second stamp; supported Graphify MCP queries renew it             | Extend coverage only for additional concrete search tools when needed |
| AST synchronization is best-effort                                      | The `graphify-sync` plugin spawns detached `npm run graph:foe-info:ast` on AST-affected writes; log at `graphify-out/foe-info/opencode-sync.log`      | No freshness certification for unsupported write tools                |
| Per-turn guardrail activation                                           | The canonical reminder is baked into instructions (`.opencode/instructions/guardrail.md`, sourced from `.agents/scripts/pre-invocation-reminder.mjs`) | None (no PreInvocation event exists)                                  |
| Antigravity's `fullyIdle` stop payload is unavailable                   | The `stop-guard` plugin logs a warning on `session.idle` if a background AST sync is pending; it cannot block completion                              | Native task-state integration before a reliable stop gate             |
| Safety hook returns `deny`, not Antigravity `force_ask`                 | The `safety-gate` plugin throws on destructive commands; the permission system additionally asks/denies configurable bash patterns                    | Host-supported approval semantics                                     |

These procedures permit development today. Automatic enforcement parity is unfinished opencode integration work.

## Configuration

`opencode.json` at the workspace root declares:

- **model**: `opencode/big-pickle` (cloud fallback for this repo until the local `llama-swap` model is preferred).
- **instructions**: `.agents/rules/*.md` (all 16 rules) plus `.opencode/instructions/*.md` (guardrail reminder).
- **plugins**: the four hook plugins in `.opencode/plugins/` (registered explicitly because `.mjs` is not auto-discovered).
- **mcp**: the same six servers as `.agents/mcp_config.json` — Chrome DevTools via `.agents/scripts/run-chrome-devtools-mcp.sh` and the five Graphify graphs via native `graphify-mcp` with relative paths and local env blocks. Paths match this machine's Antigravity setup; on relocation update them after locating the executables.
- **permission**: read/edit/glob/grep/list/task/skill allowed; bash uses a first-match-wins list where `*` asks by default and only the documented `git*`/`npm*` read/build/test patterns are auto-allowed. No wildcard tool grants.

Global ~/.config/opencode adds the `llama-swap` provider (models from `~/.config/llama-swap/config.yaml`). The user picks the active model; project `opencode.json` can override `model`.

## Hooks and enforcement limits

Built and live-verified on 2026-09-09:

- `safety-gate` (`tool.execute.before`, bash): reuses `isDangerousCommand` from `.agents/scripts/safety-gate.mjs` and throws on destructive commands (e.g. `git push --force`, `rm -rf`). A live `git status` was unaffected.
- `graphify-guard` (`tool.execute.before`/`after`): imports `isBroadSourceSearch` and the shared stamp helpers from `.agents/scripts/graphify-guard.mjs`. Broad `rg`/`grep`/`find` source searches (bash) and broad `grep`/`glob` tool searches are blocked without a stamp younger than 1800 s; Graphify MCP queries renew it; a single-file search is never blocked.
- `graphify-sync` (`tool.execute.after`, edit/write): queues a detached `npm run graph:foe-info:ast` for AST-affected source paths; a live edit to `src/js/utils/copy.js` produced `queued … exit 0` in `graphify-out/foe-info/opencode-sync.log`.
- `stop-guard` (`event`, `session.idle`): via `client.app.log` it warns when the session idles with a background AST sync still pending. It detects, it does not force-continue.

Not wired: Antigravity's `force_ask` semantics (opencode permission system asks/denies instead), and a reliable stop gate (no `fullyIdle` equivalent).

## Known instruction conflicts

- Workspace identity is `.agents/project.json` (`name`, `displayName`, `primaryGraph`); `package.json` mirrors those fields for npm/build tooling. The file was briefly removed in `e61503f` and later restored; tests enforce its presence.
- The active BigNumber rule describes a rounding hybrid: `ROUND_HALF_UP` for Arc rewards and suggested donations, `ROUND_CEIL` for spot locks, owner safe adds, and safe-spots. Historical plans/handoffs claiming a blanket single mode are superseded as instructions. Use validated game examples before any arithmetic change.
- Routine logger debug/info messages are gated by Debug Mode. Warnings and errors remain visible locally in the DevTools panel console for diagnosis. Legacy direct console calls are not all migrated.
- Global file caps describe the target architecture; existing oversized modules are baseline debt. Do not add inline feature logic to monoliths or repeat completed extractions based only on line counts.

## Verification environment

Use Node.js 24 or later with the installed dependencies. The `node_modules` under `.opencode/` only provides local type-checking of the hook plugin API (`@opencode-ai/plugin`, `@opencode-ai/sdk`); the plugins run inside opencode's own runtime. Live hook behavior must be confirmed with `opencode run` against a running model, not just a Node import harness.

Formatting excludes existing `docs/antigravity_prompt_*.md` conversation artifacts and worktrees. ESLint excludes worktrees too. Translation parity only checks keys, and TypeScript has `checkJs: false`; neither is a full semantic correctness guarantee.
