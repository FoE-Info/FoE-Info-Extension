# FoE-Info-Extension: Service Dispatch & Network Interception Technical Reference

**Source Files**: `src/js/index.js`, `src/js/msg/`

---

## 1. Network Interception Architecture

FoE-Info-Extension captures live Forge of Empires game traffic using two complementary WebExtension APIs. All interception logic resides in [`src/js/index.js`](../../src/js/index.js).

### 1.1 Architecture Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│               FoE Game Client & Server                  │
└───────────────────────────┬────────────────────────────┘
                            │ Network Requests/Responses
                            ▼
┌────────────────────────────────────────────────────────┐
│     chrome.webRequest.onBeforeSendHeaders (index.js)   │
│     - Strips extension Origin headers for CDN requests │
│       (lines 637–645)                                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  browser.devtools.network.onRequestFinished (index.js) │
│  - Filters URLs (/game/json?h=, /start/metadata)       │
│  - Tracks GameVersion from client-identification header │
│  - Calls request.getContent() → JSON.parse(body)       │
│  - Routes by msg.requestClass / requestMethod          │
│    (lines 647–1918)                                    │
└───────────────────────────┬────────────────────────────┘
                            │
      ┌─────────────────────┴──────────────────────┐
      ▼                                            ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│ Inline Handlers (index.js)│         │ Handler Services          │
