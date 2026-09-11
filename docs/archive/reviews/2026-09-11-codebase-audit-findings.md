# End-to-End Codebase Review & Adversarial Debate Contract

**Date**: 2026-09-11  
**Lead / Initial Reviewer**: OpenCode  
**Adversarial Debater**: Antigravity  
**Methodology**: `debate-review`, `requesting-code-review`, `codebase-audit-pre-push`, `brooks-lint`  
**Schema Standard**: `debate-review.findings.v1` (OpenCode) $\to$ `debate-review.debate.v1` (Antigravity)

---

## 1. Review Scope & Delegation Directive for OpenCode

OpenCode must execute an end-to-end audit across the full extension codebase (`src/js/`, `src/chrome/`, `tests/`), coordinating specialized subagents from `.opencode/agents/` (thin shims into `.agents/agents/`):

### Squad A: Extension Architecture & Security (`extension-security-auditor`)

- **Scope**: `src/js/protocol/`, `src/js/utils/`, `src/chrome/manifest.json`.
- **Invariants**:
  - Passive network observation only: zero active out-of-band POST/RPC queries to InnoGames servers that could alert anti-cheat or disrupt game state.
  - MV3 CSP compliance: zero inline script evaluation, zero `eval()`, zero un-escaped HTML interpolation (`escapeHTML` enforcement).
  - WebRequest / Content Bridge hygiene: no credential leakage, clean disconnect/reconnect handling on panel close.

### Squad B: Monolith Containment & Modularity (`code-reviewer`, `monolith-refactoring-specialist`)

- **Scope**: `src/js/msg/`, `src/js/fn/`, `src/js/ui/`, `src/js/calc/`.
- **Invariants**:
  - Hard file cap: $\le 600$ lines for new and refactored modules (legacy monoliths `index.js`, `StartupService.js`, `GuildBattlegroundService.js` actively being sliced).
  - Single Responsibility: `calc/` contains pure math only (0 DOM); `ui/` contains DOM and Bootstrap 5.3 only (no raw RPC parsing); `msg/` dispatches payloads (no heavy math).
  - Decoupled imports: zero cyclic dependencies, clean CommonJS/ESM dual exports where required.

### Squad C: FoE Math & Precision (`foe-great-buildings-expert`)

- **Scope**: `src/js/calc/`, `src/js/msg/GbDonationService.js`, `GreatBuildingsService.js`.
- **Invariants**:
  - `bignumber-precision.md`: Hybrid rounding standard (half-up for Arc reward boosts and suggested donations; ceiling for spot locking and owner safe adds).
  - Precision integrity: zero floating-point accumulation errors on large Forge Point deposits or guild treasury assets.

### Squad D: Game Domain & Protocol (`foe-game-data-expert`, `foe-guild-battlegrounds-expert`, `foe-combat-boost-analyst`)

- **Scope**: `src/js/msg/`, `src/js/state/`, `src/js/parsers/`.
- **Invariants**:
  - `dynamic-runtime-metadata.md`: 100% dynamic InnoGames RPC/MetadataStore lookup; zero static game metadata or entity JSON dumps inside `src/`.
  - Service resilience: defensive property access (`optional chaining`) for all dynamic payloads (e.g. `CityProductionService`, `GuildBattlegroundService`, `OtherPlayerService`).
  - Cache miss logging: all entity def misses route through `metadataStore.reportEntityLookup`.

### Squad E: UI, Bootstrap 5.3 & Accessibility (`accessibility-specialist`, `ui-design-system-architect`)

- **Scope**: `src/js/ui/`, `src/css/`, `src/chrome/panel.html`.
- **Invariants**:
  - Bootstrap 5.3 standards: native collapse lifecycle (`bindResizableCollapse`), no fighting Bootstrap animation classes (`.collapsing`).
  - ARIA compliance: ARIA labels on button icons (`aria-label`, `title`), keyboard accessibility (`Enter`/`Space`), `aria-expanded` attributes.
  - Per-world storage persistence: height, options, and view states scoped via `worldStorage.js`.

---

## 2. Instructions for OpenCode

1. **Conduct the Audit**:
   - Inspect files across all 5 squads using `task` / subagents (`subagent_type: ...`) or direct multi-pass inspection.
   - For every material defect, risk, anti-pattern, or invariant violation found, record an entry below with a unique id (`F1`, `F2`, `F3`, ...).
2. **Classify Severity**:
   - `blocking`: Ships a functional defect, security vulnerability, BigNumber math violation, static metadata dump, or test breakage.
   - `non-blocking`: Structural refactoring recommendation, code smell, dead helper, or minor a11y enhancement.
3. **Format Findings**:
   - Populate the Human-Readable Findings Table in Section 3.
   - Populate the fenced ````json block in Section 4 matching `debate-review.findings.v1` exactly.
4. **Handoff**:
   - Update `docs/STATUS.md` and `docs/OPENCODE.md` marking the audit complete and notifying Antigravity to begin the Adversarial Debate pass.

---

## 3. Human-Readable Findings Table (To be filled by OpenCode)

