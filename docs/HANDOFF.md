# FoE-Info Extension — Project Handoff

Updated 2026-09-11 after graph pipeline extension for LoW-Tool and FoE-Info-original sibling repos.

## Current session (2026-09-11)

- **Options page instant rendering & FOUC fix**:
  - Eliminated blank delay and unpopulated controls when opening `options.html`.
  - Populated the world selector and settings form immediately and synchronously from storage cache (`globals` and `getWorldSettings`) without waiting on browser tab IPC queries.
  - Moved `discoverOpenGameWorlds()` to a non-blocking background task.
  - Added smooth CSS transition on `.container.loaded` in [`options.scss`](../src/css/options.scss) to eliminate any flash of unpopulated checkboxes.
  - Fixed duplicate "Options Options" title in [`options.html`](../src/chrome/options.html).
  - Added unit test [`tests/ui/options.test.mjs`](../tests/ui/options.test.mjs) (verified 625/625 tests pass).
- **Release v0.0.833 and GitHub Release workflow (`02d776b`, tag `v0.0.833`)**:
  - Transitioned from ad-hoc local zip builds to formalized GitHub Releases using Option A (releasing and tagging directly on `development`).
  - Bumped version to `0.0.833` in [`package.json`](../package.json) and [`src/chrome/manifest.json`](../src/chrome/manifest.json).
  - Initialized [`CHANGELOG.md`](../CHANGELOG.md) following Keep a Changelog standards.
  - Added [`scripts/release.mjs`](../scripts/release.mjs) and npm runner `npm run release` to automate the 5-stage release pipeline (`npm run verify`, `npm run build`, zip artifact verification, git tagging, and `gh release create`).
  - Published GitHub Release [v0.0.833](https://github.com/FoE-Info/FoE-Info-Extension/releases/tag/v0.0.833) with compiled distribution bundle `build/FoE-Info_WEBSTORE_0.0.833_2026-09-11.zip` attached. Pushed `development` and tags to remote origin.
- **GBG combat verification & live bug fixes (`bbd25b9`)**:
  - **Live Observation via CDP**: Monitored active GBG combat on `en7` through Chrome DevTools Protocol port 9222 using real-time DOM mutation observers.
  - **Rushed Siege Camps Reconciliation**: Discovered that when camps were diamond-rushed on the map, the game server broadcasts `gainAttritionChance: 20` on the target province without pushing updated building entities to other players. In [`GbgCalculator.js`](../src/js/calc/GbgCalculator.js) and `GbgCalculator.ts`, reconciled `options.gainAttritionChance`: whenever the server's authoritative reduction exceeds local `campsReady`, the difference is promoted from `campsNotReady` to `campsReady`. Fixed sectors erroneously showing stale `(40% / 20% UC)` when they are already completed `(20%)`.
  - **Instant Conquest Signal Removal (`getAction`)**: Discovered InnoGames broadcasts real-time WebSocket push `GuildBattlegroundService.getAction` (`action: "province_conquered"`, `provinceId`) the instant a sector falls. FoE-Info previously lacked an `getAction` registration, causing a ~50-second lag before conquered sectors dropped off the target generator. In [`legacyBridge.js`](../src/js/protocol/legacyBridge.js), wired `getAction` (`province_conquered`) directly to `handleRemoveSignal`. Conquered sectors now disappear instantly.
  - **GBG Panel Sizing**: Set default restricted height to 400px in [`globals.js`](../src/js/fn/globals.js) and [`helper.js`](../src/js/fn/helper.js); added `.gbg-changes-full` with `height: auto !important` in [`custom.scss`](../src/css/custom.scss) for "show changes only" mode, eliminating cramped panel startup.
  - **Verification**: 4 new unit tests added (624 tests total, all passing); verified live hot-reloaded panel on active targets without disrupting game canvas.
- **Graph pipeline extension for LoW-Tool and FoE-Info-original (`b3e2875`)**:
  - Created `graph-foe-info-original-update.sh` and `graph-foe-info-original-reindex.sh` scripts mirroring the existing forge-hammer pattern for the frozen v1 baseline at `../FoE-Info-Extension-original` (commit `8c681d1`).
  - Created `graph-low-tool-update.sh` and `graph-low-tool-reindex.sh` scripts for the original closed-source implementation at `../LoW-Tool`.
  - Added npm scripts: `graph:low-tool:{update,reindex,export}`, `graph:foe-info-original:{update,reindex,export}`.
  - Repointed `graphify-foe-info-original` MCP server args from the missing in-repo path (`graphify-out/foe-info-original/graph.json`) to the sibling repo (`../FoE-Info-Extension-original/graphify-out/graph.json`).
  - Added 6th MCP server `graphify-low-tool` (args `../LoW-Tool/graphify-out/graph.json`) with full env block in both `.agents/mcp_config.json` and `opencode.json`.
  - Fixed sibling-repo path bug in all 4 new scripts **and** existing `graph-forge-hammer-{update,reindex}.sh` — default `FORGE_HAMMER_DIR` resolved to `<workspace>/forge-hammer` instead of `../forge-hammer`.
  - Created `graphify-out/low-tool/findings/` and `graphify-out/foe-info-original/findings/` directories for subagent findings.
  - Added `graphify-out/` to both sibling repo `.gitignore` files.
- **5 new subagents created** (36 total, up from 31):
  - `low-tool-comparator`, `foe-info-original-comparator` — compare vs FoE-Info (findings saved to `graphify-out/{low-tool,foe-info-original}/findings/`).
  - `forge-hammer-kg-explorer`, `low-tool-kg-explorer`, `foe-info-original-kg-explorer` — standalone explorers, treat the peer graph as their own project (no comparisons; findings saved to matching `graphify-out/<peer>/findings/`).
  - All have canonical `.agents/agents/*.md` and thin `.opencode/agents/*.md` shims.
- **Ecosystem count updates**:
  - 31→36 subagents, 5→6 MCP servers, 51→53 skills in AGENTS.md, `.agents/rules/graphify.md`, `.agents/rules/workspace-structure.md`, `antigravity-interop` skill, `.opencode/instructions/guardrail.md`, `pre-invocation-reminder.mjs`, `docs/STATUS.md`, `docs/COORDINATION.md`, `docs/OPENCODE.md`, `tests/agents/agent-config.test.mjs`.
  - Antigravity FoE-Info project grants: +10 `mcp(graphify-low-tool/*)`, 79 total, 0 bare MCP wildcards.
  - `graphify-guard` `GRAPHIFY_QUERY_TOOLS` regex and MCP prompt message updated with `low-tool` in both harnesses.
- **Graph generation status**: deferred during the Antigravity transition; now safe to run via `npm run graph:low-tool:reindex` / `npm run graph:foe-info-original:reindex`. A partial AST cache exists in `../LoW-Tool/graphify-out/cache/` from an aborted run (no graph.json created; harmless).

## Resume safely

Read `AGENTS.md` and [opencode coexistence](OPENCODE.md). Inspect `git status` before editing. The takeover is committed in logical chunks on `development`; it has been pushed. Three pre-existing `docs/antigravity_prompt_*.md` files are user workspace artifacts and remain untouched.

The previous handoff at `cec0ded:docs/HANDOFF.md` is retained in Git history for historical debugging context. Its completion labels and next-step instructions were not reliable. This document supersedes them.

## Current follow-ups (uncommitted)

- Graph generation for LoW-Tool and FoE-Info-original is pending. Run `npm run graph:low-tool:reindex` and `npm run graph:foe-info-original:reindex`; both scripts auto-start llama-swap for the local qwen2.5-vl-7b backend. The partial AST cache in `../LoW-Tool/graphify-out/cache/` is harmless and will be skipped on re-run.
- Debug lookup fixes reduced MetadataStore messages from 170,669 to 258 across the measured cold capture; the first loop dropped from 119,227 to 102. Last-render completion was 4.01 seconds versus the earlier 18.73-second Debug Mode run.
- Painted-frame verification confirmed the old Daily Units 147-to-3299 flash. The shared resolver barrier removed that post-spinner intermediate value in the fixed capture.
- Graphify uses the shared local launcher; routine AST output is logged. See [local Graphify execution](graphify-local.md).
- Graphify graph synchronization and query-first enforcement have live evidence. See [opencode coexistence](OPENCODE.md) for the current host behavior.
- The ecosystem accuracy audit is a separate, uncommitted documentation pass; see [its change ledger](agent-ecosystem-audit.md). Do not commit it without the user's review.

## Takeover changes and subsequent corrections

- Central service registration owns initialization. Individual service modules no longer self-register. Repeated registry initialization is idempotent per dispatcher; identical callbacks on the same route are deduplicated while distinct legacy and modern handlers are retained.
- Failed metadata requests can be retried on a later resolver invocation. Concurrent callers share pending downloads and each receive completion; only successful ingestion is cached as fetched. There is no automatic unbounded retry loop.
- The current startup barrier retains its spinner while the aggregate metadata resolver is pending. The three-second threshold now warns; it does not render early. Resolver failure or settlement without updates releases to the fallback. This supersedes the original takeover timeout behavior.
- Live goods detail and total rendering use supplied values. SAD/SASH/SAT fixed-value substitutions, SAJM suppression, and the guild-total substitution were removed. Existing boost and BigNumber rounding formulas were preserved.
- Routine logger info/debug output requires Debug Mode. Warnings/errors remain local in the DevTools panel console in Standard Mode and expand in Debug Mode. Content-bridge timing uses persisted debug state. Other legacy direct console calls remain to be audited.
- The CDP inspector requires confirmed subscriptions and reports connection failures, rejected subscriptions, exceptions, and warnings with a nonzero exit. Its native WebSocket fallback now uses the correct event API.
- LLM lifecycle tests use command fixtures instead of contacting the real server. Lint/format exclude worktrees; existing prompt documents are excluded from formatting without modifying their contents. The Node requirement is now 24 or later.
- `.opencode/` supplies the host-specific registration and hook plugins on top of the shared `.agents/` launcher. Hook trust and current enforcement limitations are documented in `OPENCODE.md`.

The implementation is recorded in Git history on `development`.

## Verification

Focused regression tests were observed failing before each runtime fix and passing afterward. Integration verification passed: formatting, lint (0 errors, 204 existing warnings), translation parity, 550 tests at the time of writing (591 as of 2026-09-09), and development build. `npm run typecheck` passed separately.

The root development extension was reloaded through `foe-browser --reload-ext`, followed by game login. A direct FoE `panel.html` CDP session confirmed City Info content, no metadata spinner, and 244 received RPC messages; a three-second inspector session captured zero panel warnings/errors. This is a smoke test, not validation of every game feature or slow-network recovery.

Follow-up reload timings on 2026-09-08, with Debug Mode off:

| Reload                 | Fresh startup RPC received |  First fresh City Info render | Last observed replacement |
| ---------------------- | -------------------------: | ----------------------------: | ------------------------: |
| Normal cache           |                    2.713 s |    2.962 s (root replacement) |                   4.615 s |
| Browser cache bypassed |                    2.588 s | 2.826 s (full card confirmed) |                   4.452 s |

Times are measured from sending the game-tab CDP reload command. Both fresh startup payloads contained 447 entities; the previous City Info DOM node was disconnected before counting the new render. The second run also confirmed the current copy button and no spinner. No runtime exceptions or log warnings were captured, and the final three-second panel inspector passed. Temporary observation instrumentation was removed; Debug Mode remained off.

These were authenticated game reloads with an already-running extension and warm in-memory metadata. Browser cache bypass does not clear the extension's metadata. They do not reproduce the reported 22-second delay on this path, but do not establish cold logout/login timing, final calculated-value correctness, or slow-network recovery.

MCP initialization and tools/list succeeded for Chrome DevTools and all five Graphify servers (6 MCP servers total). After the user's trust review and restart, the tools were exposed in the session and live browser/host-graph queries succeeded. The opencode hook plugins were exercised; see `OPENCODE.md` for the remaining host-specific differences.

## Architecture and remaining decomposition

The runtime pipeline is main-world XHR interception / DevTools network capture → dispatcher → services → state and metadata → calculators → UI. `MetadataStore` retains compatibility proxies for legacy consumers; mixed CommonJS/ESM modules are bundled by Webpack.

The extracted `gbgProvinceView.js`, `gbOverviewCard.js`, and `panelDispatcher.js` already exist and are used. Do not repeat Briefs 12–14 based on stale plan checkboxes.

Oversized modules at the takeover baseline:

| File                                     | Lines |
| ---------------------------------------- | ----: |
| `src/js/msg/StartupService.js`           | 1,432 |
| `src/js/index.js`                        | 1,078 |
| `src/js/fn/helper.js`                    |   710 |
| `src/js/msg/GuildBattlegroundService.js` |   656 |
| `src/js/protocol/legacyBridge.js`        |   629 |

These are remaining architecture debt, not evidence that previous extractions never happened. Continue in bounded slices, without adding inline feature logic to `index.js` or `StartupService.js`.

## Decisions and corrections to old instructions

### Workspace identity

`.agents/project.json` is the canonical workspace identity anchor (`name`, `displayName`, `primaryGraph`), restored after its brief removal in `e61503f`. `package.json` mirrors those fields for npm/build tooling. `tests/agents/agent-config.test.mjs` verifies the file's presence and schema.

### Arithmetic

The active `.agents/rules/bignumber-precision.md` defines a deliberate rounding hybrid: `ROUND_HALF_UP` for Arc rewards and suggested donations, `ROUND_CEIL` for spot locks, owner-safe-adds, and safe-spots. The reviewer role now defers to the rule and validated calculation tests. No Arc or investment calculation formula was changed in this takeover. Validate operation-specific game examples before any future change; do not apply historical blanket single-mode rounding instructions.

### Goods substitutions

Commit `eccddbe` removed the original renderer substitutions; `3c89c8a` reintroduced and expanded them without supporting metadata, and `f90d531` extracted them unchanged. They changed arbitrary matching live quantities rather than deriving results from game data. The current regressions cover both detail and aggregate rendering with changing runtime values.

### Browser inspection

The old statement that DevTools panels cannot be inspected through CDP was too broad. Availability depends on exposed targets and frames. Use `npm run inspect:panel` and verify connection/subscription success. If panel targets are unavailable, inspect the DevTools target/frame context; report the actual limitation rather than claiming the panel was tested.

## Preserve these existing fixes

- `MetadataStore.registerEntity` avoids unchanged registrations. The proxy set trap only registers canonical IDs; alias writes retain the existing multi-key lookup behavior. Do not remove those alias writes or the canonical-ID guard.
- Startup rendering delegates to `scheduleStartupRender`; do not restore an unconditional early render.
- GBG renders in its dedicated battleground containers, not Great Buildings' `#donation` container.
- Legacy GvG removal was deliberate; do not reintroduce its dead panels.
- Runtime game metadata stays network-driven. `metadata-store/` is offline development/test input, never a runtime bundle dependency.

## Remaining product work

1. If investigating remaining startup latency, use the existing scripted fresh server-entry flow, preserving account authentication. Cold Standard Mode previously reached its last render at 5.49 seconds; the logging fix reached 4.01 seconds in Debug Mode. Do not confuse those final-render endpoints with the historical 2.8–3.0-second first-render measurements or the user-reported 22 seconds.
2. Timing instrumentation now exists for P1–P6 across bootstrap, content bridge, network listener, and startup/resolution paths. Check current source and capture availability before adding duplicate tags. Persisted debug state is loaded asynchronously; earliest startup events may not be logged.
3. Validate slow/failed metadata recovery in the real panel, including recomputed FP and goods totals. Unit tests cover lifecycle behavior, not a full live gameplay scenario.
4. Confirm desired Galaxy debug behavior before changing it: current debug mode shows the full candidate set and can display the panel with no charges; standard mode filters readiness/charges. This takeover did not change that behavior.
5. Investigate the reported Town Hall long list, missing collapse control, and height/scroll behavior in the actual render path. It has not been established as fixed.
6. Reconcile the UI/RPC punch-list against source and existing tests before execution. Several named tasks already have implementations/tests; unchecked boxes do not prove they are unstarted.
7. Re-scope the StartupService decomposition roadmap against actual remaining responsibilities. Settlement/quest/inventory/castle services already exist; their existence alone does not establish all old responsibilities have migrated.

Relevant historical plans:

- [UI/RPC/metadata punch-list](plans/2026-09-08-ui-rpc-and-metadata-fixes.md)
- [Modernization Briefs 12–14](plans/2026-09-08-modernization-briefs-12-14.md)
- [Decomposition and debuggability roadmap](plans/2026-09-08-monolith-decomposition-and-debuggability-roadmap.md)

Plans/specs live in `docs/plans/` and `docs/specs/`; the coordination hub is
`docs/README.md` and the live work/todo board is `docs/STATUS.md`.

Run `npm run verify` and `npm run typecheck` on the integrated checkout. TypeScript has `checkJs: false`; translation parity proves matching keys, not translation quality. Distinguish runtime observations, source findings, and unverified assumptions when updating this handoff.

## GB donation math: Costs/Reward/Lock model (2026-09-08, commit 9388525)

The GB donation panels previously conflated three distinct quantities into a single "safe spot" number, producing wrong Profit/Loss figures once a viewer's own Arc bonus diverged from the guild's standard donation percent. `GreatBuildingCalculator.js` now exposes them separately:

- **Costs** (`calculateSuggestedDonation(baseReward, standardPercent)`): the guild-convention donation amount at the configured standard (e.g. 190%). Unchanged, was always correct.
- **Lock / spotLock** (`calculateSpotLock(remaining, spotInvested)` = `ceil((remaining + spotInvested) / 2)`): the worst-case FP a potential donor must add to make a place mathematically unsnipeable. Independent of any Arc bonus or standard percent.
- **Donor Reward** (`calculateArcReward(baseReward, viewerArcPercent)`): what the _viewing_ account would receive at its own known Arc bonus, not the existing holder's.
- **Headline Profit** = Donor Reward − Costs (not minus Lock). `calculateDonorOutcome(remaining, spotInvested, baseReward, arcBonusPercent, standardPercent)` returns `{ spotLock, costs, donorReward, donorProfit, guaranteedProfit }`, where `guaranteedProfit = spotLock <= costs` (true when the building owner has over-funded their own place, meaning even the fully-safe lock threshold is cheaper than the guild-standard cost — a stronger "risk-free" case worth visually distinguishing from ordinary profit).

Root causes fixed: (1) `calculateSafeSpots()` wasn't threading a sequential `remaining` value across P1–P5 the way Forge-Hammer's reference algorithm does; (2) it compared against the wrong quantity (owner's personal Arc reward instead of the community-standard donation amount) when deciding if a spot was already safe. Both confirmed against Forge-Hammer's live `part-calc.js` source and multiple real in-game examples (Stellar Warship P3, Blue Galaxy row 4, Statue of Zeus at 180%/190% standard) — all now match exactly, including the case that had read as a false "profit" being an actual loss under the old Reward-minus-Lock formula.

UI: three-way color coding (green = profit, yellow/neutral = break-even, red = loss) plus a "Guaranteed profit" note when `guaranteedProfit` is true. The donation-loop card headers in `GreatBuildingsService.js` no longer attribute a place to a player name (the loop iterates P1–P5 as the _viewer's_ potential-donor outcome at each rank, not a specific current holder's identity — the old code was mislabeling the building owner as sitting in P1). All 575 tests pass at the time of writing (591 as of 2026-09-09); `npm run verify`/`typecheck` should still be run before the Chrome Web Store release, but the math itself is verified release-ready.

## Queued feature: parse guild thread titles for the donation-standard ratio

Implemented in `src/js/fn/rateParser.js` (`extractRateFromTitle`) and wired into `src/js/msg/ConversationService.js` (`getConversation` → `getPercent` → `setCurrentPercent`), which overrides the configured "Donation %" default when a guild thread title carries an embedded ratio in the 1.00–2.50 (100%–250%) range. Covered by `tests/protocol/domain-services.test.mjs`.

Guild message threads that coordinate GB donations often carry the agreed standard ratio directly in the thread title, e.g. `LoW BE All GBs [secure @ 1.92]`, or variants like `1.9 Secure`, `2.0 All Levels`. Today the extension only uses a static, user-configured "Donation %" option (Options panel, default 190).

Requested behavior: when FoE-Info can see the active guild message thread's title, parse it for an embedded ratio in the 1.90–2.00 (or equivalently 190%–200%) range, and if found, use that value as the effective standard donation percent for `calculateSuggestedDonation`/`calculateDonorOutcome` in that context — overriding, not replacing, the static Options default (which remains the fallback when no thread title or no valid ratio is present). Example given by the project owner: thread titled `LoW BE All GBs [secure @ 1.92]` should show 1.92 and multiply the base reward by 1.92 instead of the configured default.

Open implementation questions for whoever picks this up: where the thread title is available in the existing message/RPC pipeline (likely `src/js/msg/` — check what already parses guild message metadata); the exact regex/format tolerance needed (decimal "1.92" vs percent "192%" vs "1.9" with implied trailing zero); and whether the override should be scoped per-thread or per-GB-panel-session. Verify against real thread titles/screenshots before shipping, per this project's standing rule against guessing formulas from UI alone.
