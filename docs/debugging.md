# FoE-Info Debugging & Diagnostic Infrastructure

This document describes the debug mode of the FoE-Info extension, the header icon toggle mechanism, console log filtering tags, and workflows for user support and runtime diagnostics.

For browser attachment and live investigation, use [browser debugging](browser-debugging.md).

## 1. Operating Modes Overview

FoE-Info operates with two distinct runtime modes:

1. **Standard Mode (Default)**:
   - **Performance**: Routine debug/info diagnostics are disabled.
   - **Visibility**: Logger warnings and errors remain visible in the DevTools panel console.
   - **Behavior**: Calculations and RPC handling execute silently in the background.

2. **Debugging Mode (Toggled via Header Icon)**:
   - **Performance**: High-resolution instrumentation across all extension layers.
   - **Visibility**: Genuinely verbose diagnostics covering value computations, cache operations, async fetch resolutions, UI re-renders, and network RPC packets, emitted to the DevTools panel console.
   - **Session synchronization**: Stored in `chrome.storage.local` under key `'debugEnabled'` to synchronize the current mode across extension contexts. Each newly loaded panel starts with debugging off, including development and beta builds.

---

## 2. Header Toggle Mechanism

The debug mode is controlled by clicking the logo icon in the top-left of the DevTools panel header:

```text
┌────────────────────────────────────────────────────────┐
│ [FoE INFO]  FoE-Info-DEV                           [⚙] │ ← Click icon to toggle
└────────────────────────────────────────────────────────┘
      │
      ▼ (Click)
┌────────────────────────────────────────────────────────┐
│    [🪲]     FoE-Info-DEV                           [⚙] │ ← Bug icon: Debug Mode ON
└────────────────────────────────────────────────────────┘
```

- **Enabling**:
  - Click the **FoE-Info logo** top-left in the panel header.
  - The icon switches to a **bug icon** (`bug_report`).
  - Verbose diagnostic logging activates across all modules in the DevTools panel console.
- **Disabling**:
  - Click the **bug icon** again.
  - The icon returns to the default FoE-Info logo (`Icon48.png`).
- **State Persistence**:
  - Refreshing the game tab (F5) retains the active mode while the panel stays loaded. Reloading the extension or loading a new panel resets to standard mode; click the header icon to enable debugging again.

---

## 3. Filterable Console Tags Cheat-Sheet

To isolate logs from specific subsystems, type any of these tags into the DevTools panel console filter box:

| Tag Filter                                              | Monitored Subsystem         | Diagnostic Information Emitted                                                                                 |
| :------------------------------------------------------ | :-------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `[FoE-Info]`                                            | **All Logs**                | Captures all logs across the extension.                                                                        |
| `[FoE-Info:RPC]`                                        | **Network JSON-RPC**        | Handled & unhandled RPCs (`[HANDLED]`, `[UNHANDLED]`), class/method, request IDs, decoded response payloads.   |
| `[FoE-Info:RpcRouter]`                                  | **RPC Routing**             | Packet routing to registered services, class fallbacks, and unhandled detections.                              |
| `[FoE-Info:CityStatsCalc]`                              | **City Value Computations** | Entity counts, player era, raw boost tallies, FP/coin/supply totals, and daily goods calculations.             |
| `[FoE-Info:GBCalc]`                                     | **Great Buildings Math**    | Spot lock calculations, owner safe add requirements, and 1.9x Arc reward half-up rounding.                     |
| `[FoE-Info:InvestedCalc]`                               | **Investments & Sniping**   | Contribution counts, Arc multipliers, locked safe spots, hidden GB filtering, and net profit/loss math.        |
| `[FoE-Info:GBG]`                                        | **Guild Battlegrounds**     | Province building attrition reductions, camp counts ready/in-construction, and final attrition chances.        |
| `[FoE-Info:BlueGalaxy]`                                 | **Blue Galaxy Helper**      | Candidate building extractions, charges remaining, and production readiness ranking.                           |
| `[FoE-Info:Boost]`                                      | **Military Boost Matrix**   | Red attacking & Blue defending boost aggregations across Base, GBG, GE, and QI.                                |
| `[FoE-Info:MetadataStore]`                              | **Game Entity Cache**       | Batch entity ingestion counts, cache misses (missing metadata), and store resets (routine cache hits omitted). |
| `[FoE-Info:MetadataResolver]`                           | **Metadata Downloads**      | Missing entity downloads, completion, and retry failures.                                                      |
| `[FoE-Info:StartupService]` with `TIMING:P5`/`P6`/`P6s` | **Startup Rendering**       | The orchestrator uses its caller's logger for metadata completion, fallback timing, and recomputation.         |
| `[FoE-Info:CityStatsRender]`                            | **City Statistics UI**      | Runtime rendering of city statistics.                                                                          |
| `[FoE-Info:PanelDispatcher]`                            | **UI Re-renders & Races**   | Monotonically increasing render cycle sequences (`seq`) and timestamps for detecting race conditions.          |