| ID  | File & Line Range                                       | Squad / Axis    | Severity     | Claim                                                                                                                                                                                                                                 | Recommended Fix                                                                                                   |
| :-- | :------------------------------------------------------ | :-------------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| F1  | `src/js/protocol/webRequestFilter.js:42-70`             | A / security    | non-blocking | Module strips extension `Origin` headers from InnoGames CDN requests so traffic looks like normal page requests (anti-detection). It is inert (no `webRequest` permission, listener lacks `blocking`) yet is wired at startup.        | Delete `webRequestFilter.js` and its `index.js:86/687` wiring; keep the extension a passive observer.             |
| F2  | `src/js/index.js:761`                                   | A / security    | non-blocking | Server-derived `GameVersion` is interpolated into `innerHTML` without escaping; duplicate sink at `src/js/protocol/networkListener.js:114`.                                                                                           | Render via `textContent` or wrap with `escapeHTML` from `utils/formatters.js`.                                    |
| F3  | `src/chrome/manifest.json:9`                            | A / spec        | non-blocking | `minimum_chrome_version: "88.0"` predates support for the `content_scripts.world: "MAIN"` key (Chrome 111+), so on 88-110 the interceptor silently never loads.                                                                       | Raise to `"111.0"` or feature-detect/use `chrome.scripting` with `world: "MAIN"`.                                 |
| F4  | `src/js/calc/CityMapEntityProcessor.js:617-618`         | B / standards   | non-blocking | Pure-calc module mutates the DOM via `debugEl.innerHTML` (element injected via options), violating the calc/-is-DOM-free boundary.                                                                                                    | Emit unknown-entity debug via logger or an injected `onDebugEntity` callback; let `src/js/ui/` write it.          |
| F5  | `src/js/msg/GuildBattlegroundService.js:1-848`          | B / standards   | non-blocking | Module is 848 lines, exceeding the 600 hard cap and the 800 absolute ceiling; it is not a grandfathered monolith.                                                                                                                     | Continue slicing: shared signal-payload resolver, leaderboard normalization, panel builders.                      |
| F6  | `src/js/ui/cardVisibility.ts:1`                         | B / standards   | non-blocking | TS mirrors (`GbgCalculator.ts`, `GreatBuildingCalculator.ts`, `cardVisibility.ts`, `panelDispatcher.ts`, `calc/utils/eraUtils.ts`, `bignumberUtils.ts`) are off the webpack import graph (all importers pin `.js`) and have diverged. | Pick one source of truth: migrate imports to `.ts` or delete the `.ts` ports; add a divergence guard.             |
| F7  | `src/js/ui/playerTooltip.js:201-214`                    | B / standards   | non-blocking | UI layer parses the raw RPC envelope and alternate snake_case protocol keys, crossing the ui/-does-not-parse-RPC boundary.                                                                                                            | Normalize in the owning msg service and pass a normalized structure to `updateIgnoreListUI`.                      |
| F8  | `src/js/ui/renderGbDonationPanel.js:95-98`              | C / correctness | non-blocking | Suggested-donation fallback uses native `Math.round(base * percent / 100)` instead of BigNumber `ROUND_HALF_UP`, yielding off-by-one at reachable custom rates.                                                                       | Use `new BigNumber(...).multipliedBy(percent).dividedBy(100).integerValue(ROUND_HALF_UP)` or remove the fallback. |
| F9  | `src/js/calc/InvestedCalculator.js:5`                   | C / docs        | non-blocking | Header claims "ceiling rounding" for Arc rewards while the implementation uses `ROUND_HALF_UP`; stale wording also in `InvestedService.js:28` and a test title.                                                                       | Correct comments/test title to half-up to match `bignumber-precision.md`.                                         |
| F10 | `src/js/calc/GreatBuildingCalculator.js:205-211`        | C / correctness | non-blocking | `calculateSafeSpots` drops out of BigNumber: `Math.min(donateCustom, remaining.toNumber())` reinserts a native number and `profit = rewardFP - lockFP` is native math.                                                                | Use `BigNumber.minimum`/`minus` and convert only at the return boundary.                                          |
| F11 | `src/js/calc/gbNaming.js:31-126`                        | D / spec        | blocking     | Hardcoded `GB_SHORT_NAMES` and `GB_FALLBACK_NAMES` maps bake ~90 GB ID/name/abbreviation pairs into runtime `src/`, violating `dynamic-runtime-metadata.md` and shipping English-only names.                                          | Resolve GB names from live `MetadataStore`/RPC; keep only an ID-derived heuristic fallback.                       |
| F12 | `src/js/calc/utils/gbNames.js:7-64`                     | D / spec        | blocking     | Second hardcoded `GB_NAME_MAP` ID->name dictionary, consumed by `GreatBuildingRegistry.js:11`, duplicating and diverging from `gbNaming.js`.                                                                                          | Remove the map; resolve from live metadata / a single dynamic resolver.                                           |
| F13 | `src/js/calc/gbNaming.js:199,210-215`                   | D / correctness | blocking     | A static `GB_FALLBACK_NAMES` hit is reported to `reportEntityLookup` as `found=true`, and the defs branch passes a `def` object as the boolean `found`; genuine cache misses are never surfaced.                                      | Report `found=false` when returning a static fallback; pass a real boolean in the defs branch.                    |
| F14 | `src/js/msg/GuildBattlegroundService.js:255-264`        | D / correctness | blocking     | `getBattleground` dereferences `msg.responseData.map.id.split('_')` and `.map.provinces` unguarded; a partial packet throws before province state is stored.                                                                          | Guard nested payload with optional chaining and array checks; skip null provinces.                                |
| F15 | `src/js/msg/GuildBattlegroundService.js:202-246`        | D / correctness | blocking     | `getState` calls `playerLeaderboardEntries.forEach` and `entry.player.name` unguarded, though the renderer tolerates missing/empty entries.                                                                                           | Mirror the renderer: guard `stateId`, default entries to `[]`, use `entry?.player?.name`.                         |
| F16 | `src/js/msg/GuildBattlegroundService.js:71-88`          | D / correctness | blocking     | `getPlayerLeaderboard` calls `msg.responseData.forEach` and `entry.player.name` unguarded; one malformed entry aborts the whole handler.                                                                                              | Normalize `Array.isArray(msg?.responseData) ? ... : []` and use `entry?.player?.name`.                            |
| F17 | `src/js/calc/boosts/MilitaryBoostCalculator.js:196-203` | D / correctness | blocking     | QI economy handlers match type names absent from real payloads (`guild_raids_coin_boost` vs `guild_raids_coins_production`; likewise supplies/goods/action points), so `qiBoosts` stays 0.                                            | Map the real `guild_raids_*_production/start/capacity/collection` types into the QI buckets.                      |
| F18 | `src/js/msg/BoostService.js:197-198`                    | D / correctness | non-blocking | `getAllBoosts` reads `item.value` with no null-element guard, so one null aborts boost ingestion; sibling `applyBoostsToCity` (`:95-96`) does guard.                                                                                  | Add `if (!item) continue;` before reading `item.value`.                                                           |
| F19 | `src/js/msg/BoostService.js:97-135`                     | D / standards   | non-blocking | `applyBoostsToCity` aggregates combat percentages with native `Number`/`+=` while `getAllBoosts` uses BigNumber, so the two combat paths use different numeric models.                                                                | Accumulate through BigNumber and convert at the render boundary.                                                  |
| F20 | `tests/fn/city-stats-calculator.test.mjs:68`            | D / tests       | non-blocking | Test feeds the non-existent `guild_raids_coin_boost`, giving false coverage to the dead QI handler.                                                                                                                                   | Drive the QI test from real `BoostService.getAllBoosts` fixture type names.                                       |
| F21 | `src/js/ui/components/statFormatters.js:197`            | E / standards   | non-blocking | Popover triggers carry `role="button"` but no `tabindex` (also `cityStatsHtmlBuilder.js:46,54,59,61`), so they can never receive the focus/blur handlers `PopoverManager` binds.                                                      | Add `tabindex="0"` (and `aria-label` on icon-only triggers) to every popover span.                                |
| F22 | `src/js/ui/renderGbDonationPanel.js:217`                | E / standards   | non-blocking | `freeTextLabel` is a `<p href=...>` with `data-bs-toggle` but no `role`, `tabindex`, `aria-expanded`, or `data-bs-target`; it is not a keyboard-operable, announced control.                                                          | Add `role="button" tabindex="0" aria-expanded data-bs-target`; drop the invalid `href`.                           |
| F23 | `src/js/ui/expeditionTables.js:19`                      | E / standards   | non-blocking | Leaderboard/result cards use `role="alert"` (assertive live region), so each RPC re-render interruptively announces the whole table.                                                                                                  | Use `role="status"` / `aria-live="polite"`; reserve `alert` for urgent events.                                    |
| F24 | `src/js/ui/renderGuildPanel.js:92-98`                   | E / correctness | blocking     | Duplicate ids `#guildText`/`#guildTextLabel` with `OtherPlayerService.js:269-277`; Bootstrap's data-api toggles both, and `getElementById` updates only the first, desyncing icons/`aria-expanded`.                                   | Namespace the Lists-panel ids/collapse targets so every id is globally unique.                                    |
| F25 | `src/js/ui/renderGalaxyPanel.js:94`                     | E / spec        | non-blocking | Inline `max-height: 20em !important; overflow-y: auto !important` overrides the non-important `maxHeight` writes in `panelResize.js:46/57` and fights the native collapse lifecycle.                                                  | Remove the inline `!important`; express the cap via class/CSS or the resize binding.                              |
| F26 | `src/js/fn/collapse.js:155,433`                         | E / spec        | non-blocking | Collapse flags persist to flat global `chrome.storage.local` keys (`collapseGBInfo`, `collapseClipboard`) and `storageListener.js:168` restores them world-agnostically, leaking state across worlds.                                 | Move flags into `FACTORY_WORLD_SETTINGS`/`saveWorldSettings`, or drop persistence.                                |
| F27 | `src/js/utils/storage.js:83-98,134`                     | E / spec        | non-blocking | `toolOptions` (panel heights) is written to both `world:<id>` and a global flat key, and `getStorage` prefers the flat value, so panel sizes leak between worlds.                                                                     | Remove the redundant flat `local.set`/read; persist exclusively via `worldStorage`.                               |

