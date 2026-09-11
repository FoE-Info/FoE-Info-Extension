# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## In progress

| Options page instant render | Done | Eliminated blank delay and unpopulated FOUC in options.html; populated form synchronously from storage; moved tab discovery to non-blocking background; added unit test. |
| Release v0.0.833 | Done | Bumped version to 0.0.833, created CHANGELOG.md, added scripts/release.mjs, built WebStore zip, created git tag v0.0.833. |
| GBG UC & rushed camps | Done | Formatted UC camps as `(60% / 20% UC)`. Reconciled server `gainAttritionChance` in `GbgCalculator.js` so rushed camps promote to ready immediately rather than showing stale UC (`bbd25b9`). |
| GBG instant conquest signals | Done | Registered `GuildBattlegroundService.getAction` (`province_conquered`) in `legacyBridge.js`; conquered sectors clear from target generator instantly via WebSocket push instead of ~50s poll lag (`bbd25b9`). |
| GBG panel sizing & initial height | Done | Adapted GBG panel sizing: default restricted height increased to 400px; changes-only mode sets `height: auto` (`.gbg-changes-full`), preventing panel starting off cramped (`bbd25b9`). |
| Passive network interception | Done | Restored `xhrInterceptor.js` to 100% passive observation; removed out-of-band active POST RPC fetches that interfered with player's live session and message threads. |
| Custom targets topic matching | Done | Dynamically resolves custom target topic from options/state in `ConversationService.js` with fallback to `targets` / `🎯` without active background querying. |
| Teaser payload shapes support | Done | Supported all teaser payload shapes (array items with text or flat objects) in `ConversationService.js` (`c3756e5`). |
| Content bridge role confirmed | Done | Verified `contentBridge.js` is essential MV3 network transport; confirmed Claude log mirroring was already removed in `981180d`. |
| Restore using-superpowers skill | Done | Recreated `.agents/skills/using-superpowers/SKILL.md` + references for `/using-superpowers` slash command (53 skills total, verified 40/40 agent tests). |
| Protocol paths & webpack proxy | Done | Relocated `xhrInterceptor.js` and `contentBridge.js` directly to `src/js/protocol/`; created root `webpack.config.js` proxy. |
| GE panels rename & color | Done | Renamed Championship/Contributions to GE Championship and GE Leaderboard; updated i18n, options, and inherited alert-info font color on table elements (verified 602/602 tests). |
| GB donation panel refresh | Done | Fixed real-time progress update on FP donation (`GbDonationService.updateContributionProgress` + `CityMapService.updateEntity` sync); live browser verified on en7 Zeus 2026-09-11. |
| Codex/Claude residue removal | Done | 3 codex worktrees deleted; `codex-sync.log` deleted; no `codex/*` branch refs remain (`git branch -a` clean as of 2026-09-11). Historical decommission mentions in docs intentionally retained. |
| Safety-gate branch-delete policy | Done | `.agents/scripts/safety-gate.mjs` now blocks deleting `development` only (local + remote); all other branch deletes allowed. Tested 21/21. |
| Docs consolidation | Done | Created `docs/README.md` hub + this board; plans/specs migrated to `docs/plans/` + `docs/specs/`; AGENTS.md/COORDINATION.md/OPENCODE.md/HANDOFF.md all reference the hub. |
| `.opencode/` lockfile | Done | `.opencode/package-lock.json` tracked in `089e655`. |
| Verification gate | Done | `npm run verify` exit 0 confirmed 2026-09-11 (624/624 tests, prettier clean, lint 0 errors, dev build compiles). Reproof after any new change. |
| Graph pipeline extension | Done | Scripts + npm runners + MCP servers for `graphify-low-tool` and `graphify-foe-info-original` (sibling repos); repointed original graph; fixed forge-hammer sibling path bug; added `graphify-out/` gitignore in both sibling repos. |
| 5 new graph subagents | Done | `low-tool-comparator`, `foe-info-original-comparator`, `forge-hammer-kg-explorer`, `low-tool-kg-explorer`, `foe-info-original-kg-explorer` (canonical + opencode shims). 36 subagents total (`b3e2875`). |
| Ecosystem count sync | Done | AGENTS.md, graphify rule, antigravity-interop skill, guardrail, utils, docs (`STATUS`/`COORDINATION`/`OPENCODE`/`HANDOFF`) and agent-config tests updated to 36 subagents / 6 MCP servers / 53 skills. +10 `mcp(graphify-low-tool/*)` Antigravity grants. |

## Todos

- [x] GBG Target pruning on sector conquest by any guild (`GuildBattlegroundService.js`)
- [x] Restore pure passive observation in `xhrInterceptor.js`, eliminating active out-of-band POST RPC requests
- [x] Support multiple teaser payload shapes in `ConversationService.js` (`c3756e5`)
- [x] Confirm `contentBridge.js` architecture and historical Claude logger removal (`981180d`)
- [x] Restore `using-superpowers` skill for `/using-superpowers` slash command (53 skills total)
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
- [x] Graph pipeline + subagents setup for LoW-Tool and FoE-Info-original (scripts, npm runners, MCP servers, grants, docs, tests)
- [ ] Generate `../LoW-Tool/graphify-out/graph.json` via `npm run graph:low-tool:reindex`
- [ ] Generate `../FoE-Info-Extension-original/graphify-out/graph.json` via `npm run graph:foe-info-original:reindex`

## Recently completed threads

- **Cold-login delay** — RESOLVED. Was Debug Mode's own logging overhead, not a
  real bug. Standard Mode cold entry ~5.49s; middleware subscriber removes the
  spinner ~100ms before resolver finish (not confirmed visible-wrong-data).
- **Graphify local backend** — RESOLVED. Shared launcher wires env vars into
  `graphify-*` MCP servers + `graphify watch`.
- **Persona-loading** — RESOLVED. `.agents/agents/*.md` are connected via
  manual/instruction-driven subagent delegation, not auto-loaded.
- **Full ecosystem audit** — verified 36 subagents / 16 rules / 53 skills;
  fixed 2 stale counts. Gaps: rules not auto-injected by trigger mode in hosts;
  hooks enforced by host adapters.
- **Hook parity** — `graphify-sync`, `graphify-guard`, `monolith-guardrail`
  built + live-verified; `stop-guard` logs a warning plugin (no `fullyIdle`
  equivalent).
- **opencode takeover** — RESOLVED. `opencode.json` (16 rules as instructions,
  6 MCP servers), 36 shims in `.opencode/agents/`, 4 hook plugins live-verified.
  Codex/Claude compatibility layer decommissioned 2026-09-09; opencode is the
  sole coding host.

## Open threads requiring a decision

- `backup-development-2026-09-06` worktree (43 ahead / 158 behind) — old
  backup branch, not Codex residue. Keep vs delete is unresolved.
- `graphify-out/foe-info/obsidian/` + `wiki/` markdown exports — git-ignored
  generated artifacts from the graphify knowledge graphs; retained locally.
