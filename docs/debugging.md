# FoE-Info Debugging & Diagnostic Infrastructure

This document describes the debug mode of the FoE-Info extension, the header icon toggle mechanism, console log filtering tags, and workflows for user support and automated AI diagnostics.

---

## 1. Operating Modes Overview

FoE-Info operates with two distinct runtime modes:

1. **Standard Mode (Default)**:
   - **Performance**: Routine logger debug/info diagnostics are disabled. Some legacy direct console calls remain.
   - **Visibility**: Logger warnings and errors remain visible in the DevTools panel console.
   - **Behavior**: Calculations and RPC handling execute silently in the background.

2. **Debugging Mode (Toggled via Header Icon)**:
   - **Performance**: High-resolution instrumentation across all extension layers.
   - **Visibility**: Genuinely verbose diagnostics covering value computations, cache operations, async fetch resolutions, UI re-renders, and network RPC packets, emitted to the DevTools panel console.
   - **Persistence**: Saved to `chrome.storage.local` under key `'debugEnabled'` and synchronized across all extension contexts.

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
  - The state sticks until toggled again. Refreshing the game tab (F5) or closing/re-docking DevTools retains the active mode.

---

## 3. Filterable Console Tags Cheat-Sheet

To isolate logs from specific subsystems, type any of these tags into the DevTools panel console filter box:

| Tag Filter                                        | Monitored Subsystem         | Diagnostic Information Emitted                                                                                 |
| :------------------------------------------------ | :-------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `[FoE-Info]`                                      | **All Logs**                | Captures all logs across the extension.                                                                        |
| `[FoE-Info:RPC]`                                  | **Network JSON-RPC**        | Handled & unhandled RPCs (`[HANDLED]`, `[UNHANDLED]`), class/method, request IDs, decoded response payloads.   |
| `[FoE-Info:Dispatcher]`                           | **RPC Routing**             | Packet routing to registered services, class fallbacks, and unhandled detections.                              |
| `[FoE-Info:CityStatsCalc]`                        | **City Value Computations** | Entity counts, player era, raw boost tallies, FP/coin/supply totals, and daily goods calculations.             |
| `[FoE-Info:GBCalc]`                               | **Great Buildings Math**    | Spot lock calculations, owner safe add requirements, and 1.9x Arc reward half-up rounding.                     |
| `[FoE-Info:InvestedCalc]`                         | **Investments & Sniping**   | Contribution counts, Arc multipliers, locked safe spots, hidden GB filtering, and net profit/loss math.        |
| `[FoE-Info:GBG]`                                  | **Guild Battlegrounds**     | Province building attrition reductions, camp counts ready/in-construction, and final attrition chances.        |
| `[FoE-Info:BlueGalaxy]`                           | **Blue Galaxy Helper**      | Candidate building extractions, charges remaining, and production readiness ranking.                           |
| `[FoE-Info:Boost]`                                | **Military Boost Matrix**   | Red attacking & Blue defending boost aggregations across Base, GBG, GE, and QI.                                |
| `[FoE-Info:MetadataStore]`                        | **Game Entity Cache**       | Batch entity ingestion counts, cache misses (missing metadata), and store resets (routine cache hits omitted). |
| `[FoE-Info:MetadataResolver]`                     | **Metadata Downloads**      | Missing entity downloads, completion, and retry failures.                                                      |
| `[FoE-Info:StartupService]` with `TIMING:P5g/P6g` | **Startup Rendering**       | The orchestrator uses its caller's logger for metadata completion, fallback timing, and recomputation.         |
| `[FoE-Info:CityStatsRender]`                      | **City Statistics UI**      | Runtime rendering of city statistics.                                                                          |
| `[FoE-Info:PanelDispatcher]`                      | **UI Re-renders & Races**   | Monotonically increasing render cycle sequences (`seq`) and timestamps for detecting race conditions.          |

| `[FoE-Info:DevTools]` | **DevTools Network Bridge** | Request interception, streaming buffer queue, and panel forwarding. |
| `[FoE-Info:ContentBridge]` | **Isolated Content Bridge** | Forwarding XHR/fetch events from page DOM to extension background/panel. |
| `[FoE-Info:XHRInterceptor]` | **Page XHR/Fetch Monkeypatch** | Intercepted URLs and payload byte lengths directly from the page context. |

---

## 4. Architecture & Technical Design

```text
┌─────────────────────────────────────────────────────────────┐
│                      Inspected Game Tab                     │
│  ┌────────────────────────┐     ┌────────────────────────┐  │
│  │   xhr-interceptor.js   │     │      (MAIN World)      │  │
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
  - The DevTools panel (`logger.js`, `containerBinding.js`, `state.js`, `index.js`).
  - The content script bridge (`content-bridge.js`), which posts `FOE_INFO_DEBUG_SYNC` to the MAIN page world for `xhr-interceptor.js`.
  - The DevTools background bridge (`devtools.js`).

---

## 5. AI Pair-Debugging Workflow

When diagnosing bug reports with an AI assistant:

1. **Ask User to Enable Debug Mode**:
   Instruct the user to click the **FoE-Info logo** top-left in the panel until the **bug icon** appears.
2. **Reload Game Page**:
   Have the user refresh the game page (`F5`).
3. **Inspect DevTools Console**:
   Because logs are emitted to the DevTools panel console, CDP tools and the AI assistant attached via Chrome DevTools MCP can read all extension activity in real-time.
4. **Targeted Filtering**:
   Ask the user or the AI assistant to filter for specific tags (e.g. `[FoE-Info:RPC]` to check received game packets, or `[FoE-Info:CityStatsCalc]` to verify military boost and daily production math).