---

## 4. Machine-Readable Findings JSON (`debate-review.findings.v1`)

_(OpenCode: replace the template below with your complete array of findings)_

```json
{
  "schema": "debate-review.findings.v1",
  "head": "f46e965",
  "verdict": "needs-attention",
  "summary": "Initial end-to-end audit across 5 specialized squads found no active out-of-band game RPC and no static JSON dumps, but surfaced 8 blocking issues (hardcoded GB metadata maps in calc/, GBG payload guards that crash on partial packets, a dead QI boost type mapping, and duplicate #guildText DOM ids) plus 19 non-blocking security/spec/standards issues (an inert origin-stripping webRequest module, unescaped version interpolation, TS mirrors off the import graph, native Number FP math, and several per-world storage and a11y gaps). Needs attention before release; most fixes are localized.",
  "findings": [
    {
      "id": "F1",
      "file": "src/js/protocol/webRequestFilter.js",
      "line_start": 42,
      "line_end": 70,
      "severity": "non-blocking",
      "axis": "security",
      "claim": "Module strips extension Origin headers from InnoGames CDN requests so they look like normal page traffic; it is inert (no webRequest permission, listener lacks 'blocking') but is wired at startup.",
      "evidence": "src/js/protocol/webRequestFilter.js:4 'Strips origin headers from extension requests to InnoGames CDNs'; :60 {urls:['https://*.innogamescdn.com/*']}; :61 ['requestHeaders'] (no 'blocking'); src/chrome/manifest.json:39 permissions lack webRequest; src/js/index.js:687 initWebRequestFilter();",
      "recommendation": "Delete webRequestFilter.js and remove the index.js:86 import and index.js:687 call. Keep the extension a passive observer.",
      "confidence": 0.85
    },
    {
      "id": "F2",
      "file": "src/js/index.js",
      "line_start": 761,
      "line_end": 761,
      "severity": "non-blocking",
      "axis": "security",
      "claim": "Server-derived GameVersion is interpolated into innerHTML without escaping; same pattern at networkListener.js:114.",
      "evidence": "src/js/index.js:761 citystats.innerHTML += `<div>...: ${GameVersion}...`; source value from src/js/protocol/networkListener.js:302 contentTypeHeader.value.substr(8,5); duplicate sink networkListener.js:114 ${newVersion}.",
      "recommendation": "Render via document.createElement/textContent or wrap with escapeHTML from src/js/utils/formatters.js.",
      "confidence": 0.6
    },
    {
      "id": "F3",
      "file": "src/chrome/manifest.json",
      "line_start": 9,
      "line_end": 9,
      "severity": "non-blocking",
      "axis": "spec",
      "claim": "minimum_chrome_version 88.0 predates support for content_scripts.world:'MAIN' (Chrome 111+), so on Chrome 88-110 the MAIN-world interceptor silently never loads.",
      "evidence": "src/chrome/manifest.json:9 'minimum_chrome_version': '88.0' vs :17 'world': 'MAIN'.",
      "recommendation": "Raise minimum_chrome_version to '111.0' or feature-detect and use chrome.scripting with world:'MAIN'.",
      "confidence": 0.8
    },
    {
      "id": "F4",
      "file": "src/js/calc/CityMapEntityProcessor.js",
      "line_start": 617,
      "line_end": 618,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "Pure calc/ module mutates the DOM via debugEl.innerHTML (injected element), violating the calc/-is-DOM-free invariant.",
      "evidence": "src/js/calc/CityMapEntityProcessor.js:617 'if (DEV && !found && debugEl) {' :618 'debugEl.innerHTML += ...'; debugEl from options.debugEl at :61.",
      "recommendation": "Emit unknown-entity diagnostics via the scoped logger or an onDebugEntity callback and let a src/js/ui/ consumer write the DOM.",
      "confidence": 0.9
    },
    {
      "id": "F5",
      "file": "src/js/msg/GuildBattlegroundService.js",
      "line_start": 1,
      "line_end": 848,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "File is 848 lines, exceeding the 600 hard cap and the 800 absolute ceiling; it is not a grandfathered monolith.",
      "evidence": "wc -l = 848 for src/js/msg/GuildBattlegroundService.js; src/js/msg/GuildBattlegroundService.js:417-683 hold near-duplicate signal payload logic (~264 lines).",
      "recommendation": "Extract a shared signal-payload resolver and leaderboard normalization into focused modules to bring it under budget.",
      "confidence": 0.95
    },
    {
      "id": "F6",
      "file": "src/js/ui/cardVisibility.ts",
      "line_start": 1,
      "line_end": 463,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "TS mirrors are off the webpack import graph (importers pin .js) and have diverged from their .js twins, so tsc validates code that never ships.",
      "evidence": "src/js/calc/GbgCalculator.ts (236) vs .js (181); src/js/calc/GreatBuildingCalculator.ts (277) vs .js (235); src/js/ui/cardVisibility.ts (463) vs .js (430); src/js/ui/panelDispatcher.ts (739) vs .js (551); also calc/utils/eraUtils.ts and bignumberUtils.ts; all importers use explicit .js extensions.",
      "recommendation": "Establish a single source of truth: migrate imports to the TS modules and delete the .js twins, or delete the TS ports; add a divergence guard.",
      "confidence": 0.75
    },
    {
      "id": "F7",
      "file": "src/js/ui/playerTooltip.js",
      "line_start": 201,
      "line_end": 214,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "UI layer parses the raw RPC envelope and alternate snake_case protocol keys, crossing the ui/-does-not-parse-RPC boundary.",
      "evidence": "src/js/ui/playerTooltip.js:202 'const data = msg?.responseData || msg;' :210-212 'data.ignoredByPlayerIds || data.ignored_by_player_ids'.",
      "recommendation": "Normalize in the owning msg service and pass a normalized structure to updateIgnoreListUI.",
      "confidence": 0.8
    },
    {
      "id": "F8",
      "file": "src/js/ui/renderGbDonationPanel.js",
      "line_start": 95,
      "line_end": 98,
      "severity": "non-blocking",
      "axis": "correctness",
      "claim": "Suggested-donation fallback uses native Math.round instead of BigNumber ROUND_HALF_UP, yielding off-by-one at some reachable custom rates.",
      "evidence": "src/js/ui/renderGbDonationPanel.js:98 ': Math.round((GBrewards[i] || 0) * (currentPercent / 100));'.",
      "recommendation": "Replace with new BigNumber(base).multipliedBy(percent).dividedBy(100).integerValue(ROUND_HALF_UP) or remove the fallback and require calculateSuggestedDonation.",
      "confidence": 0.85
    },
    {
      "id": "F9",
      "file": "src/js/calc/InvestedCalculator.js",
      "line_start": 5,
      "line_end": 5,
      "severity": "non-blocking",
      "axis": "docs",
      "claim": "Header claims 'ceiling rounding' for Arc rewards while the implementation uses ROUND_HALF_UP; stale wording also in InvestedService.js:28 and a contributions test title.",
      "evidence": "src/js/calc/InvestedCalculator.js:5 'Arc multiplier boosts with ceiling rounding,' vs :122 '.integerValue(BigNumber.ROUND_HALF_UP);'.",
      "recommendation": "Correct the comments and test title to half-up / ROUND_HALF_UP so docs match bignumber-precision.md.",
      "confidence": 0.95
    },
    {
      "id": "F10",
      "file": "src/js/calc/GreatBuildingCalculator.js",
      "line_start": 205,
      "line_end": 211,
      "severity": "non-blocking",
      "axis": "correctness",
      "claim": "calculateSafeSpots drops out of BigNumber: it truncates remaining to a Number for Math.min, reinserts it, and computes profit with native subtraction.",
      "evidence": "src/js/calc/GreatBuildingCalculator.js:205 'Math.min(donateCustom, remaining.toNumber()),' :211 'const profit = rewardFP - lockFP;'.",
      "recommendation": "Use BigNumber.minimum and rewardBN.minus(lockBN); convert to Number only at the returned-object boundary.",
      "confidence": 0.7
    },
    {
      "id": "F11",
      "file": "src/js/calc/gbNaming.js",
      "line_start": 31,
      "line_end": 126,
      "severity": "blocking",
      "axis": "spec",
      "claim": "Hardcoded GB_SHORT_NAMES and GB_FALLBACK_NAMES maps bake ~90 GB ID/name/abbreviation pairs into runtime src/, violating dynamic-runtime-metadata.md and shipping English-only names.",
      "evidence": "src/js/calc/gbNaming.js:31 'const GB_SHORT_NAMES = new Map([' :74 'const GB_FALLBACK_NAMES = new Map([' with entries such as ['X_FutureEra_Landmark1', 'The Arc'].",
      "recommendation": "Delete both static maps and resolve names from live CityEntityDefs/MetadataStore; allow only an ID-derived heuristic fallback.",
      "confidence": 0.9
    },
    {
      "id": "F12",
      "file": "src/js/calc/utils/gbNames.js",
      "line_start": 7,
      "line_end": 64,
      "severity": "blocking",
      "axis": "spec",
      "claim": "Second hardcoded GB_NAME_MAP ID->name dictionary, consumed by GreatBuildingRegistry, duplicating and diverging from gbNaming.js.",
      "evidence": "src/js/calc/utils/gbNames.js:7 'const GB_NAME_MAP = {' :64 'return GB_NAME_MAP[cleanId] || GB_NAME_MAP[cityEntityId] || ...'; src/js/state/GreatBuildingRegistry.js:11 require('../calc/utils/gbNames.js'); :127 getGreatBuildingName(...).",
      "recommendation": "Remove GB_NAME_MAP and resolve names from live metadata through a single dynamic resolver.",
      "confidence": 0.9
    },
    {
      "id": "F13",
      "file": "src/js/calc/gbNaming.js",
      "line_start": 210,
      "line_end": 215,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "A static GB_FALLBACK_NAMES hit is reported to reportEntityLookup as found=true, and the defs branch passes a def object as the boolean found; genuine cache misses are never surfaced.",
      "evidence": "src/js/calc/gbNaming.js:210 'const fallback = GB_FALLBACK_NAMES.get(GB_name);' :214 'store.reportEntityLookup(String(city_entity), Boolean(fallback));' :199 'store.reportEntityLookup(String(city_entity), def);'.",
      "recommendation": "Report found=false when returning a static/derived fallback so misses route to resolveMissingCityEntities(), and pass a real boolean in the defs branch.",
      "confidence": 0.85
    },
    {
      "id": "F14",
      "file": "src/js/msg/GuildBattlegroundService.js",
      "line_start": 255,
      "line_end": 264,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "getBattleground dereferences msg.responseData.map.id.split('_') and .map.provinces unguarded; a partial packet throws before province state is stored.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:255 'mapName = msg.responseData.map.id.split('_')[0];' :262 'map = msg.responseData.map.provinces;' :264 'map.forEach(...)'.",
      "recommendation": "Guard the nested payload with optional chaining and array checks; skip null province entries.",
      "confidence": 0.85
    },
    {
      "id": "F15",
      "file": "src/js/msg/GuildBattlegroundService.js",
      "line_start": 202,
      "line_end": 246,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "getState calls playerLeaderboardEntries.forEach and entry.player.name unguarded, though the sibling renderer tolerates missing/empty entries.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:202 'if (msg.responseData.stateId == ...)' :235 'msg.responseData.playerLeaderboardEntries.forEach((entry) => {' :246 'name: entry.player.name,'.",
      "recommendation": "Guard stateId, default entries to [], and read entry?.player?.name as renderBattlegroundResultCard does.",
      "confidence": 0.85
    },
    {
      "id": "F16",
      "file": "src/js/msg/GuildBattlegroundService.js",
      "line_start": 71,
      "line_end": 88,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "getPlayerLeaderboard calls msg.responseData.forEach and entry.player.name unguarded; one malformed entry aborts the handler.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:71 'msg.responseData.forEach((entry) => {' :80 'name: entry.player.name,' :84 'name: entry.player.name,'.",
      "recommendation": "Normalize with Array.isArray(msg?.responseData) ? ... : [] and use entry?.player?.name.",
      "confidence": 0.8
    },
    {
      "id": "F17",
      "file": "src/js/calc/boosts/MilitaryBoostCalculator.js",
      "line_start": 196,
      "line_end": 203,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "QI economy handlers match type names absent from real payloads, so qiBoosts stay 0.",
      "evidence": "src/js/calc/boosts/MilitaryBoostCalculator.js:196 'guild_raids_coin_boost' :198 'guild_raids_supply_boost' :200 'guild_raids_goods_boost' :202 'guild_raids_action_points_boost'; real fixture types are guild_raids_coins_production / guild_raids_coins_start / guild_raids_supplies_production / guild_raids_goods_start / guild_raids_action_points_collection / guild_raids_action_points_capacity.",
      "recommendation": "Map the real guild_raids_* type strings into the QI economy buckets and decide additive vs one-shot for *_start/_capacity.",
      "confidence": 0.9
    },
    {
      "id": "F18",
      "file": "src/js/msg/BoostService.js",
      "line_start": 197,
      "line_end": 198,
      "severity": "non-blocking",
      "axis": "correctness",
      "claim": "getAllBoosts reads item.value with no null-element guard, so one null aborts boost ingestion; the sibling applyBoostsToCity does guard.",
      "evidence": "src/js/msg/BoostService.js:197 'for (const item of list) {' :198 'const val = new BigNumber(item.value || 0);' vs :95-96 'for (const item of list) { if (!item) continue;'.",
      "recommendation": "Add 'if (!item) continue;' at the top of the getAllBoosts loop.",
      "confidence": 0.8
    },
    {
      "id": "F19",
      "file": "src/js/msg/BoostService.js",
      "line_start": 97,
      "line_end": 135,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "applyBoostsToCity aggregates combat percentages with native Number/+= while getAllBoosts uses BigNumber, so the two combat paths use different numeric models.",
      "evidence": "src/js/msg/BoostService.js:97 'const val = Number(item.value) || 0;' :117 'cityTarget[map.attAtt] += val;' (branches through :135); getAllBoosts uses new BigNumber at :198.",
      "recommendation": "Accumulate through BigNumber in applyBoostsToCity and convert to Number only at the render boundary.",
      "confidence": 0.75
    },
    {
      "id": "F20",
      "file": "tests/fn/city-stats-calculator.test.mjs",
      "line_start": 68,
      "line_end": 68,
      "severity": "non-blocking",
      "axis": "tests",
      "claim": "Test feeds the non-existent guild_raids_coin_boost, giving false coverage to the dead QI handler.",
      "evidence": "tests/fn/city-stats-calculator.test.mjs:68 \"{ type: 'guild_raids_coin_boost', value: 12 },\" and :203 asserts qiBoosts.coins == 12, while the fixture only contains guild_raids_coins_production.",
      "recommendation": "Drive the QI test from real BoostService.getAllBoosts fixture type names so it fails until F17 is fixed.",
      "confidence": 0.85
    },
    {
      "id": "F21",
      "file": "src/js/ui/components/statFormatters.js",
      "line_start": 197,
      "line_end": 197,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "Popover triggers carry role='button' but no tabindex (also cityStatsHtmlBuilder.js:46,54,59,61), so they can never receive the focus/blur handlers PopoverManager binds.",
      "evidence": "src/js/ui/components/statFormatters.js:197 role='button' data-bs-toggle='popover' with no tabindex; src/js/ui/components/PopoverManager.js:125 el.addEventListener('focus', showPopover); no tabindex in either file.",
      "recommendation": "Add tabindex='0' (and aria-label on icon-only triggers) to every popover span.",
      "confidence": 0.9
    },
    {
      "id": "F22",
      "file": "src/js/ui/renderGbDonationPanel.js",
      "line_start": 217,
      "line_end": 217,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "freeTextLabel is a <p href=...> with data-bs-toggle but no role, tabindex, aria-expanded, or data-bs-target; it is not a keyboard-operable, announced control.",
      "evidence": "src/js/ui/renderGbDonationPanel.js:217 '<p id=\"freeTextLabel\" href=\"#donationText3\" aria-controls=\"donationText3\" data-bs-toggle=\"collapse\">'.",
      "recommendation": "Add role='button' tabindex='0' aria-expanded and data-bs-target; remove the invalid href.",
      "confidence": 0.9
    },
    {
      "id": "F23",
      "file": "src/js/ui/expeditionTables.js",
      "line_start": 19,
      "line_end": 19,
      "severity": "non-blocking",
      "axis": "standards",
      "claim": "Leaderboard/result cards use role='alert' (assertive live region), so each RPC re-render interruptively announces the whole table.",
      "evidence": "src/js/ui/expeditionTables.js:19 '<div id=\"geChampionshipCard\" ... role=\"alert\">'; same at :31, src/js/ui/renderBattlegroundResultCard.js:111, src/js/ui/gbgProvinceView.js:146.",
      "recommendation": "Use role='status' / aria-live='polite' for these informational cards and reserve role='alert' for urgent events.",
      "confidence": 0.7
    },
    {
      "id": "F24",
      "file": "src/js/ui/renderGuildPanel.js",
      "line_start": 92,
      "line_end": 98,
      "severity": "blocking",
      "axis": "correctness",
      "claim": "Duplicate ids #guildText/#guildTextLabel with OtherPlayerService.js:269-277; Bootstrap's data-api toggles both and getElementById updates only the first, desyncing icons/aria-expanded.",
      "evidence": "src/js/ui/renderGuildPanel.js:92 id='guildTextLabel' data-bs-target='#guildText' and :98 id='guildText'; src/js/msg/OtherPlayerService.js:269 id='guildTextLabel' and :277 id='guildText'.",
      "recommendation": "Namespace the Lists-panel ids and collapse targets (e.g. listsGuildText) so every id is globally unique.",
      "confidence": 0.8
    },
    {
      "id": "F25",
      "file": "src/js/ui/renderGalaxyPanel.js",
      "line_start": 94,
      "line_end": 94,
      "severity": "non-blocking",
      "axis": "spec",
      "claim": "Inline max-height:20em !important / overflow-y:auto !important overrides panelResize.js's non-important maxHeight writes and fights the native collapse lifecycle.",
      "evidence": "src/js/ui/renderGalaxyPanel.js:94 style=\"max-height: 20em !important; overflow-y: auto !important;\"; conflict with src/js/ui/panelResize.js:46 element.style.maxHeight = `${currentSize}px` and :57 = ''.",
      "recommendation": "Remove the inline !important and express the cap via class/CSS or the resize binding so Bootstrap stays authoritative.",
      "confidence": 0.85
    },
    {
      "id": "F26",
      "file": "src/js/fn/collapse.js",
      "line_start": 155,
      "line_end": 155,
      "severity": "non-blocking",
      "axis": "spec",
      "claim": "Collapse flags persist to flat global chrome.storage.local keys and storageListener restores them world-agnostically, leaking state across worlds.",
      "evidence": "src/js/fn/collapse.js:155 storage.set('collapseGBInfo', collapseGBInfo); :433 storage.set('collapseClipboard', collapseClipboard); src/js/utils/storage.js:100-105 flat local.set; src/js/state/storageListener.js:168 if (key.startsWith('collapse')).",
      "recommendation": "Move collapse flags into FACTORY_WORLD_SETTINGS and persist via saveWorldSettings, or drop persistence if session-only.",
      "confidence": 0.8
    },
    {
      "id": "F27",
      "file": "src/js/utils/storage.js",
      "line_start": 83,
      "line_end": 98,
      "severity": "non-blocking",
      "axis": "spec",
      "claim": "toolOptions (panel heights) is written to both world:<id> and a global flat key, and getStorage prefers the flat value, so panel sizes leak between worlds.",
      "evidence": "src/js/utils/storage.js:83 if (name === 'toolOptions') { ... saveWorldSettings(...); local.set({[cleanKey]: value}) } :134 finalVal = stored !== undefined ? stored : (val ?? null); src/js/fn/globals.js:41 storage.set('toolOptions', toolOptions).",
      "recommendation": "Remove the redundant flat local.set/read and persist toolOptions exclusively through worldStorage.",
      "confidence": 0.75
    }
  ]
}
```

