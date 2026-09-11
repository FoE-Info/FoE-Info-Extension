# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## In progress

| Thread                           | State | Notes                                                                                                                                                                                                                  |
| :------------------------------- | :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GBG UC format & auto-fetch       | Done  | Formatted UC camps as `(60% / 20% UC)` without emojis; auto-fetched guild province buildings on `getBattleground` (`GbgCalculator.js`, `xhrInterceptor.js`, `GuildBattlegroundService.js`).                            |
| GBG target pruning on conquest   | Done  | Sectors conquered by any guild (or own guild) immediately pruned from signals and targets list (`GuildBattlegroundService.js`, `GbgSignalService.js`).                                                                 |
| Message Centre signed pagination | Done  | Interceptor automatically queries page 2+ via signed InnoGames `ConversationService.getCategory` RPC (`xhrInterceptor.js`); scans all available threads dynamically up to `totalTeasers` without arbitrary 4-page cap. |
| Protocol paths & webpack proxy   | Done  | Relocated `xhrInterceptor.js` and `contentBridge.js` directly to `src/js/protocol/`; created root `webpack.config.js` proxy.                                                                                           |
| GE panels rename & color         | Done  | Renamed Championship/Contributions to GE Championship and GE Leaderboard; updated i18n, options, and inherited alert-info font color on table elements (verified 602/602 tests).                                       |
| GB donation panel refresh        | Done  | Fixed real-time progress update on FP donation (`GbDonationService.updateContributionProgress` + `CityMapService.updateEntity` sync); live browser verified on en7 Zeus 2026-09-11.                                    |
| Codex/Claude residue removal     | Done  | 3 codex worktrees deleted; `codex-sync.log` deleted; no `codex/*` branch refs remain (`git branch -a` clean as of 2026-09-11). Historical decommission mentions in docs intentionally retained.                        |
| Safety-gate branch-delete policy | Done  | `.agents/scripts/safety-gate.mjs` now blocks deleting `development` only (local + remote); all other branch deletes allowed. Tested 21/21.                                                                             |
| Docs consolidation               | Done  | Created `docs/README.md` hub + this board; plans/specs migrated to `docs/plans/` + `docs/specs/`; AGENTS.md/COORDINATION.md/OPENCODE.md/HANDOFF.md all reference the hub.                                              |
| `.opencode/` lockfile            | Done  | `.opencode/package-lock.json` tracked in `089e655`.                                                                                                                                                                    |
| Verification gate                | Done  | `npm run verify` exit 0 confirmed 2026-09-11 (619/619 tests, prettier clean, lint 0 errors, dev build compiles). Reproof after any new change.                                                                         |

## Todos

- [x] GBG Target pruning on sector conquest by any guild (`GuildBattlegroundService.js`)
- [x] Auto-fetch Message Centre page 2+ via signed `getCategory` RPC (`src/js/protocol/xhrInterceptor.js`)
- [x] Relocate `xhrInterceptor.js` and `contentBridge.js` directly to `src/js/protocol/`
- [x] Add root `webpack.config.js` proxy for default tooling compatibility
- [x] Fix GB donation panel double-count on donate (`6df53f3`, unpushed; live spot-check pending)
- [x] Delete codex worktrees + `codex-sync.log` (2026-09-10)
- [x] Delete remaining `codex/*` branch refs (confirmed gone 2026-09-11)
- [x] Relax safety-gate branch-delete block (allow non-`development` local/remote deletes)
- [x] Migrate `docs/superpowers/plans` → `docs/plans/` (9 files)
- [x] Migrate `docs/superpowers/specs` → `docs/specs/`
- [x] Create `docs/README.md` coordination hub + `docs/STATUS.md` live board
- [x] Update `AGENTS.md`, `HANDOFF.md`, `OPENCODE.md`, `COORDINATION.md` pointers to the hub + new plan paths
- [x] Commit `.opencode/package-lock.json` (`089e655`)
- [x] Run `npm run verify` + graphify AST sync after consolidation completes (2026-09-11)
- [x] Push `development` (`6df53f3` + `5dae931`) to `origin/development` (2026-09-11)
- [x] Live browser spot-check: own GB donate → card refreshes without reopening (verified on en7 Zeus 2026-09-11)

## Recently completed threads

- **Cold-login delay** — RESOLVED. Was Debug Mode's own logging overhead, not a
  real bug. Standard Mode cold entry ~5.49s; middleware subscriber removes the
  spinner ~100ms before resolver finish (not confirmed visible-wrong-data).
- **Graphify local backend** — RESOLVED. Shared launcher wires env vars into
  `graphify-*` MCP servers + `graphify watch`.
- **Persona-loading** — RESOLVED. `.agents/agents/*.md` are connected via
  manual/instruction-driven subagent delegation, not auto-loaded.
- **Full ecosystem audit** — verified 31 subagents / 16 rules / 51 skills;
  fixed 2 stale counts. Gaps: rules not auto-injected by trigger mode in hosts;
  hooks enforced by host adapters.
- **Hook parity** — `graphify-sync`, `graphify-guard`, `monolith-guardrail`
  built + live-verified; `stop-guard` logs a warning plugin (no `fullyIdle`
  equivalent).
- **opencode takeover** — RESOLVED. `opencode.json` (16 rules as instructions,
  5 MCP servers), 31 shims in `.opencode/agents/`, 4 hook plugins live-verified.
  Codex/Claude compatibility layer decommissioned 2026-09-09; opencode is the
  sole coding host.

## Open threads requiring a decision

- `backup-development-2026-09-06` worktree (43 ahead / 158 behind) — old
  backup branch, not Codex residue. Keep vs delete is unresolved.
- `graphify-out/foe-info/obsidian/` + `wiki/` markdown exports — git-ignored
  generated artifacts from the graphify knowledge graphs; retained locally.