| `[FoE-Info:DevTools]` | **DevTools Network Bridge** | Request interception, streaming buffer queue, and panel forwarding. |
| `[FoE-Info:ContentBridge]` | **Isolated Content Bridge** | Forwarding XHR/fetch events from page DOM to extension background/panel. |
| `[FoE-Info:XHRInterceptor]` | **Page XHR/Fetch Monkeypatch** | Intercepted URLs and payload byte lengths directly from the page context. |

---

## 4. Out-of-Scope RPC Log Filtering

Unhandled responses from 21 out-of-scope service classes (storefront, telemetry,
tutorial, research, recruitment, etc. — see `IGNORED_RPC_CLASSES` in
`src/js/protocol/rpcRouter.js`) are **hidden by default** from both the
`[FoE-Info:RPC]` console groups and the `window.foeRpcLog` buffer, so the debug
console stays focused on in-domain traffic. In-domain unhandled RPCs (the
`neverHandle` and `deferred` keys in `scripts/rpc-contract.config.json`) remain visible as
red `[UNHANDLED]` entries so they stay candidates for handling.

Bring the hidden entries back at runtime when you need to inspect them:

```js
window.foeShowIgnoredRpc(true); // show ignored classes (tagged [IGNORED], amber)
window.foeShowIgnoredRpc(false); // hide again (default)
window.foeShowIgnoredRpc(); // toggle
```

The choice persists across reloads in `chrome.storage.local` under
`showIgnoredRpc`. The runtime class list is guarded against drift from the
contract policy by `tests/protocol/rpc-scope.test.mjs`.

---

## 5. Architecture & Technical Design

```text
┌─────────────────────────────────────────────────────────────┐
│                      Inspected Game Tab                     │
│  ┌────────────────────────┐     ┌────────────────────────┐  │
│  │   xhrInterceptor.js    │     │      (MAIN World)      │  │
│  │      (MAIN World)      │     └────────────────────────┘  │
│  └───────────┬────────────┘                                  │
│              │ window.postMessage                            │
│  ┌───────────▼────────────┐                                  │
│  │    contentBridge.js    │                                  │
│  │    (ISOLATED World)    │                                  │
└──────────────┬───────────────────────────────────────────────┘
               │ browser.runtime.sendMessage
┌──────────────▼───────────────────────────────────────────────┐
│                      DevTools Panel                          │
│  ┌────────────────────────┐     ┌────────────────────────┐  │
│  │   containerBinding.js  │────▶│       logger.js         │  │
│  │  (Header Logo Toggle)  │     │  (Debug Gating Only)    │  │
│  └────────────────────────┘     └───────────┬────────────┘  │
│                                             │               │
│                  chrome.storage.local ◄─────┘               │
│                                                             │
│                    Panel Console (logs)                     │
└─────────────────────────────────────────────────────────────┘
```

### Console Debugging (`logger.js`)

- `logger.js` emits gated, tagged log lines directly to the DevTools panel console. `debug`/`info` fire only in debug mode; `warn`/`error` always render.
- **Hot-Path Discipline**: Routine lookups (e.g. per-entity cache hits in $O(1)$ maps across 500+ buildings) must never be logged individually. Log batch totals (`registerEntities`) or actionable misses (`Cache miss for entity: <id>`).
- Each module instantiates a scoped logger via `createLogger('<ModuleName>')`, producing `[FoE-Info:<ModuleName>]` entries for easy console filtering.

### Cross-Context Synchronization