---

## 5. Phase 2: Adversarial Debate Evaluation (Antigravity Debater)

Antigravity acted as `adversarial-debater`, inspecting every claimed file and line in the working tree (`head f46e965`) to stress-test claims, challenge assumptions, and eliminate false positives.

| ID      | Finding Summary                                                     | Squad Severity | Debater Verdict | Adjusted Severity | Debater Ruling & Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| :------ | :------------------------------------------------------------------ | :------------- | :-------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1**  | `webRequestFilter.js` Origin header removal is inert                | non-blocking   | **confirm**     | non-blocking      | True finding. `Origin` is a forbidden header for `fetch`/`XHR`; deleting it from request headers object does nothing in MV3. (`src/js/protocol/webRequestFilter.js:18-28`)                                                                                                                                                                                                                                                                                                             |
| **F2**  | `StartupService.js` unescaped `GameVersion` innerHTML sink          | non-blocking   | **confirm**     | non-blocking      | True finding. `GameVersion` from RPC is concatenated into HTML string without escaping. Should use `textContent` or `escapeFn`. (`src/js/msg/StartupService.js:192`)                                                                                                                                                                                                                                                                                                                   |
| **F3**  | `manifest.json` min Chrome 88 vs MAIN world 111+                    | non-blocking   | **confirm**     | non-blocking      | True finding. `world: 'MAIN'` was added in Chrome 111; 88 is an outdated minimum. (`src/chrome/manifest.json:9, 17`)                                                                                                                                                                                                                                                                                                                                                                   |
| **F4**  | `CityMapEntityProcessor.js` mutates DOM via `debugEl.innerHTML`     | non-blocking   | **confirm**     | non-blocking      | True finding. Pure calculation engine in `src/js/calc/` violates directory boundary by writing DOM element. Should log or use callback. (`src/js/calc/CityMapEntityProcessor.js:617-618`)                                                                                                                                                                                                                                                                                              |
| **F5**  | `GuildBattlegroundService.js` 848 lines exceeds 600/800 cap         | non-blocking   | **confirm**     | non-blocking      | True finding. High line count due to duplicated signal and leaderboard payload parsing. Should be decomposed into `calc/` and `ui/` helpers. (`src/js/msg/GuildBattlegroundService.js:1-848`)                                                                                                                                                                                                                                                                                          |
| **F6**  | TS mirrors off webpack import graph                                 | non-blocking   | **confirm**     | non-blocking      | True finding. Divergent TS port files (`.ts`) are unreferenced by webpack/runtime imports; `tsc` validates dead code. Either wire or prune. (`src/js/ui/cardVisibility.ts:1-463`)                                                                                                                                                                                                                                                                                                      |
| **F7**  | `playerTooltip.js` parses raw RPC snake_case                        | non-blocking   | **confirm**     | non-blocking      | True finding. UI component should consume normalized data rather than inspecting raw `msg.responseData` or `ignored_by_player_ids`. (`src/js/ui/playerTooltip.js:201-214`)                                                                                                                                                                                                                                                                                                             |
| **F8**  | `renderGbDonationPanel.js` `Math.round` fallback                    | non-blocking   | **confirm**     | non-blocking      | True finding. Fallback calculation uses `Math.round` instead of BigNumber `ROUND_HALF_UP`, leading to potential off-by-one errors on custom rates. (`src/js/ui/renderGbDonationPanel.js:95-98`)                                                                                                                                                                                                                                                                                        |
| **F9**  | `InvestedCalculator.js` docstring ceiling vs half-up                | non-blocking   | **confirm**     | non-blocking      | True finding. JSDoc header claims 'ceiling rounding' while implementation correctly uses `BigNumber.ROUND_HALF_UP`. Header doc is stale. (`src/js/calc/InvestedCalculator.js:5`)                                                                                                                                                                                                                                                                                                       |
| **F10** | `GreatBuildingCalculator.js` safe spots drops BigNumber             | non-blocking   | **confirm**     | non-blocking      | True finding. Computes `Math.min` on `toNumber()` and native subtraction before returning. Should stay in BigNumber until export boundary. (`src/js/calc/GreatBuildingCalculator.js:205, 211`)                                                                                                                                                                                                                                                                                         |
| **F11** | Hardcoded maps in `gbNaming.js`                                     | blocking       | **downgrade**   | **non-blocking**  | **Contested / Refuted as blocker**. OpenCode recommends deleting both maps. However: (1) `GB_SHORT_NAMES` ('CdM', 'Traz', 'Arc') are community abbreviations that **do not exist** in InnoGames RPC/Metadata, and deleting them breaks `fGBsname` and user UI; (2) `GB_FALLBACK_NAMES` ensures graceful cold-boot UI before `CityEntityDefs` hydrates from network. Severity downgraded to non-blocking tech debt to explore dynamic-first aliases. (`src/js/calc/gbNaming.js:31-126`) |
| **F12** | Duplicate `GB_NAME_MAP` in `calc/utils/gbNames.js`                  | blocking       | **downgrade**   | **non-blocking**  | True duplication, but severity overstated. Does not break runtime execution or crash the extension; it is standard consolidation debt. Downgraded to non-blocking. (`src/js/calc/utils/gbNames.js:7-64`)                                                                                                                                                                                                                                                                               |
| **F13** | `reportEntityLookup` fallback reporting as blocking                 | blocking       | **refute**      | **non-blocking**  | **Refuted as blocker**. `tests/fn/entity-lookup-logging.test.mjs:72-76` explicitly tests that returning a known fallback is **not** a miss (`assert.strictEqual(reportCalls.length, 0)`). Marking `found=false` breaks the existing test suite and floods missing entity logs. The boolean conversion at line 199 is a valid minor type nit (`Boolean(def)`). (`src/js/calc/gbNaming.js:210-215`)                                                                                      |
| **F14** | `GuildBattlegroundService.getBattleground` unguarded `split`        | blocking       | **confirm**     | **blocking**      | True blocker. `msg.responseData.map.id.split('_')[0]` and `.provinces.forEach` throw `TypeError` if payload structure is partial or empty, terminating GBG state processing. (`src/js/msg/GuildBattlegroundService.js:255-264`)                                                                                                                                                                                                                                                        |
| **F15** | `GuildBattlegroundService.getState` unguarded leaderboard           | blocking       | **confirm**     | **blocking**      | True blocker. `playerLeaderboardEntries.forEach` and `entry.player.name` throw on malformed or empty leaderboard packets. (`src/js/msg/GuildBattlegroundService.js:202-246`)                                                                                                                                                                                                                                                                                                           |
| **F16** | `GuildBattlegroundService.getPlayerLeaderboard` unguarded `forEach` | blocking       | **confirm**     | **blocking**      | True blocker. Dereferences `entry.player.name` unguarded; one corrupted entry aborts whole leaderboard parsing. (`src/js/msg/GuildBattlegroundService.js:71-88`)                                                                                                                                                                                                                                                                                                                       |
| **F17** | `MilitaryBoostCalculator.js` QI boost type mismatches               | blocking       | **confirm**     | **blocking**      | True blocker. Checks for `guild_raids_coin_boost` etc., whereas actual InnoGames server RPC payloads use `guild_raids_coins_production`, `guild_raids_supplies_production`, etc. QI boosts silently remain 0 in production. (`src/js/calc/boosts/MilitaryBoostCalculator.js:196-203`)                                                                                                                                                                                                  |
| **F18** | `BoostService.getAllBoosts` missing null-element guard              | non-blocking   | **confirm**     | non-blocking      | True finding. Iterates `list` and accesses `item.value` without `if (!item) continue;`, whereas `applyBoostsToCity` includes this guard. (`src/js/msg/BoostService.js:197-198`)                                                                                                                                                                                                                                                                                                        |
| **F19** | `BoostService.applyBoostsToCity` native Number vs BigNumber         | non-blocking   | **confirm**     | non-blocking      | True finding. Uses native `Number(item.value)                                                                                                                                                                                                                                                                                                                                                                                                                                          |     | 0`and`+=`accumulation, diverging from`getAllBoosts` BigNumber precision. (`src/js/msg/BoostService.js:97-135`) |
| **F20** | `city-stats-calculator.test.mjs` feeds fake QI boost type           | non-blocking   | **confirm**     | non-blocking      | True finding. Test fixture supplies fake `'guild_raids_coin_boost'` matching buggy implementation rather than real InnoGames RPC schema, masking F17. (`tests/fn/city-stats-calculator.test.mjs:68`)                                                                                                                                                                                                                                                                                   |
| **F21** | Popover triggers missing `tabindex="0"`                             | non-blocking   | **confirm**     | non-blocking      | True finding. Popover triggers have `role="button"` and `data-bs-toggle="popover"` but no `tabindex="0"`, making them unreachable via keyboard navigation. (`src/js/ui/components/statFormatters.js:197`)                                                                                                                                                                                                                                                                              |
| **F22** | `renderGbDonationPanel.js` `<p>` with `href`                        | non-blocking   | **confirm**     | non-blocking      | True finding. `<p id="freeTextLabel" href="...">` is invalid HTML and fails keyboard accessibility and Bootstrap collapse semantics. (`src/js/ui/renderGbDonationPanel.js:217`)                                                                                                                                                                                                                                                                                                        |
| **F23** | `expeditionTables.js` `role="alert"` on data tables                 | non-blocking   | **confirm**     | non-blocking      | True finding. Uses `role="alert"` (assertive live region) on championship and leaderboard cards, causing screen readers to disruptively re-announce entire tables on updates. Should use `role="status"` or `aria-live="polite"`. (`src/js/ui/expeditionTables.js:19, 31`)                                                                                                                                                                                                             |
| **F24** | Duplicate `#guildText` and `#guildTextLabel` DOM IDs                | blocking       | **confirm**     | **blocking**      | True blocker. `renderGuildPanel.js` and `OtherPlayerService.js` both inject elements with IDs `#guildText` and `#guildTextLabel`. Bootstrap collapse toggles both or targets the wrong panel, breaking UI collapse state. (`src/js/ui/renderGuildPanel.js:92-98`, `src/js/msg/OtherPlayerService.js:269-277`)                                                                                                                                                                          |
| **F25** | `renderGalaxyPanel.js` inline `!important` max-height               | non-blocking   | **confirm**     | non-blocking      | True finding. `style="max-height: 20em !important;"` overrides programmatic panel resizing logic in `panelResize.js`. (`src/js/ui/renderGalaxyPanel.js:94`)                                                                                                                                                                                                                                                                                                                            |
| **F26** | Flat storage keys for collapse state                                | non-blocking   | **confirm**     | non-blocking      | True finding. `collapseGBInfo` and `collapseClipboard` are stored as flat un-namespaced keys in `chrome.storage.local`, leaking collapse state across game worlds. (`src/js/fn/collapse.js:155, 433`)                                                                                                                                                                                                                                                                                  |
| **F27** | `storage.js` dual-write and flat override for `toolOptions`         | non-blocking   | **confirm**     | non-blocking      | True finding. `storage.set('toolOptions', ...)` writes to both world settings and flat local storage; `getStorage` prioritizes the flat value, overriding world-scoped heights. (`src/js/utils/storage.js:83-98, 134`)                                                                                                                                                                                                                                                                 |