│ - Metadata fetching       │         │ (src/js/msg/*.js)         │
│ - Inventory FP pack count │         │ - StartupService          │
│ - Guild / Treasury logs   │         │ - GreatBuildingsService   │
│ - UI container clearing   │         │ - GuildBattlegroundService│
└───────────────────────────┘         │ - OtherPlayerService, etc.│
                                      └───────────────────────────┘
```

### 1.2 CDN Origin Header Masking (`onBeforeSendHeaders`)

- **File & Lines**: `src/js/index.js:637–645`
- **API**: `chrome.webRequest.onBeforeSendHeaders.addListener`
- **Target URL Pattern**: `https://*.innogamescdn.com/*`
- **Behavior**: Removes any `Origin` request header whose value starts with `moz-extension://` or `chrome-extension://`, preventing Innogames CDN servers from detecting that requests originate from a browser extension.

### 1.3 DevTools Network Listener (`onRequestFinished`)

- **File & Lines**: `src/js/index.js:647–651`
- **API**: `browser.devtools.network.onRequestFinished.addListener(handleRequestFinished)`
- **URL Filters** (regex):
  1. `/https:\/\/.*\.forgeofempires\.com\/game\/json\?h=/g` — Primary game JSON API requests.
  2. `/https:\/\/foe.*\.innogamescdn\.com\/start\/metadata\?id=(.*)/g` — Game static metadata CDN endpoints.
- Requests matching neither pattern are silently ignored.

### 1.4 Game Version Tracking

- **File & Lines**: `src/js/index.js:686–704`
- **Header**: `client-identification`
- **Behavior**: Extracts a `GameVersion` substring (characters 8–12) from the `client-identification` request header. When the extracted version differs from the cached `GameVersion`, the global is updated and the new version is appended to the `#citystats` DOM element.

### 1.5 Payload Parsing & Async Dispatch

- **File & Lines**: `src/js/index.js:706–714`
- **Mechanism**: `request.getContent().then(async ([body, mimeType]) => { ... })`
- **Payload Schema**: The body is a JSON array of message objects:
  ```json
  [
    {
      "requestClass": "StartupService",
      "requestMethod": "getData",
      "responseData": { ... }
    }
  ]
  ```
- Each element of the array is routed independently through `handleRequestFinished`.

### 1.6 StaticDataService Metadata Pipeline & Deferred Startup

- **File & Lines**: `src/js/index.js:718–786, 1059–1103`
- **Trigger**: `StaticDataService.getMetadata` message received.
- **Behavior**:
  1. Fetches all metadata JSON URLs listed in `responseData` via `fetch()`.
  2. Parses `city_entities` data and populates the global `CityEntityDefs` dictionary.
  3. Sets `metadataLoaded = true`.
  4. **Deferred Startup**: If a `StartupService.getData` message arrived _before_ metadata finished loading, it was stored in `pendingStartupMsg`. After metadata load completes, `startupService(pendingStartupMsg)` is invoked immediately.
  5. **Fallback**: On `Promise.all` fetch failure, falls back to a sequential `for (const item of msg.responseData)` retry loop, persisting `CityEntityDefs` to local storage on completion.

---

## 2. Comprehensive API Route Dispatch Table

All 54+ known routes are listed below. Routes handled directly inside `index.js` are marked **Inline**; routes delegated to a service module in `src/js/msg/` are marked with that module name.

| `requestClass`                                    | `requestMethod`                  | Handling Module                    | Handler Function                                    | Primary Action / State Mutation                                                                                                                    |
| ------------------------------------------------- | -------------------------------- | ---------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StaticDataService`                               | `getMetadata`                    | `index.js` (Inline)                | Async `fetch()` pipeline                            | Populates `CityEntityDefs`, sets `metadataLoaded = true`, triggers `pendingStartupMsg`.                                                            |
| `CampaignService`                                 | `getDeposits`                    | `index.js` (Inline)                | No-op                                               | Reserved; no operation.                                                                                                                            |
| `ConversationService`                             | `getCategory`                    | `msg/ConversationService.js`       | `conversationService(msg)`                          | Extracts conversation teasers, scans for GBG target topics, renders alert UI in `#targetsGBG`.                                                     |
| `ConversationService`                             | `getOverviewForCategory`         | `msg/ConversationService.js`       | `conversationService(msg)`                          | Same as above — processes overview teasers.                                                                                                        |
| `ConversationService`                             | `getConversation`                | `msg/ConversationService.js`       | `getConversation(msg)`                              | Parses thread title for Arc donation percentages (e.g. `190%`, `1.85`), calls `setCurrentPercent()`.                                               |
| `OtherPlayerService`                              | `getOtherPlayerCityMapEntity`    | `index.js` (Inline)                | State update                                        | Sets `PlayerID`, `PlayerName`, `GBselected` (id, name, level, max_level, connected, total FP, current FP).                                         |
| `OtherPlayerService`                              | `getSocialList`                  | `msg/OtherPlayerService.js`        | `otherPlayerServiceUpdateActions(msg.responseData)` | Updates `friends`, `guildMembers`, `hoodlist` arrays and renders collapsible list tables in `#friends`.                                            |
| `OtherPlayerService`                              | `visitPlayer`                    | `msg/OtherPlayerService.js`        | `otherPlayerService(msg)`                           | Clears visit UI, scans city map entities for GB levels/boosts/FP, renders `#visit`.                                                                |
| `OtherPlayerService`                              | `rewardPlunder`                  | `index.js` (Inline)                | State update                                        | Updates `rewardsOtherPlayer`; displays plunder reward via `showReward(reward)`.                                                                    |
| `OtherPlayerService`                              | `rewardResources`                | `index.js` (Inline)                | State update                                        | Updates `rewardsOtherPlayer`; displays resource plunder reward via `showReward(reward)`.                                                           |
| `OtherPlayerService`                              | `getCityProtections`             | `index.js` (Inline)                | State update                                        | Updates global `CityProtections` array with active player shield expiry timestamps.                                                                |
| `InventoryService`                                | `getGreatBuildings`              | `index.js` (Inline)                | No-op                                               | Reserved; no operation.                                                                                                                            |
| `InventoryService`                                | `getItems`                       | `index.js` (Inline)                | State update                                        | Saves `CityEntityDefs` to storage; sums 10/5/2 FP packs into `availablePacksFP`; updates `#availableFPID`.                                         |
| `ArmyUnitManagementService`                       | `getArmyInfo`                    | `msg/ArmyUnitManagementService.js` | `armyUnitManagementService(msg)`                    | Aggregates army unit counts and rogues per era, calculates deltas, renders `#armyDIV`.                                                             |
| `FriendsTavernService`                            | `getSittingPlayersCount`         | `index.js` (Inline)                | No-op                                               | Reserved; no operation.                                                                                                                            |
| `IgnorePlayerService`                             | `getIgnoreList`                  | `index.js` (Inline)                | State update                                        | Clears startup and battleground state; updates `ignoredPlayers.ignoredByPlayerIds` and `ignoredPlayerIds`.                                         |
| `TimeService`                                     | `updateTime`                     | `index.js` (Inline)                | State update                                        | Updates global server timestamp `EpocTime`.                                                                                                        |
| `AnnouncementsService`                            | `fetchAllAnnouncements`          | `index.js` (Inline)                | State update                                        | Clears main city UI containers; triggers `helper.fShowIncidents()`.                                                                                |
| `TimerService`                                    | `getTimers`                      | `index.js` (Inline)                | No-op                                               | Reserved; no operation.                                                                                                                            |
| `ResourceService`                                 | `getResourceDefinitions`         | `msg/ResourceService.js`           | `getResourceDefinitions(msg)`                       | Stores resource definitions in `ResourceDefs` / `ResourceNames`; saves to local storage.                                                           |
| `ResourceService`                                 | `getPlayerResources`             | `msg/ResourceService.js`           | `getPlayerResources(msg)`                           | Updates `Resources`; sets `availableFP = strategy_points`; renders `#goodsDIV` inventory table.                                                    |
| `CityMapService`                                  | `getEntities`                    | `index.js` (Inline)                | State update                                        | Checks city map entity player ownership flags.                                                                                                     |
| `CityMapService`                                  | `updateEntity`                   | `index.js` (Inline)                | State update                                        | Updates `GBselected` state if a Great Building is selected; renders `#infoText` GB Info container.                                                 |
| `StartupService`                                  | `getData`                        | `msg/StartupService.js`            | `startupService(msg)`                               | Primary city load: extracts `MyInfo`, calculates FP/coin/boost/military/goods totals, renders `#citystats`. Deferred if metadata not yet loaded.   |
| `RankingService`                                  | `searchRanking`                  | `index.js` (Inline)                | State update                                        | Updates `MyInfo.name`, `MyInfo.id`, `MyInfo.guild` if self-rank found in rankings.                                                                 |
| `HiddenRewardService`                             | `getOverview`                    | `index.js` (Inline)                | State update                                        | Updates `hiddenRewards` with incident locations; calls `helper.fShowIncidents()`.                                                                  |
| `EmissaryService`                                 | `getAssigned`                    | `msg/StartupService.js`            | `emissaryService(msg)`                              | Adds emissary daily FP and unit rewards to `City.ForgePoints` and `City.TrazUnits`.                                                                |
| `AdvancementService`                              | `getAll`                         | `index.js` (Inline)                | State update                                        | Clears cultural settlement UI; calculates remaining goods required; renders `#cultural`.                                                           |
| `BonusService`                                    | `getLimitedBonuses`              | `msg/BonusService.js`              | `getLimitedBonuses(msg)`                            | Updates building charge bonuses (Himeji `spoils`, Kraken `strike`, Space Carrier `diplomatic`, Blue Galaxy `double_collection`); renders `#bonus`. |
| `BonusService`                                    | `getBonuses`                     | `msg/BonusService.js`              | `getBonuses(msg)`                                   | Resets `City` FP/coin/Arc/Chat/Traz counters; clears GBG target UI.                                                                                |
| `BoostService`                                    | `getOverview`                    | `msg/StartupService.js`            | `boostService(msg)`                                 | Parses active player boost summary.                                                                                                                |
| `BoostService`                                    | `getAllBoosts`                   | `msg/StartupService.js`            | `boostServiceAllBoosts(msg)`                        | Calculates attack, defense, coin, FP production boosts across city, GBG, GE, and QI features.                                                      |
| `BoostService`                                    | `getTimerBoost`                  | `index.js` (Inline)                | No-op                                               | TODO: timer boost handling (reserved).                                                                                                             |
| `RewardService`                                   | `collectReward`                  | `index.js` (Inline)                | State update                                        | Extracts single reward payload; triggers `showReward(reward)`.                                                                                     |
| `RewardService`                                   | `collectRewardSet`               | `index.js` (Inline)                | State update                                        | Extracts reward array; iterates and triggers `showReward(reward)` per item.                                                                        |
| `CityProductionService`                           | `pickupProduction`               | `msg/CityProductionService.js`     | `pickupProduction(msg)`                             | Records produced military units (`rewardsArmy`) and city resources (`rewardsCity`); updates Blue Galaxy status.                                    |
| `BlueprintService`                                | `newReward`                      | `index.js` (Inline)                | State update                                        | GB level reward: adds strategy points to `availablePacksFP`; updates `#availableFPID`; displays rewards in `cityrewards`.                          |
| `GreatBuildingsService`                           | `getConstructionRanking`         | `msg/GreatBuildingsService.js`     | `getConstructionRanking(msg, postData)`             | Renders GB donor ranking table from POST body level data and response rankings.                                                                    |
| `GreatBuildingsService`                           | `getConstruction`                | `msg/GreatBuildingsService.js`     | `getConstruction(msg)`                              | Calculates 1st–5th place lock amounts and profit/loss for GB level-up; renders donation UI.                                                        |
| `GreatBuildingsService`                           | `contributeForgePoints`          | `msg/GreatBuildingsService.js`     | `contributeForgePoints(responseData)`               | Updates GB donor ranking state after the player contributes FP.                                                                                    |
| `GreatBuildingsService`                           | `getContributions`               | `index.js` (Inline)                | State update                                        | Calculates total FP invested across all GBs and Arc-boosted rewards; renders `#invested` status UI.                                                |
| `GreatBuildingsService`                           | `getOtherPlayerOverview`         | `index.js` (Inline)                | State update                                        | Updates player name and ID via `setPlayerName()`.                                                                                                  |
| `GreatBuildingsService`                           | `getAvailablePackageForgePoints` | `index.js` (Inline)                | State update                                        | Sets `availablePacksFP = responseData[0]`; updates `#availableFPID`.                                                                               |
| `ClanBattleService`                               | `getContinent`                   | `msg/ClanBattleService.js`         | `getContinent(msg)`                                 | Clears GvG UI; parses GvG continent map; calculates sector counts and siege costs per era.                                                         |
| `ClanBattleService`                               | `getProvinceDetailed`            | `msg/ClanBattleService.js`         | `getProvinceDetailed(msg)`                          | Calculates GvG sector ownership, clan power, live ranking status; renders GvG status tables.                                                       |
| `ClanBattleService`                               | `deploySiegeArmy`                | `msg/ClanBattleService.js`         | `deploySiegeArmy(msg)`                              | Logs GvG siege placement event.                                                                                                                    |
| `ClanBattleService`                               | `grantIndependence`              | `msg/ClanBattleService.js`         | `grantIndependence(msg)`                            | Logs GvG sector independence grant.                                                                                                                |
| `GuildExpeditionService`                          | `getOverview`                    | `index.js` (Inline)                | State update                                        | Clears Expedition UI via `clearExpedition()`.                                                                                                      |
| `GuildExpeditionService`                          | `getContributionList`            | `msg/GuildExpeditionService.js`    | `guildExpeditionService(msg)`                       | Renders Guild Expedition member contribution table in `donationDIV2`.                                                                              |
| `GuildExpeditionService`                          | `openChest`                      | `index.js` (Inline)                | State update                                        | Records `rewardsGE`; calls `showReward(reward)` if option enabled.                                                                                 |
| `GuildBattlegroundService`                        | `getLeaderboard`                 | `msg/GuildBattlegroundService.js`  | `getLeaderboard(msg)`                               | Renders GBG guild leaderboard table (VP/hr, Total VP).                                                                                             |
| `GuildBattlegroundService`                        | `getPlayerLeaderboard`           | `msg/GuildBattlegroundService.js`  | `getPlayerLeaderboard(msg)`                         | Stores player battles, negotiations, attrition in `BattlegroundPerformance`; saves to storage.                                                     |
| `GuildBattlegroundService`                        | `getBattleground`                | `msg/GuildBattlegroundService.js`  | `getBattleground(msg)`                              | Sets active GBG map (`volcano` / `waterfall`), tracks signals, triggers `checkProvinces()`.                                                        |
| `GuildBattlegroundService`                        | `getState`                       | `msg/GuildBattlegroundService.js`  | `getState(msg)`                                     | State check for active GBG participation.                                                                                                          |
| `GuildBattlegroundStateService`                   | `getState`                       | `msg/GuildBattlegroundService.js`  | `getState(msg)`                                     | Renders final season GBG member performance table when season ends.                                                                                |
| `GuildBattlegroundBuildingService`                | `getBuildings`                   | `msg/GuildBattlegroundService.js`  | `getBuildings(msg)`                                 | Updates sector building definitions; renders GBG building costs table in `#costs`.                                                                 |
| `GuildBattlegroundSignalsService`                 | `setSignal`                      | `msg/GuildBattlegroundService.js`  | `setSignal(msg, payload)`                           | Adds focus signal to sector; updates target generator.                                                                                             |
| `GuildBattlegroundSignalsService`                 | `removeSignal`                   | `msg/GuildBattlegroundService.js`  | `removeSignal(msg, payload)`                        | Removes signal from sector; updates target generator.                                                                                              |
| `GuildBattlegroundMapMetadata` (`__class__`)      | _(metadata)_                     | `index.js` (Inline)                | State update                                        | Populates `VolcanoProvinceDefs` or `WaterfallProvinceDefs`.                                                                                        |
| `GuildBattlegroundBuildingMetadata` (`__class__`) | _(metadata)_                     | `index.js` (Inline)                | State update                                        | Populates `BuildingDefs` metadata.                                                                                                                 |
| `ClanService`                                     | `getOwnClanData` / `getClanData` | `index.js` (Inline)                | State update                                        | Populates `GuildDonations` list; sets `MyInfo.guildPosition`; renders `friendsDiv` guild table.                                                    |
| `ClanService`                                     | `getTreasuryLogs`                | `index.js` (Inline)                | State update                                        | Accumulates member medals/goods spent & donated for GvG/GBG/GE; renders `treasuryLog` / `treasury` tables.                                         |
| `ClanService`                                     | `getTreasury`                    | `index.js` (Inline)                | State update                                        | Initializes `GuildTreasury`; renders guild treasury resource table.                                                                                |
| `AutoAidService`                                  | `collect`                        | `index.js` (Inline)                | Debug log                                           | Logs AutoAid response details in debug mode.                                                                                                       |

---

## 3. Message Service API Contracts

All 11 domain service files reside in [`src/js/msg/`](../../src/js/msg/).

---

### 3.1 `ArmyUnitManagementService.js`

**File**: `src/js/msg/ArmyUnitManagementService.js`  
**Purpose**: Manages military unit inventory counting, tracking unattached/attached units and rogues per era, calculating unit count changes (+/−), and rendering the Army UI panel.

**Exports**

| Function                    | Signature | Description                                                                        |
| --------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `armyUnitManagementService` | `(msg)`   | Main message handler — processes army info response.                               |
| `clearArmyUnits`            | `()`      | Resets internal `ArmyUnits = []` array. Called by `StartupService` on city reload. |

**Input Parameters**

- `msg.responseData.counts`: Array of `{ unitTypeId: string, attached: number, unattached: number }`.

**State Mutations**

- Mutates internal `ArmyUnits[unitTypeId]` = aggregated unit count.
- Mutates DOM element `armyDIV` (writes to `#armyText`, `#armyUnits`, `#armyUnits2`, `#armyUnits3`).

**Key Behavior**

- Reads `MilitaryDefs` (from `index.js`) to resolve unit type display names and era groupings.
- Computes attached + unattached totals per unit type.
- Calculates delta vs. previous read for count change display.

**Dependencies**: Imports `MilitaryDefs`, `armyDIV` from `../index.js`.

---

### 3.2 `BonusService.js`

**File**: `src/js/msg/BonusService.js`  
**Purpose**: Tracks Town Hall daily FP bonuses and limited building charges (Himeji Castle, Space Carrier, Kraken, Truce Tower, Blue Galaxy).

**Exports**

| Function            | Signature | Description                                                         |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `getBonuses`        | `(msg)`   | Resets `City` FP/coin/Arc/Chat/Traz counters; clears GBG target UI. |
| `getLimitedBonuses` | `(msg)`   | Parses and renders limited building charge bonuses.                 |

**Input Parameters**

- `msg.responseData`: Array of `{ type: string, amount: number, value?: number }`.
- Supported `type` values: `spoils_of_war`, `diplomatic_gifts`, `first_strike`, `aid_goods`, `double_collection`, `daily_strategypoint`, `DailyStrategyPointBonus`.

**State Mutations**

- Mutates `City.ForgePoints` (imported from `StartupService.js`).
- Mutates `Bonus.spoils`, `Bonus.diplomatic`, `Bonus.strike`, `Bonus.aid` (from `index.js`).
- Mutates `Galaxy.amount` in `StartupService.js` and calls `showGalaxy()`.
- Mutates DOM: `#bonus`, `#fp`, `#spoilsID`, `#diplomaticID`, `#firststrikeID`, `#aidID`.

**Dependencies**: Imports `City`, `Galaxy`, `showGalaxy` from `./StartupService.js`; imports `checkDebug`, `Bonus` from `../index.js`.

---

### 3.3 `CityProductionService.js`

**File**: `src/js/msg/CityProductionService.js`  
**Purpose**: Handles manual production pickup events from city buildings, tracking produced military units and resources, and updating Blue Galaxy charges.

**Exports**

| Function           | Signature | Description                                                              |
| ------------------ | --------- | ------------------------------------------------------------------------ |
| `pickupProduction` | `(msg)`   | Main pickup handler — records units, resources, and updates Blue Galaxy. |

**Input Parameters**

- `msg.responseData.militaryProducts`: Array of `{ unitTypeId: string }`.
- `msg.responseData.updatedEntities`: Array of `{ cityentity_id: string, state: { current_product, productionOption } }`.

**State Mutations**

- Increments `rewardsArmy[unitName]` count in `index.js`.
- Adds resource quantities to `rewardsCity[shortName]` in `index.js`.
- Calls `updateGalaxy(reward)` in `StartupService.js`.
- Triggers `showReward(reward)` if `showOptions.showRewards` is enabled.

**Dependencies**: Imports `showReward`, `rewardsArmy`, `rewardsCity`, `MilitaryDefs` from `../index.js`; imports `updateGalaxy` from `./StartupService.js`.

---

### 3.4 `ClanBattleService.js`

**File**: `src/js/msg/ClanBattleService.js`  
**Purpose**: Processes Guild vs Guild (GvG) continent map data, calculating sector ownership, siege costs per age, clan power, and live GvG rankings.

**Exports**

| Function              | Signature  | Description                                                         |
| --------------------- | ---------- | ------------------------------------------------------------------- |
| `getContinent`        | `(msg)`    | Parses GvG continent map; calculates sector counts and siege costs. |
| `getProvinceDetailed` | `(msg)`    | Calculates sector ownership, clan power, live ranking status.       |
| `deploySiegeArmy`     | `(msg)`    | Logs GvG siege placement.                                           |
| `grantIndependence`   | `(msg)`    | Logs GvG sector independence grant.                                 |
| `gvgContainer`        | _(export)_ | DOM container reference.                                            |
| `gvgSummary`          | _(export)_ | Summary state object.                                               |
| `gvgAges`             | _(export)_ | Era/age data.                                                       |

**Input Parameters**

- `getContinent`: `{ responseData: { continent: { provinces: Array<{ era, sectors }> } } }`.
- `getProvinceDetailed`: `{ responseData: { province_detailed: { era, power_values, clans, sectors, top_clans } } }`.

**State Mutations**

- Mutates internal `gvgPower` and `gvgPowerAll`.
- Mutates DOM `#gvg` (writes to `#gvgInfo`, `#gvgOverviewText`, `#gvgGuildPowerText`, `#gvgCurrAgeText`, `#gvgAllGuildsPowerText`).

**Dependencies**: Imports `gvg`, `MyInfo` from `../index.js`; uses `BigNumber` for precision math.

---

### 3.5 `ConversationService.js`

**File**: `src/js/msg/ConversationService.js`  
**Purpose**: Monitors guild in-game message threads to extract GBG target notifications and detect Arc donation thread percentages (e.g. `1.85`, `1.9`, `190%`, `195%`).

**Exports**

| Function              | Signature | Description                                                          |
| --------------------- | --------- | -------------------------------------------------------------------- |
| `conversationService` | `(msg)`   | Processes category/overview teasers; renders GBG target alert.       |
| `getConversation`     | `(msg)`   | Parses thread title for Arc percentage; calls `setCurrentPercent()`. |

**Input Parameters**

- Category routes: `{ responseData: { teasers: Array<{ title, lastMessage: { text, date, sender: { name } } }> } }`.
- `getConversation`: `{ responseData: { title: string } }`.

**State Mutations**

- Mutates DOM `#targetsGBG` (renders target alert box with 10-minute auto-dismiss timer).
- Calls `setCurrentPercent(percent)` in `GreatBuildingsService.js`.

**Edge Cases**

- Thread title formats detected: `"1.85"`, `"190%"`, `"1.9"`, `"2.0"` — defaults to `190%` if no match.
- GBG targets sourced from `targets` and `targetsTopic` globals in `index.js`.

**Dependencies**: Imports `targets`, `targetsTopic` from `../index.js`; imports `setCurrentPercent` from `./GreatBuildingsService.js`.

---

### 3.6 `GreatBuildingsService.js`

**File**: `src/js/msg/GreatBuildingsService.js`  
**Purpose**: Core GB donation calculator. Computes exact lock amounts for 1st–5th place on Great Buildings, calculates net profit/loss based on the player's Arc bonus (`City.ArcBonus`), builds copyable donation strings, and manages donor ranking tables.

**Exports**

| Function                   | Signature     | Description                                                            |
| -------------------------- | ------------- | ---------------------------------------------------------------------- |
| `getConstruction`          | `(msg)`       | Calculates lock amounts and profit/loss; renders donation UI.          |
| `contributeForgePoints`    | `(msg)`       | Updates GB donor ranking state after FP contribution.                  |
| `showGreatBuldingDonation` | `()`          | Central rendering pipeline for donation calculations and UI injection. |
| `getConstructionRanking`   | `(msg, data)` | Renders donor ranking table from POST body level data.                 |
| `setCurrentPercent`        | `(percent)`   | Sets active Arc donation percentage override.                          |

**Input Parameters**

- `msg.responseData.rankings`: Array of `{ rank, player: { name, player_id }, forge_points, reward: { strategy_point_amount } }`.

**State Mutations**

- Mutates module state: `rankings`, `currentPercent`, `Top`, `GBrewards`, `Reward`, `safe`, `donateSuggest`, `Donation`, `RewardFP`, `Profit`, `Percent`.
- Mutates DOM: `greatbuilding`, `donationDIV`, `donation2DIV` (writes to `#donorcollapse`, `#donationText3`, `#copyText`).

**Edge Cases**

- GB disconnected from roads: Appends `<p class="red">*** DISCONNECTED ***</p>`.
- GB at max level: Appends `<p class="red">*** LOCKED ***</p>`.
- No contributors yet: Skips FP percentage row for empty contributor slot.

**Dependencies**: Imports `City` from `./StartupService.js`; imports `setPlayerName`, `MyInfo`, `PlayerID`, `PlayerName`, `donationDIV`, `donation2DIV`, `GBselected`, `greatbuilding`, `donationPercent`, `donationSuffix`, `GameOrigin`, `url` from `../index.js`; imports `friends`, `guildMembers`, `hoodlist` from `./OtherPlayerService.js`.

---

### 3.7 `GuildBattlegroundService.js`

**File**: `src/js/msg/GuildBattlegroundService.js`  
**Purpose**: Full Guild Battleground (GBG) management — player leaderboard statistics, season-end results, sector map definitions, building placement costs, and GBG sector target generator.

**Exports**

| Function/Variable         | Signature        | Description                                                   |
| ------------------------- | ---------------- | ------------------------------------------------------------- |
| `BattlegroundPerformance` | _(object)_       | Accumulated per-player battles, negotiations, attrition data. |
| `GuildMembers`            | _(array)_        | Snapshot of guild members for comparison tables.              |
| `BGtime`                  | _(timestamp)_    | Battle ground timestamp reference.                            |
| `GBGdata`                 | _(object)_       | Shared GBG sector/map data.                                   |
| `getPlayerLeaderboard`    | `(msg)`          | Stores player performance stats; saves to extension storage.  |
| `getLeaderboard`          | `(msg)`          | Renders GBG guild leaderboard (VP/hr, Total VP).              |
| `getState`                | `(msg)`          | State check / season-end results renderer.                    |
| `getBattleground`         | `(msg)`          | Sets active map, tracks signals, triggers `checkProvinces()`. |
| `getBuildings`            | `(msg)`          | Updates building defs; renders building costs table.          |
| `setSignal`               | `(msg, payload)` | Adds focus signal; updates target generator.                  |
| `removeSignal`            | `(msg, payload)` | Removes signal; updates target generator.                     |
| `clearBattleground`       | `()`             | Resets all battleground state.                                |

**Input Parameters**

- `getPlayerLeaderboard`: Array of `{ player: { name }, battlesWon, negotiationsWon, attrition }`.
- `getBattleground`: `{ map: { id, provinces }, currentParticipantId, battlegroundParticipants }`.
- `getBuildings`: `{ provinceId, placedBuildings, availableBuildings }`.
- `setSignal` / `removeSignal`: `payload = [ provinceId: number, signalType: string ]`.

**State Mutations**

- Mutates `BattlegroundPerformance`, `GuildMembers`, `map`, `signals`, `battlegroundParticipants`, `GBGdata`.
- Saves performance to local extension storage keyed by `GameOrigin`.
- Mutates DOM `#targetsGBG` (target generator), `#costs` (GBG building costs), `donationDIV` (season results).

**Edge Cases**

- Player lacks guild permission (bitwise `& 64 == 0`): Target generator output is suppressed.
- Siege camp under construction: Displayed as `[40% UC]` vs. ready camp `(40%)`.

**Dependencies**: Imports `BuildingDefs`, `VolcanoProvinceDefs`, `WaterfallProvinceDefs`, `targets`, `donationDIV`, `GameOrigin`, `EpocTime`, `url`, `targetText` from `../index.js`.

---

### 3.8 `GuildExpeditionService.js`

**File**: `src/js/msg/GuildExpeditionService.js`  
**Purpose**: Processes Guild Expedition contribution lists and renders member encounter performance tables.

**Exports**

| Function                 | Signature | Description                                             |
| ------------------------ | --------- | ------------------------------------------------------- |
| `guildExpeditionService` | `(msg)`   | Renders GE member contribution table in `donationDIV2`. |

**Input Parameters**

- `msg.responseData`: Array of `{ player: { name }, solvedEncounters, expeditionPoints }`.

**State Mutations**

- Mutates DOM `donationDIV2` (writes to `#expeditionText`, `#expeditionTextLabel`).

**Dependencies**: Imports `donationDIV2` from `../index.js`; uses `toolOptions`, `setExpeditionSize` from `../fn/globals.js`.

---

### 3.9 `OtherPlayerService.js`

**File**: `src/js/msg/OtherPlayerService.js`  
**Purpose**: Scans other players' cities when visited. Calculates Great Building levels, military attack/defense percentages across city/GBG/GE/QI features, FP generation, guild power, and active shields. Also maintains social lists (Friends, Guild, Neighborhood).

**Exports**

| Function/Variable                 | Signature | Description                                            |
| --------------------------------- | --------- | ------------------------------------------------------ |
| `friends`                         | _(array)_ | Friend list snapshot.                                  |
| `guildMembers`                    | _(array)_ | Guild member list snapshot.                            |
| `hoodlist`                        | _(array)_ | Neighborhood list snapshot.                            |
| `otherPlayerService`              | `(msg)`   | Scans visited city; renders `#visit` panel.            |
| `otherPlayerServiceUpdateActions` | `(msg)`   | Updates social list arrays; renders `#friends` tables. |

**Input Parameters**

- `visitPlayer`: `{ other_player: { name, player_id, score, clan }, other_player_era, city_map: { entities: Array } }`.
- `getSocialList`: `{ friends, guildMembers, neighbours }` arrays.

**State Mutations**

- Mutates `friends`, `guildMembers`, `hoodlist`.
- Updates `PlayerName`, `PlayerID` via `setPlayerName()`.
- Mutates DOM `#visit` (Other Player City Stats) and `#friends` (Social List tables).

**Edge Cases**

- Visited player has active City Shield: Reads `CityProtections` array; displays `*** SHIELD ***` with remaining hours/mins.
- Same-guild visit with `sheetGuildURL` configured: Renders "Guild" button for direct Google Sheets posting.
- Social list with unaccepted friend requests: Filters `is_friend == false && accepted == false`.

**Dependencies**: Imports `CityEntityDefs`, `setPlayerName`, `CityProtections`, `PlayerName`, `checkDebug`, `url`, `MyInfo`, `GameOrigin`, `PlayerID` from `../index.js`; imports `fArcname` from `./StartupService.js`.

---

### 3.10 `ResourceService.js`

**File**: `src/js/msg/ResourceService.js`  
**Purpose**: Manages resource definitions (goods, medals, FP) and player inventory resource totals. Provides a shared `ResourceNames` lookup dictionary used by other services.

**Exports**

| Function/Variable        | Signature            | Description                                            |
| ------------------------ | -------------------- | ------------------------------------------------------ |
| `ResourceDefs`           | _(object)_           | Raw resource definition objects keyed by resource ID.  |
| `ResourceNames`          | _(object)_           | Short name mapping keyed by resource ID.               |
| `Resources`              | _(object)_           | Current player resource inventory counts.              |
| `availableFP`            | _(number)_           | Current `strategy_points` from latest resource update. |
| `getResourceDefinitions` | `(msg)`              | Stores and persists resource definitions.              |
| `saveResourceDefs`       | `(msg)`              | Saves `ResourceDefs` to extension local storage.       |
| `setResourceDefs`        | `(msg)`              | Sets resource definitions from storage load.           |
| `getPlayerResources`     | `(msg)`              | Updates inventory; renders `#goodsDIV`.                |
| `setResources`           | `(resource, needed)` | Updates a specific resource count.                     |

**Input Parameters**

- `getResourceDefinitions`: Array of `{ id, name, era, abilities: { rankingPoints: boolean } }`.
- `getPlayerResources`: `{ resources: { strategy_points: number, [good_id]: number } }`.

**State Mutations**

- Mutates `ResourceDefs`, `ResourceNames`, `Resources`, `availableFP`.
- Saves `ResourceDefs` to extension local storage.
- Updates UI `#availableFPID`; renders `#goodsDIV` inventory table.

**Dependencies**: Imports `availablePacksFP`, `goodsDIV` from `../index.js`.

---

### 3.11 `StartupService.js`

**File**: `src/js/msg/StartupService.js`  
**Purpose**: Central city initialization service. On game load, scans all city entities to compile player statistics: daily FP, coins, diamonds, Arc bonus, Chateau Frontenac bonus, military attack/defense percentages (city, GBG, GE, QI), guild treasury goods generation per age, and Alcatraz unit production. Also handles emissary bonuses and boost calculation.

**Exports**

| Function/Variable       | Signature  | Description                                                                      |
| ----------------------- | ---------- | -------------------------------------------------------------------------------- |
| `City`                  | _(object)_ | Accumulated city stat totals shared with BonusService and GreatBuildingsService. |
| `Galaxy`                | _(object)_ | Blue Galaxy charge tracking.                                                     |
| `startupService`        | `(msg)`    | Primary city load handler; renders `#citystats`.                                 |
| `emissaryService`       | `(msg)`    | Adds emissary FP and unit rewards.                                               |
| `boostService`          | `(msg)`    | Parses active boost summary.                                                     |
| `boostServiceAllBoosts` | `(msg)`    | Calculates boosts across city, GBG, GE, QI.                                      |
| `fArcname`              | `()`       | Returns Arc Great Building display name for UI labels.                           |
| `updateGalaxy`          | `(reward)` | Updates Blue Galaxy charge state from production rewards.                        |
| `showGalaxy`            | `()`       | Renders `#galaxy` Blue Galaxy optimizer panel.                                   |

**Input Parameters**

- `startupService`: `{ user_data: { user_name, player_id, clan_name, clan_id, era, clan_permissions }, city_map: { entities: Array } }`.
- `emissaryService`: Array of emissary bonus objects.
- `boostServiceAllBoosts`: Array of `{ target, type, value }` boost objects.

**State Mutations**

- Resets and populates `City` object: `ArcBonus`, `ChatBonus`, `ForgePoints`, `TrazUnits`, `Coins`, `Attack`, `Defense`, `CityAttack`, `CityDefense`, `GBGAttackingAttack`, `GEAttackingAttack`, `QIAttackingAttack`, etc.
- Sets `MyInfo` via `setMyInfo(...)`.
- Calls `clearArmyUnits()` in `ArmyUnitManagementService.js`.
- Populates `Galaxy.bonus` array for Blue Galaxy targets.
- Renders `#citystats` (Main City Stats card) and `#galaxy` panel.

**Edge Cases**

- Building producing (state = `ProducingState`) vs. ready (`ProductionFinishedState`): Blue Galaxy panel only shows ready buildings unless debug mode is active.
- `boostServiceAllBoosts` categorizes boosts into feature buckets (`battleground`, `guild_expedition`, `guild_raids`, `all`) to separate city-wide from GBG/GE/QI-specific stats.

**Dependencies**: Imports `CityEntityDefs`, `setMyInfo`, `MyInfo`, `GameOrigin`, `EpocTime`, `debugEnabled`, `checkDebug`, `removeDebug`, `ignoredPlayers`, `debug`, `availablePacksFP`, `Goods`, `language` from `../index.js`; imports `ResourceDefs`, `availableFP` from `./ResourceService.js`; imports `clearArmyUnits` from `./ArmyUnitManagementService.js`.

---

## 4. Global State Variables Reference

All state variables are declared and exported from [`src/js/index.js`](../../src/js/index.js).

| Variable                  | Type         | Purpose                                                         | Primary Mutators                                          |
| ------------------------- | ------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| `MyInfo`                  | Object       | Player identity (`name`, `id`, `guild`, `era`, `guildPosition`) | `StartupService`, `RankingService`, `ClanService`         |
| `GameOrigin`              | String       | Player origin/world identifier for storage scoping              | `StartupService`                                          |
| `EpocTime`                | Number       | Current server UNIX timestamp                                   | `TimeService.updateTime`                                  |
| `url`                     | String       | Active FoE game server base URL                                 | `StartupService`                                          |
| `CityEntityDefs`          | Object       | Map of city entity IDs → metadata definitions                   | `StaticDataService.getMetadata`                           |
| `MilitaryDefs`            | Object       | Military unit type definitions                                  | `StaticDataService.getMetadata`                           |
| `CastleDefs`              | Object       | Castle System metadata                                          | `StaticDataService.getMetadata`                           |
| `SelectionKitDefs`        | Object       | Selection Kit metadata                                          | `StaticDataService.getMetadata`                           |
| `BoostMetadataDefs`       | Object       | Boost type metadata                                             | `StaticDataService.getMetadata`                           |
| `GBselected`              | Object       | Currently selected Great Building state                         | `CityMapService.updateEntity`, `OtherPlayerService`       |
| `PlayerID`                | Number       | Currently viewed player's ID                                    | `OtherPlayerService`, `GreatBuildingsService`             |
| `PlayerName`              | String       | Currently viewed player's name                                  | `OtherPlayerService`, `GreatBuildingsService`             |
| `Resources`               | Object       | Player's current resource inventory                             | `ResourceService`                                         |
| `BattlegroundPerformance` | Object       | GBG player performance accumulator                              | `GuildBattlegroundService`                                |
| `hiddenRewards`           | Array        | Active incident/reward locations                                | `HiddenRewardService`, `helper.fShowIncidents()`          |
| `CityProtections`         | Array        | Active city shield records                                      | `OtherPlayerService.getCityProtections`                   |
| `availablePacksFP`        | Number       | Sum of FP packs (10+5+2 FP) in inventory                        | `InventoryService.getItems`, `BlueprintService.newReward` |
| `rewardsArmy`             | Object       | Produced military unit counts dict                              | `CityProductionService`, `RewardService`                  |
| `rewardsCity`             | Object       | Produced city resource counts dict                              | `CityProductionService`, `RewardService`                  |
| `ignoredPlayers`          | Object       | Ignored player IDs and lists                                    | `IgnorePlayerService`                                     |
| `metadataLoaded`          | Boolean      | Whether city entity metadata has been loaded                    | `StaticDataService.getMetadata`                           |
| `pendingStartupMsg`       | Object\|null | Deferred startup message waiting for metadata                   | `StartupService.getData` intercept                        |
| `GameVersion`             | String       | Current FoE client version string                               | `client-identification` header parse                      |
| `Bonus`                   | Object       | Limited building charge counts                                  | `BonusService`                                            |
| `BuildingDefs`            | Object       | GBG sector building metadata                                    | `GuildBattlegroundBuildingMetadata`                       |
| `VolcanoProvinceDefs`     | Object       | Volcano map province definitions                                | `GuildBattlegroundMapMetadata`                            |
| `WaterfallProvinceDefs`   | Object       | Waterfall map province definitions                              | `GuildBattlegroundMapMetadata`                            |

---

## 5. Edge Case Reference

| #   | Feature            | Condition                                                                                        | Behavior                                                                                                 |
| --- | ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | Metadata Pipeline  | `StartupService.getData` arrives before `CityEntityDefs` ready                                   | Stored in `pendingStartupMsg`; deferred until `metadataLoaded = true`.                                   |
| 2   | Metadata Pipeline  | `Promise.all` metadata fetch failure                                                             | Falls back to sequential per-item retry loop.                                                            |
| 3   | GB Calculator      | GB disconnected from roads                                                                       | Appends `*** DISCONNECTED ***` warning in red.                                                           |
| 4   | GB Calculator      | GB at maximum level                                                                              | Appends `*** LOCKED ***` warning in red.                                                                 |
| 5   | GB Calculator      | No contributors yet in ranking                                                                   | Skips FP percentage row for empty slot.                                                                  |
| 6   | Arc Percent        | Thread title contains `1.85`, `190%`, `1.9`, `2.0`                                               | Calls `setCurrentPercent(percent)`; defaults to 190% if no match.                                        |
| 7   | GBG Targets        | Player lacks guild battleground permission (`& 64 == 0`)                                         | Target Generator rendering suppressed.                                                                   |
| 8   | GBG Targets        | Siege camp under construction                                                                    | Displayed as `[40% UC]` (Under Construction) vs. `(40%)` ready.                                          |
| 9   | Other Player Visit | Visited player has active City Shield                                                            | Reads `CityProtections`; displays `*** SHIELD ***` with countdown.                                       |
| 10  | Other Player Visit | Same-guild visit with `sheetGuildURL` set                                                        | Renders "Guild" button for direct Google Sheets posting.                                                 |
| 11  | Social List        | Unaccepted pending friend requests                                                               | Filtered: `is_friend == false && accepted == false` skipped.                                             |
| 12  | Treasury Logging   | Log action is `grant freedom` or `siege army deployment`                                         | Medals/goods attributed to GvG spent vs. returned buckets.                                               |
| 13  | Blue Galaxy        | Building producing vs. ready state                                                               | Only ready buildings shown unless debug mode active.                                                     |
| 14  | Military Boosts    | Boost targeted at specific feature (`battleground`, `guild_expedition`, `guild_raids`) vs. `all` | Boosts categorized into separate `GBGAttackingAttack`, `GEAttackingAttack`, `QIAttackingAttack` buckets. |

---

## 6. Verification

To verify the dispatch table and service contracts against source code:

```bash
# Inspect the central dispatch handler
grep -n "requestClass\|requestMethod" src/js/index.js | head -80

# List all service files
ls -la src/js/msg/

# Run the production Webpack build (should exit 0)
mise run build
```

Expected build output: `build/FoE-Info_WEBSTORE_*.zip` created with exit code 0.