- Changes to `'debugEnabled'` in storage are caught by `chrome.storage.onChanged` listeners in:
  - The DevTools panel (`utils/logger.js` applies the flag; `state/storageListener.js` routes the key).
  - The content script bridge (`protocol/contentBridge.mjs`), which posts `FOE_INFO_DEBUG_SYNC` to the MAIN page world for `xhrInterceptor.js`.
- Other `storage.onChanged` subscriptions are key-specific and are not debug toggles: `utils/worldStorage.js` watches `global:settings` and per-world keys, and `protocol/rpcRouter.js` watches `showIgnoredRpc`.

---

[Browser attachment and investigation procedures](browser-debugging.md) cover bounded passive collection in an existing session. Follow the security architecture's observation and privacy boundaries.

## Main City Context Recovery

Cached main-city returns can omit `CityMapService` responses. In the observed
client, updating the main-city HUD dispatches
`AnnouncementsService.fetchAllAnnouncements`; the validated announcements
response restores Own City context. Performance metrics are unsuitable for this
purpose because they also describe the outgoing scene and periodic sampling.

## Great Building passive bonus classification

The September 27, 2026 game metadata snapshot contains 49 Great Buildings. The
full audit of their passive bonuses and bonus value tables identifies these
limited-use or passive-reward cases; the other buildings provide continuous
boosts, population, happiness, or scheduled production rather than charge counters.
Runtime values must always come from streamed metadata and server entities.

| Great Building           | Passive bonus       | Counter treatment                                        |
| ------------------------ | ------------------- | -------------------------------------------------------- |
| Himeji Castle            | Spoils of War       | Remaining uses                                           |
| The Kraken               | First Strike        | Remaining uses                                           |
| The Virgo Project        | Missile Launch      | Remaining uses                                           |
| The Blue Galaxy          | Double Collection   | Remaining uses in its dedicated panel                    |
| Space Carrier            | Diplomatic Gifts    | Remaining uses                                           |
| Truce Tower              | Aid Goods           | Remaining uses                                           |
| Voyager V1               | Plunder Goods       | Remaining uses                                           |
| Galata Tower             | Plunder Repel       | Remaining uses                                           |
| A.I. Core                | Algorithmic Core    | Remaining uses                                           |
| St. Mark's Basilica      | Coin Boost          | Remaining collections                                    |
| Lighthouse of Alexandria | Supply Boost        | Remaining collections                                    |
| Royal Albert Hall        | Supply Boost        | Remaining collections                                    |
| Atlantis Museum          | Plunder and Pillage | Passive plunder multiplier, no manufactured charge count |
| Seed Vault               | Helping Hands       | Passive aid reward chance, no daily charge count         |
| Flying Island            | Mysterious Shards   | Shard spawn chance, not battle charges                   |
| Temple of Relics         | Relic Hunt          | GE encounter reward chance, not a daily charge counter   |

The loaded InnoGames client confirms `LimitedBonusVO.amount` is decremented on
use; `value` is summed as bonus strength and often divided by 100. Never substitute
`value` when `amount` is missing. Display an unknown count until an observed
own-city bonus or limited-bonus snapshot supplies it. Tier variants and newly
introduced types are displayed from incoming records rather than a fixed four-item
legend. Own-city records are filtered by owner to prevent visited cities from
replacing the player's bonus counts.

`RewardService.collectReward` context `spoilsOfWar` names Himeji Castle's
reward origin, even when triggered during GBG combat; `diplomaticGifts` names
Space Carrier. These must not inherit the current GE/GBG reward category.
Separate collection envelopes for Helping Hands, plunder goods, shards and relics
still require passive capture before additional source routes are asserted.

Prestige bonuses can change building effects; see the
[official Great Building changes](https://support.innogames.com/kb/ForgeOfEmpires/en_DK/5591/Prestige-Tiers-and-Changes-to-Existing-Great-Buildings).
The metadata audit is snapshot evidence, not a permanent list of game statistics.

## DevTools width

The browser owns the docked DevTools width. The extension panel fills the viewport
provided by DevTools; the extension API has no dock-width setter. CSS sizing cannot
establish a default dock width. The observed EN7 viewport was 282 CSS pixels on
2026-10-01; that measurement is a local layout observation, not a stored extension
default.