---

## 6. Machine-Readable Debate Payload (`debate-review.debate.v1`)

```json
{
  "schema": "debate-review.debate.v1",
  "head": "f46e965",
  "verdicts": [
    {
      "id": "F1",
      "verdict": "confirm",
      "reason": "Origin is a forbidden browser header and cannot be stripped via requestHeaders modification in MV3.",
      "evidence": "src/js/protocol/webRequestFilter.js:18-28"
    },
    {
      "id": "F2",
      "verdict": "confirm",
      "reason": "GameVersion is raw RPC string concatenated directly into innerHTML sink without escaping.",
      "evidence": "src/js/msg/StartupService.js:192"
    },
    {
      "id": "F3",
      "verdict": "confirm",
      "reason": "content_scripts world:'MAIN' requires Chrome 111+; manifest minimum_chrome_version specifies 88.0.",
      "evidence": "src/chrome/manifest.json:9,17"
    },
    {
      "id": "F4",
      "verdict": "confirm",
      "reason": "Pure calc/ engine writes directly to debugEl.innerHTML, violating directory architecture boundaries.",
      "evidence": "src/js/calc/CityMapEntityProcessor.js:617-618"
    },
    {
      "id": "F5",
      "verdict": "confirm",
      "reason": "File size is 848 lines, exceeding both the 600-line hard cap and 800-line absolute ceiling.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:1-848"
    },
    {
      "id": "F6",
      "verdict": "confirm",
      "reason": "TypeScript port files are unreferenced by webpack imports and have diverged from shipping JS files.",
      "evidence": "src/js/ui/cardVisibility.ts:1-463"
    },
    {
      "id": "F7",
      "verdict": "confirm",
      "reason": "UI component inspects raw RPC envelopes and snake_case protocol fallback keys.",
      "evidence": "src/js/ui/playerTooltip.js:201-214"
    },
    {
      "id": "F8",
      "verdict": "confirm",
      "reason": "Fallback donation calculation uses Math.round instead of BigNumber ROUND_HALF_UP.",
      "evidence": "src/js/ui/renderGbDonationPanel.js:95-98"
    },
    {
      "id": "F9",
      "verdict": "confirm",
      "reason": "JSDoc module comment specifies ceiling rounding while implementation correctly performs half-up.",
      "evidence": "src/js/calc/InvestedCalculator.js:5"
    },
    {
      "id": "F10",
      "verdict": "confirm",
      "reason": "calculateSafeSpots casts BigNumber to Number for Math.min and uses native float subtraction.",
      "evidence": "src/js/calc/GreatBuildingCalculator.js:205,211"
    },
    {
      "id": "F11",
      "verdict": "downgrade",
      "reason": "GB_SHORT_NAMES are community abbreviations not in InnoGames RPCs, and GB_FALLBACK_NAMES prevents cold-boot breakages; deleting both breaks fGBsname and UX.",
      "evidence": "src/js/calc/gbNaming.js:31-126"
    },
    {
      "id": "F12",
      "verdict": "downgrade",
      "reason": "Duplicate GB_NAME_MAP is legacy code duplication debt, not a blocking defect causing crashes or wrong calculations.",
      "evidence": "src/js/calc/utils/gbNames.js:7-64"
    },
    {
      "id": "F13",
      "verdict": "refute",
      "reason": "Existing unit test in entity-lookup-logging.test.mjs explicitly requires that fallback resolution does NOT emit a miss; passing false breaks tests.",
      "evidence": "tests/fn/entity-lookup-logging.test.mjs:72-76"
    },
    {
      "id": "F14",
      "verdict": "confirm",
      "reason": "getBattleground crashes with TypeError on partial or empty map/provinces payload.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:255-264"
    },
    {
      "id": "F15",
      "verdict": "confirm",
      "reason": "getState crashes with TypeError if playerLeaderboardEntries is missing or entry.player is null.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:202-246"
    },
    {
      "id": "F16",
      "verdict": "confirm",
      "reason": "getPlayerLeaderboard crashes with TypeError if msg.responseData is not an array or entry.player is null.",
      "evidence": "src/js/msg/GuildBattlegroundService.js:71-88"
    },
    {
      "id": "F17",
      "verdict": "confirm",
      "reason": "QI boost type strings in MilitaryBoostCalculator do not match actual InnoGames server RPC types, causing QI boost totals to always remain 0.",
      "evidence": "src/js/calc/boosts/MilitaryBoostCalculator.js:196-203"
    },
    {
      "id": "F18",
      "verdict": "confirm",
      "reason": "getAllBoosts lacks null-element guard present in applyBoostsToCity, risking TypeError on corrupt array items.",
      "evidence": "src/js/msg/BoostService.js:197-198"
    },
    {
      "id": "F19",
      "verdict": "confirm",
      "reason": "applyBoostsToCity accumulates boosts via native Number addition while getAllBoosts uses BigNumber.",
      "evidence": "src/js/msg/BoostService.js:97-135"
    },
    {
      "id": "F20",
      "verdict": "confirm",
      "reason": "Unit test uses synthetic type guild_raids_coin_boost giving false pass to broken QI handler.",
      "evidence": "tests/fn/city-stats-calculator.test.mjs:68"
    },
    {
      "id": "F21",
      "verdict": "confirm",
      "reason": "Popover trigger elements have role='button' but lack tabindex='0', rendering them keyboard-inaccessible.",
      "evidence": "src/js/ui/components/statFormatters.js:197"
    },
    {
      "id": "F22",
      "verdict": "confirm",
      "reason": "freeTextLabel is an invalid <p href=...> tag lacking proper button role, tabindex, and data-bs-target.",
      "evidence": "src/js/ui/renderGbDonationPanel.js:217"
    },
    {
      "id": "F23",
      "verdict": "confirm",
      "reason": "Informational cards use role='alert' which aggressively interrupts screen reader users on dynamic RPC updates.",
      "evidence": "src/js/ui/expeditionTables.js:19,31"
    },
    {
      "id": "F24",
      "verdict": "confirm",
      "reason": "Identical IDs #guildText and #guildTextLabel in renderGuildPanel and OtherPlayerService cause collapse state collisions.",
      "evidence": "src/js/ui/renderGuildPanel.js:92-98 vs src/js/msg/OtherPlayerService.js:269-277"
    },
    {
      "id": "F25",
      "verdict": "confirm",
      "reason": "Inline max-height:20em !important prevents panelResize.js from resizing galaxy panel.",
      "evidence": "src/js/ui/renderGalaxyPanel.js:94"
    },
    {
      "id": "F26",
      "verdict": "confirm",
      "reason": "Collapse flags stored as flat keys in chrome.storage.local leak state across different worlds.",
      "evidence": "src/js/fn/collapse.js:155,433"
    },
    {
      "id": "F27",
      "verdict": "confirm",
      "reason": "Dual-writing toolOptions to flat local storage causes flat value to override world-scoped heights.",
      "evidence": "src/js/utils/storage.js:83-98,134"
    }
  ],
  "new_findings": []
}
```

---

## 7. Orchestrator Synthesis & Prioritized Remediation Plan

Following the two-pass adversarial review between OpenCode (Phase 1 Squad Audits) and Antigravity (Phase 2 Adversarial Debater), the 27 findings are categorized into **5 Verified Blockers**, **3 Refuted / Downgraded Items**, and **19 Non-Blocking Improvements**.

### 7.1 Verified Blockers (Must fix in immediate development slices)

1. **GBG RPC Crash Guards (`F14`, `F15`, `F16`)**:
   - `GuildBattlegroundService.js`: Guard `map?.id?.split('_')`, wrap `provinces` loop in array check, normalize `playerLeaderboardEntries` with `Array.isArray`, and safely access `entry?.player?.name`.
2. **Quantum Incursions Boost Type Desync (`F17`, `F20`)**:
   - `MilitaryBoostCalculator.js`: Align boost type mapping with actual InnoGames server strings (`guild_raids_coins_production`, `guild_raids_supplies_production`, `guild_raids_goods_start`, `guild_raids_action_points_collection`, etc.).
   - `city-stats-calculator.test.mjs`: Update unit test fixture to use real payload types so tests verify real-world RPC handling.
3. **Duplicate DOM ID Collision (`F24`)**:
   - `renderGuildPanel.js` / `OtherPlayerService.js`: Rename IDs and collapse targets in `renderGuildPanel.js` to `listsGuildText` / `listsGuildTextLabel` to eliminate ID collisions with `OtherPlayerService.js`.

### 7.2 Refuted & Downgraded Claims (Avoid destructive regressions)

1. **`F11` (GB Names & Short Names Map Deletion)**: **REJECTED WHOLESALE DELETION**.
   - `GB_SHORT_NAMES` ('CdM', 'Traz', 'Arc', 'CoA') are human UI abbreviations created by the player community. InnoGames server RPCs never supply short abbreviations. Deleting them breaks `fGBsname` and destroys UI badges.
   - `GB_FALLBACK_NAMES` prevents blank/broken UI when the extension cold-boots before `CityEntityDefs` is fetched from CDN.
   - _Action_: Retain maps for display abbreviations and cold fallback; ensure runtime lookups check dynamic `MetadataStore` first.
2. **`F13` (Report Entity Lookup Fallback Miss)**: **REJECTED AS BLOCKER**.
   - Claim that fallbacks must report `found=false` contradicts existing regression tests in `tests/fn/entity-lookup-logging.test.mjs:72-76`. Fallback resolution is intentional to provide graceful degradation.
   - _Action_: Keep `found=true` for known fallbacks, but fix the minor type coercion nit at `gbNaming.js:199` (`Boolean(def)`).
3. **`F12` (Duplicate `gbNames.js`)**: **DOWNGRADED TO NON-BLOCKING TECH DEBT**.
   - Consolidate during the scheduled `GreatBuildingRegistry` refactoring pass rather than an emergency patch.

### 7.3 Non-Blocking Remediation Roadmap (Slices 1 to 4)

- **Slice 1: Precision Math & Calculation Hygiene** (`F8`, `F10`, `F18`, `F19`, `F9`):
  - `renderGbDonationPanel.js`: Replace `Math.round` fallback with BigNumber `ROUND_HALF_UP`.
  - `GreatBuildingCalculator.js`: Use `BigNumber.minimum` and BigNumber subtraction in `calculateSafeSpots`.
  - `BoostService.js`: Add `if (!item) continue;` in `getAllBoosts` and use BigNumber in `applyBoostsToCity`.
  - `InvestedCalculator.js`: Update JSDoc header comment to match half-up precision standard.
- **Slice 2: Accessibility & UI Semantics** (`F21`, `F22`, `F23`, `F25`):
  - Add `tabindex="0"` to popover trigger spans.
  - Fix invalid `<p href=...>` in `renderGbDonationPanel.js` to semantic `<button>` or `<a>`.
  - Replace `role="alert"` with `role="status"` on persistent tables in `expeditionTables.js`.
  - Remove inline `!important` max-height in `renderGalaxyPanel.js`.
- **Slice 3: Monolith Thinning & Architecture** (`F5`, `F4`, `F6`, `F7`):
  - Decompose `GuildBattlegroundService.js` (848 lines $\to <600$ lines) by extracting signal handlers into a dedicated service.
  - Remove `debugEl.innerHTML` from `CityMapEntityProcessor.js` and route diagnostics through scoped logger.
  - Clean up divergent uncompiled TypeScript files.
  - Normalize RPC data before calling `playerTooltip.js`.
- **Slice 4: Manifest, Security & Storage Isolation** (`F1`, `F2`, `F3`, `F26`, `F27`):
  - Purge dead Origin header deletion in `webRequestFilter.js`.
  - Escape `GameVersion` before DOM injection in `StartupService.js`.
  - Update `minimum_chrome_version` in `manifest.json` from 88 to 111.
  - Migrate flat collapse and `toolOptions` storage keys into world-scoped storage.
