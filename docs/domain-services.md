# FoE-Info-Extension: Network Message Services Reference

> **Navigation**: [← Documentation Index](INDEX.md) | [System Architecture](system-architecture.md) | [Helper Utilities Catalog](helper-utilities.md) | [Service Dispatch Specs](knowledgebase/service-dispatch.md)

This document provides a comprehensive technical reference for the network interception layer and all 11 domain service modules in FoE-Info-Extension (`src/js/msg/`). It details the WebExtension network interception model, the global route dispatch map in [`src/js/index.js`](../src/js/index.js), intercepted API payloads, parsed data structures, exported interfaces, state mutations, DOM rendering targets, and edge case handling across the extension.

---

## 1. Network Interception & Service Dispatch Architecture

### 1.1 Chrome DevTools Interception Model

FoE-Info-Extension operates as a specialized Chrome DevTools panel extension. Rather than injecting content scripts into the main page context or hooking XMLHttpRequest/fetch prototypes directly, it intercepts live game API traffic using the WebExtension DevTools Network API:

```javascript
browser.devtools.network.onRequestFinished.addListener(handleRequestFinished);
```

All request processing is implemented in [`src/js/index.js`](../src/js/index.js).

### 1.2 URL Filtering & Game Payload Parsing

The network listener filters incoming HTTP/HTTPS requests against two regular expressions:

1. Primary Game API JSON: `/https:\/\/.*\.forgeofempires\.com\/game\/json\?h=/g`
2. CDN Static Metadata: `/https:\/\/foe.*\.innogamescdn\.com\/start\/metadata\?id=(.*)/g`

Requests matching neither pattern are immediately ignored. When a matching request finishes:

1. `request.getContent()` reads the raw response body asynchronously.
2. The payload is parsed as a JSON array of message objects. Each object conforms to the standard Forge of Empires API structure:
   ```json
   [
     {
       "requestClass": "StartupService",
       "requestMethod": "getData",
       "responseData": { ... }
     }
   ]
   ```
3. Each message object is evaluated sequentially in `handleRequestFinished` through a comprehensive routing tree matching `msg.requestClass` and `msg.requestMethod`.

### 1.3 CDN Origin Header Masking (`onBeforeSendHeaders`)

To prevent game servers or content delivery networks (CDNs) from identifying and blocking browser extension traffic, [`src/js/index.js`](../src/js/index.js) registers a header modification listener:

- **API**: `chrome.webRequest.onBeforeSendHeaders.addListener`
- **Target URL Pattern**: `https://*.innogamescdn.com/*`
- **Behavior**: Strips any `Origin` request header starting with `chrome-extension://` or `moz-extension://`.

### 1.4 Client Version Extraction & Deferred Metadata Pipeline

- **Game Version Tracking**: The listener inspects the `client-identification` HTTP request header, extracting characters 8–12 as `GameVersion`. When a new version string is detected, global state is updated and the version is rendered in `#citystats`.
- **Deferred Startup Pipeline**: Static entity metadata (`StaticDataService.getMetadata`) is required to resolve building entity IDs, unit types, and boost definitions. If a player's `StartupService.getData` payload arrives before static metadata has finished downloading:
  1. `StartupService.getData` is stashed in the global `pendingStartupMsg` variable.
  2. Static metadata fetches complete, populating `CityEntityDefs` and setting `metadataLoaded = true`.
  3. `pendingStartupMsg` is automatically dispatched to `startupService(pendingStartupMsg)`.
- **Metadata Fallback**: If parallel fetching (`Promise.all`) fails, the extension executes a sequential retry loop for each metadata endpoint, saving resolved definitions to local WebExtension storage (`browser.storage.local`).

---

## 2. Global Network Route Dispatch Table

Below is the complete mapping of all 65+ `requestClass` × `requestMethod` network routes handled in [`src/js/index.js`](../src/js/index.js) to their respective handler functions, modules, and primary actions.

| #   | `requestClass`                      | `requestMethod`                  | Handling Module / Location                                                              | Handler Function                                    | Primary Action & State Mutations                                                                                                                   |
| --- | ----------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `StaticDataService`                 | `getMetadata`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline Async Pipeline                               | Downloads static metadata JSON files, populates `CityEntityDefs`, sets `metadataLoaded = true`, triggers `pendingStartupMsg`.                      |
| 2   | `CampaignService`                   | `getDeposits`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved route; no operation executed.                                                                                                             |
| 3   | `ConversationService`               | `getCategory`                    | [`src/js/msg/ConversationService.js`](../src/js/msg/ConversationService.js)             | `conversationService(msg)`                          | Scans message teasers for GBG target topics, renders alert box in `#targetsGBG`.                                                                   |
| 4   | `ConversationService`               | `getOverviewForCategory`         | [`src/js/msg/ConversationService.js`](../src/js/msg/ConversationService.js)             | `conversationService(msg)`                          | Processes overview teasers for GBG targets, renders alert box in `#targetsGBG`.                                                                    |
| 5   | `ConversationService`               | `getConversation`                | [`src/js/msg/ConversationService.js`](../src/js/msg/ConversationService.js)             | `getConversation(msg)`                              | Parses thread title for Arc donation percentages (e.g. `190%`, `1.85`), invokes `setCurrentPercent()`.                                             |
| 6   | `OtherPlayerService`                | `getOtherPlayerCityMapEntity`    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Updates `PlayerID`, `PlayerName`, and `GBselected` state (id, name, level, max level, connected, total FP, current FP).                            |
| 7   | `OtherPlayerService`                | `getSocialList`                  | [`src/js/msg/OtherPlayerService.js`](../src/js/msg/OtherPlayerService.js)               | `otherPlayerServiceUpdateActions(msg.responseData)` | Updates `friends`, `guildMembers`, `hoodlist` arrays; renders collapsible list tables in `#friends`.                                               |
| 8   | `OtherPlayerService`                | `visitPlayer`                    | [`src/js/msg/OtherPlayerService.js`](../src/js/msg/OtherPlayerService.js)               | `otherPlayerService(msg)`                           | Clears visit panel, scans visited city map entities for GB levels, boosts, FP, renders `#visit`.                                                   |
| 9   | `OtherPlayerService`                | `rewardPlunder`                  | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Accumulates plunder rewards in `rewardsOtherPlayer`; displays plunder reward modal via `showReward(reward)`.                                       |
| 10  | `OtherPlayerService`                | `rewardResources`                | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Accumulates resource plunder in `rewardsOtherPlayer`; displays resource plunder reward modal via `showReward(reward)`.                             |
| 11  | `OtherPlayerService`                | `getCityProtections`             | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Populates `CityProtections` array with active player shield expiry timestamps.                                                                     |
| 12  | `InventoryService`                  | `getGreatBuildings`              | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved route; no operation executed.                                                                                                             |
| 13  | `InventoryService`                  | `getItems`                       | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Persists `CityEntityDefs` to storage; sums 10/5/2 FP inventory packs into `availablePacksFP`; updates `#availableFPID`.                            |
| 14  | `ArmyUnitManagementService`         | `getArmyInfo`                    | [`src/js/msg/ArmyUnitManagementService.js`](../src/js/msg/ArmyUnitManagementService.js) | `armyUnitManagementService(msg)`                    | Aggregates army unit counts and rogues per era, computes deltas (+/-), renders `#armyDIV`.                                                         |
| 15  | `FriendsTavernService`              | `getSittingPlayersCount`         | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved route; commented out player ID extraction.                                                                                                |
| 16  | `IgnorePlayerService`               | `getIgnoreList`                  | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Clears city stats and battleground containers; updates `ignoredPlayers.ignoredByPlayerIds` and `ignoredPlayerIds`.                                 |
| 17  | `TimeService`                       | `updateTime`                     | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Updates global server timestamp `EpocTime`.                                                                                                        |
| 18  | `AnnouncementsService`              | `fetchAllAnnouncements`          | [`src/js/index.js`](../src/js/index.js)                                                 | Inline UI Refresh                                   | Clears main city containers via `clearForMainCity()`; triggers `helper.fShowIncidents()`.                                                          |
| 19  | `TimerService`                      | `getTimers`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved route for timers.                                                                                                                         |
| 20  | `ResourceService`                   | `getResourceDefinitions`         | [`src/js/msg/ResourceService.js`](../src/js/msg/ResourceService.js)                     | `getResourceDefinitions(msg)`                       | Stores resource definitions in `ResourceDefs` / `ResourceNames`; saves `ResourceDefs` to extension storage.                                        |
| 21  | `ResourceService`                   | `getPlayerResources`             | [`src/js/msg/ResourceService.js`](../src/js/msg/ResourceService.js)                     | `getPlayerResources(msg)`                           | Updates `Resources` object; sets `availableFP = strategy_points`; updates `#availableFPID`; renders `#goodsDIV`.                                   |
| 22  | `CityMapService`                    | `getEntities`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Iterates city map entities checking player ownership (`player_id == MyInfo.id`).                                                                   |
| 23  | `CityMapService`                    | `updateEntity`                   | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Checks for Great Building selection, updates `PlayerName`, `GBselected` state, renders `#infoText` container.                                      |
| 24  | `StartupService`                    | `getData`                        | [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)                       | `startupService(msg)`                               | Main city load: updates `MyInfo`, calculates FP/coin/boost totals, renders `#citystats`. Deferred if metadata pending.                             |
| 25  | `RankingService`                    | `searchRanking`                  | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Checks for self rank (`is_self`); updates `MyInfo.name`, `MyInfo.id`, `MyInfo.guild` if matched.                                                   |
| 26  | `HiddenRewardService`               | `getOverview`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Updates `hiddenRewards` with incident coordinates; calls `helper.fShowIncidents()`.                                                                |
| 27  | `EmissaryService`                   | `getAssigned`                    | [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)                       | `emissaryService(msg)`                              | Adds emissary daily FP and unit rewards to `City.ForgePoints` and `City.TrazUnits`.                                                                |
| 28  | `AdvancementService`                | `getAll`                         | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Clears cultural settlement UI; calculates total remaining settlement goods needed; renders `#cultural`.                                            |
| 29  | `BonusService`                      | `getLimitedBonuses`              | [`src/js/msg/BonusService.js`](../src/js/msg/BonusService.js)                           | `getLimitedBonuses(msg)`                            | Updates building charge bonuses (Himeji `spoils`, Kraken `strike`, Space Carrier `diplomatic`, Blue Galaxy `double_collection`); renders `#bonus`. |
| 30  | `BonusService`                      | `getBonuses`                     | [`src/js/msg/BonusService.js`](../src/js/msg/BonusService.js)                           | `getBonuses(msg)`                                   | Resets `City` FP/coin/Arc/Chat/Traz counters; clears GBG target UI (`#targetsGBG`).                                                                |
| 31  | `BoostService`                      | `getOverview`                    | [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)                       | `boostService(msg)`                                 | Parses active player boost summary.                                                                                                                |
| 32  | `BoostService`                      | `getAllBoosts`                   | [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)                       | `boostServiceAllBoosts(msg)`                        | Calculates attack, defense, coin, FP production boosts across city, GBG, GE, and QI features.                                                      |
| 33  | `BoostService`                      | `getTimerBoost`                  | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | TODO comment for timer boost handling.                                                                                                             |
| 34  | `RewardService`                     | `collectReward`                  | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Extracts single reward payload; triggers `showReward(reward)` if `showGBGrewards` enabled.                                                         |
| 35  | `RewardService`                     | `collectRewardSet`               | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Extracts reward array; iterates and triggers `showReward(reward)` per item if `showRewards` enabled.                                               |
| 36  | `RewardService`                     | `""` (Empty)                     | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved empty method check.                                                                                                                       |
| 37  | `CityProductionService`             | `pickupProduction`               | [`src/js/msg/CityProductionService.js`](../src/js/msg/CityProductionService.js)         | `pickupProduction(msg)`                             | Records produced military units (`rewardsArmy`) and city resources (`rewardsCity`); updates Blue Galaxy status.                                    |
| 38  | `BlueprintService`                  | `newReward`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | GB level reward: adds strategy points to `availablePacksFP`; updates `#availableFPID`; renders rewards in `#cityrewards`.                          |
| 39  | `GreatBuildingsService`             | `getConstructionRanking`         | [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js)         | `getConstructionRanking(msg, postData)`             | Renders GB donor ranking table from POST body level data and response rankings.                                                                    |
| 40  | `GreatBuildingsService`             | `getConstruction`                | [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js)         | `getConstruction(msg)`                              | Calculates 1st–5th place lock amounts and profit/loss for GB level-up; renders donation UI.                                                        |
| 41  | `GreatBuildingsService`             | `contributeForgePoints`          | [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js)         | `contributeForgePoints(responseData)`               | Updates GB donor ranking state after player FP contribution.                                                                                       |
| 42  | `GreatBuildingsService`             | `getContributions`               | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Calculates total FP invested across all GBs and Arc-boosted rewards; renders `#cityinvested` status UI.                                            |
| 43  | `GreatBuildingsService`             | `getOtherPlayerOverview`         | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Updates player name and ID via `setPlayerName(player.name, player.player_id)`.                                                                     |
| 44  | `GreatBuildingsService`             | `getAvailablePackageForgePoints` | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Sets `availablePacksFP = responseData[0]`; updates `#availableFPID`.                                                                               |
| 45  | `ClanBattleService`                 | `getContinent`                   | [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)                 | `getContinent(msg)`                                 | Clears GvG UI via `fCleardForGVG()`; parses GvG continent map; calculates sector counts and siege costs.                                           |
| 46  | `ClanBattleService`                 | `getProvinceDetailed`            | [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)                 | `getProvinceDetailed(msg)`                          | Calculates GvG sector ownership, clan power, live ranking status; renders GvG status tables.                                                       |
| 47  | `ClanBattleService`                 | `deploySiegeArmy`                | [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)                 | `deploySiegeArmy(msg)`                              | Logs GvG siege placement event.                                                                                                                    |
| 48  | `ClanBattleService`                 | `grantIndependence`              | [`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)                 | `grantIndependence(msg)`                            | Logs GvG sector independence grant.                                                                                                                |
| 49  | `GuildExpeditionService`            | `getOverview`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Clears Expedition UI via `clearExpedition()`.                                                                                                      |
| 50  | `GuildExpeditionService`            | `getContributionList`            | [`src/js/msg/GuildExpeditionService.js`](../src/js/msg/GuildExpeditionService.js)       | `guildExpeditionService(msg)`                       | Renders Guild Expedition member contribution table in `donationDIV2` if `showExpedition` enabled.                                                  |
| 51  | `GuildExpeditionService`            | `openChest`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Records `rewardsGE[name]` accumulators; calls `showReward(reward)` if `showGErewards` enabled.                                                     |
| 52  | `GuildBattlegroundService`          | `getLeaderboard`                 | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getLeaderboard(msg)`                               | Renders GBG guild leaderboard table (VP/hr, Total VP) if `showLeaderboard` enabled.                                                                |
| 53  | `GuildBattlegroundService`          | `getPlayerLeaderboard`           | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getPlayerLeaderboard(msg)`                         | Stores player battles, negotiations, attrition in `BattlegroundPerformance`; saves to storage.                                                     |
| 54  | `GuildBattlegroundService`          | `getBattleground`                | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getBattleground(msg)`                              | Clears battleground containers; sets active map, tracks signals, triggers `checkProvinces()`.                                                      |
| 55  | `GuildBattlegroundService`          | `getState`                       | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getState(msg)`                                     | State check for active GBG participation (`stateId == 'participating'`).                                                                           |
| 56  | `GuildBattlegroundStateService`     | `getState`                       | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getState(msg)`                                     | Renders final season GBG member performance table when season ends if `showBattleground` enabled.                                                  |
| 57  | `GuildBattlegroundBuildingService`  | `getBuildings`                   | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `getBuildings(msg)`                                 | Updates sector building definitions; renders GBG building costs table in `#costs`.                                                                 |
| 58  | `GuildBattlegroundSignalsService`   | `setSignal`                      | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `setSignal(msg, payload)`                           | Extracts requestData payload; adds focus signal to sector; updates target generator.                                                               |
| 59  | `GuildBattlegroundSignalsService`   | `removeSignal`                   | [`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)   | `removeSignal(msg, payload)`                        | Extracts requestData payload; removes signal from sector; updates target generator.                                                                |
| 60  | `GuildBattlegroundMapMetadata`      | `__class__`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Populates `VolcanoProvinceDefs` or `WaterfallProvinceDefs` based on map ID (`volcano_archipelago`/`waterfall_archipelago`).                        |
| 61  | `GuildBattlegroundLeagueMetadata`   | `__class__`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Inline Debug Log                                    | Debug logging for league metadata.                                                                                                                 |
| 62  | `GuildBattlegroundBuildingMetadata` | `__class__`                      | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State Update                                 | Populates `BuildingDefs[msg.id]` with name, buildingTime, description.                                                                             |
| 63  | `ClanService`                       | `getOwnClanData`                 | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Populates `GuildDonations` list; sets `MyInfo.guildPosition`; renders `friendsDiv` guild table.                                                    |
| 64  | `ClanService`                       | `getClanData`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Renders guild member list in `friendsDiv` if `showGuild` enabled.                                                                                  |
| 65  | `ClanService`                       | `getTreasuryLogs`                | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Accumulates member medals/goods spent & donated for GvG/GBG/GE; renders `treasuryLog` / `treasury` tables.                                         |
| 66  | `ClanService`                       | `getTreasury`                    | [`src/js/index.js`](../src/js/index.js)                                                 | Inline State & UI                                   | Clears UI containers; initializes `GuildTreasury`; renders guild treasury resource table.                                                          |
| 67  | `AutoAidService`                    | `collect`                        | [`src/js/index.js`](../src/js/index.js)                                                 | Inline Debug Log                                    | Logs AutoAid response details in debug mode.                                                                                                       |
| 68  | `AutoAidService`                    | `""` (Empty)                     | [`src/js/index.js`](../src/js/index.js)                                                 | Reserved / No-op                                    | Reserved empty method check.                                                                                                                       |
| 69  | `(null requestClass)`               | `(metadata)`                     | [`src/js/index.js`](../src/js/index.js)                                                 | Inline Data Fallback                                | Calls `processMetadataEntry(msg)` for raw metadata objects.                                                                                        |

---

## 3. Detailed Technical Specifications: All 11 Domain Services

---

### 3.1 `StartupService` (`src/js/msg/StartupService.js`)

#### 3.1.1 Purpose & Extension Role

`StartupService` is the primary city initialization parser for FoE-Info-Extension ([`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)). When the player loads into a game world or reloads the city map, `StartupService.getData` provides a snapshot of the player's profile and city entity map. The service scans all city buildings to aggregate daily Forge Point (FP) production, coin yields, military attack and defense bonuses across features (City, GBG, GE, Quantum Incursions), guild treasury goods generation per age, Alcatraz unit production, and emissary bonuses. It also provides the Blue Galaxy collection charge optimizer.

#### 3.1.2 Intercepted Game API Payloads

##### Primary Intercept: `StartupService.getData`

- **`requestClass`**: `StartupService` | **`requestMethod`**: `getData`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "StartupService",
    "requestMethod": "getData",
    "responseData": {
      "user_data": {
        "user_name": "PlayerOne",
        "player_id": 123456,
        "clan_name": "TopGuild",
        "clan_id": 987,
        "createdAt": 1600000000,
        "era": "SpaceAgeTitan",
        "clan_permissions": 64
      },
      "city_map": {
        "entities": [
          {
            "id": 101,
            "cityentity_id": "R_MultiAge_SummerBonus20a",
            "type": "residential",
            "level": 10,
            "state": {
              "__class__": "ProducingState",
              "next_state_transition_at": 1723000000,
              "current_product": {
                "product": {
                  "resources": { "strategy_points": 10, "money": 50000 }
                },
                "guildProduct": {
                  "resources": { "clan_power": 100, "sat": 50 }
                }
              }
            },
            "bonus": { "type": "contribution_boost", "value": 90 }
          }
        ]
      }
    }
  }
  ```

##### Secondary Intercept: `EmissaryService.getAssigned`

- **`requestClass`**: `EmissaryService` | **`requestMethod`**: `getAssigned`
- **Handler**: `emissaryService(msg)` in [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)
- Adds emissary daily FP and unit rewards into `City.ForgePoints` and `City.TrazUnits`.

##### Secondary Intercept: `BoostService.getAllBoosts` / `getOverview`

- **`requestClass`**: `BoostService` | **`requestMethod`**: `getAllBoosts` / `getOverview`
- **Handler**: `boostServiceAllBoosts(msg)` / `boostService(msg)` in [`src/js/msg/StartupService.js`](../src/js/msg/StartupService.js)
- Aggregates red (attacker) and blue (defender) attack/defense percentages across `all`, `battleground`, `guild_expedition`, and `guild_raids` features.

#### 3.1.3 Parsed Data Structures & Exported Objects

- **`export var City`**: Shared object tracking player city statistics:

  ```javascript
  export var City = {
    ArcBonus: 90, // Arc contribution boost percentage (e.g. 90 = 1.9x multiplier)
    ChatBonus: 0, // Chateau Frontenac quest boost percentage
    ForgePoints: 0, // Daily FP harvested from city buildings
    TrazUnits: 0, // Daily unattached units from Alcatraz & buildings
    Coins: 0, // Base daily coin yield
    CoinBoost: 0, // Coin production boost %
    SupplyBoost: 0, // Supply production boost %
    Attack: 0, // Red attack % (City / Base)
    Defense: 0, // Red defense % (City / Base)
    CityAttack: 0, // Blue attack % (Defending army)
    CityDefense: 0, // Blue defense % (Defending army)
    GEAttackingAttack: 0, // GE red attack bonus
    GEAttackingDefense: 0, // GE red defense bonus
    GBGAttackingAttack: 0, // GBG red attack bonus
    GBGAttackingDefense: 0, // GBG red defense bonus
    QIAttackingAttack: 0, // QI red attack bonus
    QIAttackingDefense: 0, // QI red defense bonus
  };
  ```

- **`export var Galaxy`**: Blue Galaxy optimizer state object:

  ```javascript
  export var Galaxy = {
    html: '', // Generated HTML panel for Blue Galaxy charge optimizer
    bonus: [], // Sorted array of highest FP-producing buildings ready for collection
    amount: 0, // Remaining double collection charges
  };
  ```

- **Exported Functions**:
  - `startupService(msg)`: Primary entrypoint for city map calculation.
  - `emissaryService(msg)`: Processes cultural settlement emissary rewards.
  - `boostService(msg)` / `boostServiceAllBoosts(msg)`: Categorizes active boost objects.
  - `updateGalaxy(reward)`: Updates building transition states after collection.
  - `showGalaxy()`: Renders `#galaxy` DOM element.
  - `fArcname()`: Returns localized Arc building name.

#### 3.1.4 State Mutations & DOM Rendering Targets

- **Global State Mutations**:
  - Mutates `MyInfo` (`name`, `id`, `guild`, `era`) via `setMyInfo(...)`.
  - Mutates `Goods` era tallies (`Goods.sat`, `Goods.sav`, etc.).
  - Resets army units by calling `clearArmyUnits()` in [`src/js/msg/ArmyUnitManagementService.js`](../src/js/msg/ArmyUnitManagementService.js).
- **DOM Rendering Targets**:
  - `#citystats`: Main City Stats card (FP yield, Arc/Chateau %, attack/defense breakdowns for City, GBG, GE, QI, and inventory FP bar).
  - `#galaxy`: Blue Galaxy charge optimizer panel.
  - `#buildings`: Upcoming collection schedule table sorted by `next_state_transition_at`.

---

### 3.2 `GreatBuildingsService` (`src/js/msg/GreatBuildingsService.js`)

#### 3.2.1 Purpose & Extension Role

`GreatBuildingsService` ([`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js)) is the Great Building investment calculator. When a player views their own or another player's Great Building, this module:

1. Calculates exact FP required to secure ("lock") 1st through 5th place contributor positions.
2. Computes net profit/loss (`Profit`) and ROI percentage (`Percent`) based on the player's active Arc bonus (`City.ArcBonus`).
3. Supports Arc donation percentage overrides (e.g. 1.85, 1.90, 1.95, 2.00).
4. Generates formatted, copyable donation strings for guild thread posting.
5. Injects interactive donor ranking tables with snipe-safety indicators.

#### 3.2.2 Intercepted Game API Payloads

##### Primary Intercept: `GreatBuildingsService.getConstruction`

- **`requestClass`**: `GreatBuildingsService` | **`requestMethod`**: `getConstruction`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "GreatBuildingsService",
    "requestMethod": "getConstruction",
    "responseData": {
      "rankings": [
        {
          "rank": 1,
          "player": { "player_id": 98765, "name": "DonorOne" },
          "forge_points": 600,
          "reward": { "strategy_point_amount": 1000 }
        },
        {
          "rank": 2,
          "player": { "name": "No contributor yet" },
          "forge_points": 0,
          "reward": { "strategy_point_amount": 500 }
        }
      ]
    }
  }
  ```

##### Secondary Intercepts

- `GreatBuildingsService.getConstructionRanking`: Handles donor inspection when selecting specific levels.
- `GreatBuildingsService.contributeForgePoints`: Refreshes calculations immediately after the player invests FP.

#### 3.2.3 Parsed Data Structures & Exported Objects

- **Internal Calculation State**:

  - `currentPercent`: Active Arc donation rate percentage multiplier (default `190` or thread override).
  - `Top`: Array of 6 numbers representing FP invested by current 1st–6th place donors.
  - `GBrewards`: Base FP reward values for 1st–5th place.
  - `Reward`: Arc-boosted FP rewards (`GBrewards[i] * (1 + City.ArcBonus / 100)`).
  - `Donation`: Minimum FP needed to secure current place: `Math.ceil((total - current + Top[place - 1]) / 2)`.
  - `Profit`: Net FP yield (`Reward - Donation`).
  - `Percent`: Return on investment ratio using `BigNumber` precision math.

- **Exported Functions**:
  - `getConstruction(msg)`: Main GB level handler.
  - `contributeForgePoints(msg)`: Post-contribution state updater.
  - `getConstructionRanking(msg, data)`: Injects GB donor list from ranking inspect.
  - `showGreatBuldingDonation()`: Central UI rendering pipeline.
  - `setCurrentPercent(percent)`: Sets active Arc donation percentage override (called by `ConversationService.js`).

#### 3.2.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `PlayerName` and `PlayerID` via `setPlayerName(...)`.
  - Mutates `useNewDonationPanel` in storage on shift-click toggle.
  - Reads `GBselected` state set by `OtherPlayerService` or `CityMapService`.
- **DOM Rendering Targets**:
  - `#greatbuilding`: Donor ranking list container (`#donorcollapse`, `#donorText`).
  - `#donation` / `#donation2`: Main GB Donation panel (`#copyText`, `#donationText3`, `#GBselected`).
  - Appends status flags:
    - `<p class="red">*** DISCONNECTED ***</p>` if GB lacks road connection.
    - `<p class="red">*** LOCKED ***</p>` if GB is at max level.
    - `<span class="red">*** INACTIVE ***</span>` if owner is inactive.

---

### 3.3 `GuildBattlegroundService` (`src/js/msg/GuildBattlegroundService.js`)

#### 3.3.1 Purpose & Extension Role

`GuildBattlegroundService` ([`src/js/msg/GuildBattlegroundService.js`](../src/js/msg/GuildBattlegroundService.js)) manages all Guild Battleground (GBG) operations in the extension:

1. Tracks individual player performance (battles won, negotiations won, attrition) and persists history to WebExtension local storage.
2. Intercepts map data for `volcano_archipelago` and `waterfall_archipelago` maps.
3. Generates the GBG Target List (`#targetsGBG`) based on focus/ignore signals.
4. Calculates siege camp attrition reduction percentages and under-construction (`UC`) statuses.
5. Injects the GBG Building Placement Costs table (`#costs`) for active sectors.
6. Renders season-end member leaderboard performance tables.

#### 3.3.2 Intercepted Game API Payloads

##### Primary Intercept: `GuildBattlegroundService.getBattleground`

- **`requestClass`**: `GuildBattlegroundService` | **`requestMethod`**: `getBattleground`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "GuildBattlegroundService",
    "requestMethod": "getBattleground",
    "responseData": {
      "map": {
        "id": "volcano_archipelago",
        "provinces": [
          {
            "id": 1,
            "ownerId": 12,
            "lockedUntil": 1723005000,
            "placedBuildings": [{ "id": "barracks", "readyAt": 1723001000 }]
          }
        ]
      },
      "currentParticipantId": 12,
      "battlegroundParticipants": [
        {
          "participantId": 12,
          "clan": { "name": "TopGuild" },
          "signals": [{ "provinceId": 1, "signal": "focus" }]
        }
      ]
    }
  }
  ```

##### Secondary Intercepts

- `GuildBattlegroundService.getPlayerLeaderboard`: Player battle/negotiation/attrition counts.
- `GuildBattlegroundBuildingService.getBuildings`: Sector building costs and definitions.
- `GuildBattlegroundSignalsService.setSignal` / `removeSignal`: Province focus/ignore signals.
- `GuildBattlegroundStateService.getState`: Season-end leaderboard result table.

#### 3.3.3 Parsed Data Structures & Exported Objects

- **Exported State Variables**:

  ```javascript
  export var BattlegroundPerformance = []; // Stored array of member battle/neg/attrition stats
  export var GuildMembers = []; // Guild member snapshot
  export var BGtime = ''; // Formatted timestamp of last stored GBG record
  export var GBGdata = []; // Shared sector/map data array
  ```

- **Exported Functions**:
  - `getPlayerLeaderboard(msg)`: Main stats accumulator; stores records in `browser.storage.local` under key `GameOrigin`.
  - `getLeaderboard(msg)`: Renders guild VP/hr and total VP table.
  - `getState(msg)`: Renders season-end member result table in `donationDIV`.
  - `getBattleground(msg)`: Binds map province definitions (`VolcanoProvinceDefs` vs `WaterfallProvinceDefs`), tracks signals, and triggers `checkProvinces()`.
  - `getBuildings(msg)`: Updates sector building definitions and calls `showBuildingCost()`.
  - `setSignal(msg, payload)` / `removeSignal(msg, payload)`: Updates focus/ignore sector signals.
  - `clearBattleground()`: Resets module state and cost DOM.

#### 3.3.4 State Mutations & DOM Rendering Targets

- **Storage & State Mutations**:
  - Saves `BattlegroundPerformance` to local WebExtension storage: `storage.set(GameOrigin, BattlegroundPerformance)`.
  - Mutates `GameOrigin + 'BGtime'` timestamp.
- **DOM Rendering Targets**:
  - `#targetsGBG`: GBG Target List with lock expiry countdowns and siege camp percentages (e.g. `(40%)` ready vs `[40% UC]` under construction). Suppressed if player lacks guild battleground permission (`clan_permissions & 64 == 0`).
  - `#costs`: Scrollable table of GBG building placement costs per resource.
  - `#donation`: Reused to render season-end member performance table.

---

### 3.4 `OtherPlayerService` (`src/js/msg/OtherPlayerService.js`)

#### 3.4.1 Purpose & Extension Role

`OtherPlayerService` ([`src/js/msg/OtherPlayerService.js`](../src/js/msg/OtherPlayerService.js)) provides detailed city inspection when visiting other players, as well as managing social list snapshots:

1. Calculates visited player's daily FP yield, Great Building levels, army unit production, and guild power/goods contributions.
2. Computes precise attack and defense percentage breakdowns across City, GBG, GE, and QI features.
3. Detects active City Shields (`CityProtections`) with countdown timer.
4. Manages social list arrays (`friends`, `guildMembers`, `hoodlist`) and populates collapsible `#friends` tables.
5. Injects direct Google Sheets export integration (`postPlayerToSS`) for guild tracking.

#### 3.4.2 Intercepted Game API Payloads

##### Primary Intercept: `OtherPlayerService.visitPlayer`

- **`requestClass`**: `OtherPlayerService` | **`requestMethod`**: `visitPlayer`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "OtherPlayerService",
    "requestMethod": "visitPlayer",
    "responseData": {
      "other_player": {
        "player_id": 998877,
        "name": "VisitedPlayer",
        "score": 450000000,
        "clan": { "name": "EnemyGuild" }
      },
      "other_player_era": "SpaceAgeTitan",
      "city_map": {
        "entities": [
          {
            "cityentity_id": "X_FutureEra_Landmark1",
            "level": 120,
            "type": "greatbuilding",
            "bonus": { "type": "contribution_boost", "value": 91 }
          }
        ]
      }
    }
  }
  ```

##### Secondary Intercepts

- `OtherPlayerService.getSocialList`: Populates `friends`, `guildMembers`, `neighbours` arrays.
- `OtherPlayerService.getOtherPlayerCityMapEntity`: Sets `PlayerID`, `PlayerName`, and `GBselected` state inline in `index.js`.
- `OtherPlayerService.getCityProtections`: Populates `CityProtections` array with shield expiry timestamps.

#### 3.4.3 Parsed Data Structures & Exported Objects

- **Exported Social Arrays**:

  ```javascript
  export var friends = []; // Snapshot array of active friends
  export var guildMembers = []; // Snapshot array of guild members
  export var hoodlist = []; // Snapshot array of neighborhood players
  ```

- **Exported Functions**:
  - `otherPlayerService(msg)`: Visited city map parser; calculates GB levels, FP, boosts, and updates `#visit`.
  - `otherPlayerServiceUpdateActions(msg)`: Updates `friends`, `guildMembers`, `hoodlist` arrays and updates `#friends` UI.

#### 3.4.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `PlayerName` and `PlayerID` via `setPlayerName(player.name, player.player_id)`.
  - Updates `toolOptions.friendsSize` via `ResizeObserver`.
- **DOM Rendering Targets**:
  - `#visit`: Visited Player City Stats panel (`#visitstatsText`, `#guildPostID`). Displays `*** SHIELD ***` with remaining hours/minutes if player has active shield in `CityProtections`.
  - `#friends`: Collapsible Social Lists table (`#friendsText`, `#guildText`, `#hoodText`) with copy buttons for each category.

---

### 3.5 `ArmyUnitManagementService` (`src/js/msg/ArmyUnitManagementService.js`)

#### 3.5.1 Purpose & Extension Role

`ArmyUnitManagementService` ([`src/js/msg/ArmyUnitManagementService.js`](../src/js/msg/ArmyUnitManagementService.js)) tracks military unit inventories. It categorizes units into era-specific troops and rogues, distinguishes attached from unattached units, calculates unit count deltas (+/−) vs cached state, and renders the `#armyDIV` panel.

#### 3.5.2 Intercepted Game API Payloads

- **`requestClass`**: `ArmyUnitManagementService` | **`requestMethod`**: `getArmyInfo`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "ArmyUnitManagementService",
    "requestMethod": "getArmyInfo",
    "responseData": {
      "counts": [
        { "unitTypeId": "rogue", "attached": 0, "unattached": 1420 },
        { "unitTypeId": "space_knight", "attached": 8, "unattached": 45 }
      ]
    }
  }
  ```

#### 3.5.3 Parsed Data Structures & Exported Objects

- **Module Cache**: `var ArmyUnits = []` (associative array mapping `unitTypeId` → total count `attached + unattached`).
- **Exported Functions**:
  - `armyUnitManagementService(msg)`: Primary message handler; aggregates units, computes deltas, renders HTML into `armyDIV`.
  - `clearArmyUnits()`: Resets `ArmyUnits = []` cache on city reload.

#### 3.5.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `ArmyUnits` cache.
  - Updates container height persistent setting `toolOptions.armySize` via `ResizeObserver`.
- **DOM Rendering Targets**:
  - `#armyDIV`: Sub-elements `#armyTextLabel`, `#armyUnits`, `#armyUnits2`, `#armyUnits3`, `#armyText`. Displays unit count deltas in green (`+N`) or red (`-N`).

---

### 3.6 `BonusService` (`src/js/msg/BonusService.js`)

#### 3.6.1 Purpose & Extension Role

`BonusService` ([`src/js/msg/BonusService.js`](../src/js/msg/BonusService.js)) tracks Town Hall daily FP rewards and limited building collection charges across Himeji Castle (`spoils`), Space Carrier (`diplomatic`), Kraken (`strike`), Truce Tower (`aid`), and Blue Galaxy (`double_collection`).

#### 3.6.2 Intercepted Game API Payloads

- **`requestClass`**: `BonusService` | **`requestMethod`**: `getBonuses` / `getLimitedBonuses`
- **JSON Payload Structure (`getLimitedBonuses`)**:
  ```json
  {
    "requestClass": "BonusService",
    "requestMethod": "getLimitedBonuses",
    "responseData": [
      { "type": "spoils_of_war", "amount": 5 },
      { "type": "diplomatic_gifts", "amount": 3 },
      { "type": "first_strike", "amount": 2 },
      { "type": "aid_goods", "amount": 12 },
      { "type": "double_collection", "amount": 4 },
      { "type": "daily_strategypoint", "amount": 10, "value": 10 }
    ]
  }
  ```

#### 3.6.3 Parsed Data Structures & Exported Objects

- **Exported Functions**:
  - `getBonuses(msg)`: Resets `City` FP/coins/Arc/Chat/Traz counters; processes Town Hall daily FP in debug mode.
  - `getLimitedBonuses(msg)`: Iterates `responseData` items, updates `Bonus` & `Galaxy` states, renders `#bonus`.

#### 3.6.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `City` counters (`City.ForgePoints = 0`, `City.Coins = 0`, etc. in `getBonuses`).
  - Mutates `Bonus` charges (`Bonus.spoils`, `Bonus.diplomatic`, `Bonus.strike`, `Bonus.aid`).
  - Mutates `Galaxy.amount` and calls `showGalaxy()`.
- **DOM Rendering Targets**:
  - `#bonus`: Building charge panel (`#spoilsID`, `#diplomaticID`, `#firststrikeID`, `#aidID`).
  - `#fp`: Available FP header element.
  - `#targetsGBG`: Target container cleared in `index.js` when `getBonuses` dispatches.

---

### 3.7 `CityProductionService` (`src/js/msg/CityProductionService.js`)

#### 3.7.1 Purpose & Extension Role

`CityProductionService` ([`src/js/msg/CityProductionService.js`](../src/js/msg/CityProductionService.js)) handles manual building production harvest events. It records produced military units into `rewardsArmy` and harvested city resources into `rewardsCity`, while updating Blue Galaxy double collection charges.

#### 3.7.2 Intercepted Game API Payloads

- **`requestClass`**: `CityProductionService` | **`requestMethod`**: `pickupProduction`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "CityProductionService",
    "requestMethod": "pickupProduction",
    "responseData": {
      "militaryProducts": [{ "unitTypeId": "rogue" }],
      "updatedEntities": [
        {
          "cityentity_id": "R_MultiAge_Bonus22",
          "state": {
            "current_product": {
              "product": {
                "resources": { "strategy_points": 10, "money": 50000 }
              }
            }
          }
        }
      ]
    }
  }
  ```

#### 3.7.3 Parsed Data Structures & Exported Objects

- **Exported Functions**:
  - `pickupProduction(msg)`: Primary harvest event handler.

#### 3.7.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `rewardsArmy[name]` accumulator in `index.js`.
  - Mutates `rewardsCity[shortName]` resource counts in `index.js`.
  - Calls `updateGalaxy(reward)` in `StartupService.js`.
- **DOM Rendering Targets**:
  - Triggers `showReward({ source: 'pickupProduction', name, amount })` modal if `showOptions.showRewards` is enabled.

---

### 3.8 `ClanBattleService` (`src/js/msg/ClanBattleService.js`)

#### 3.8.1 Purpose & Extension Role

`ClanBattleService` ([`src/js/msg/ClanBattleService.js`](../src/js/msg/ClanBattleService.js)) handles Guild vs Guild (GvG) technical map operations. It parses continent map sectors, computes era-specific siege costs using a power-curve formula, calculates sector ownership, guild power, live rankings, and applies top-3 ranking multipliers with `BigNumber` precision math.

#### 3.8.2 Intercepted Game API Payloads

- **`requestClass`**: `ClanBattleService`
- Intercepted `requestMethod`s: `getContinent`, `getProvinceDetailed`, `deploySiegeArmy`, `grantIndependence`.
- **JSON Payload Structure (`getProvinceDetailed`)**:
  ```json
  {
    "requestClass": "ClanBattleService",
    "requestMethod": "getProvinceDetailed",
    "responseData": {
      "province_detailed": {
        "era": "FutureEra",
        "power_values": [10, 20, 30, 40],
        "clans": [{ "id": 9876, "name": "TopGuild" }],
        "sectors": [{ "is_fogged": false, "owner_id": 9876, "power": 2 }]
      }
    }
  }
  ```

#### 3.8.3 Parsed Data Structures & Mathematics

- **Exported Objects & Functions**:

  - `gvgContainer`, `gvgSummary`, `gvgAges`: DOM element references.
  - `getContinent(msg)`: Sector count and siege cost parser.
  - `getProvinceDetailed(msg)`: Sector power and top-3 ranking boost calculator.
  - `deploySiegeArmy(msg)` / `grantIndependence(msg)`: GvG event debug loggers.

- **Siege Cost Formula**:
  $$\text{siegeCost} = \left\lfloor \frac{3 \cdot c^{1.5} + 0.045 \cdot c^{3.1}}{5} + 1 \right\rfloor \times 25$$
  Where $c$ is the count of currently owned sectors in that province. Cost is charged in **Medals** for `AllAge` (`AA`), or **Era Goods** for specific ages.

- **Top 3 Ranking Power Boost Multiplier**:
  $$\text{power} \times \left(1 + \frac{3 - \text{rank}}{20}\right)$$
  - Rank 1: $+15\%$ multiplier (`1.15`)
  - Rank 2: $+10\%$ multiplier (`1.10`)
  - Rank 3: $+5\%$ multiplier (`1.05`)
    Calculated using `BigNumber(clan.power).times(1 + (3 - j) / 20).dp(0)`.

#### 3.8.4 State Mutations & DOM Rendering Targets

- **State Mutations**: Mutates `gvgPower`, `gvgPowerAll`, and `gvgAgeNotloadList`. Resets city stats containers via `fCleardForGVG()`.
- **DOM Rendering Targets**: `#gvgInfo`, `#gvgOverviewText`, `#gvgGuildPowerText`, `#gvgCurrAgeText`, `#gvgAllGuildsPowerText`. Appends warning material icons if un-scanned GvG ages remain.

---

### 3.9 `ConversationService` (`src/js/msg/ConversationService.js`)

#### 3.9.1 Purpose & Extension Role

`ConversationService` ([`src/js/msg/ConversationService.js`](../src/js/msg/ConversationService.js)) monitors in-game guild thread messages to:

1. Detect GBG sector target notifications in thread teasers and render alert UI cards.
2. Dynamically parse Arc donation thread titles (e.g. 1.85, 1.90, 1.95, 190%, 200%) to automatically update the Great Building donation calculator percentage.

#### 3.9.2 Intercepted Game API Payloads

- **`requestClass`**: `ConversationService`
- Intercepted `requestMethod`s: `getCategory`, `getOverviewForCategory`, `getConversation`.
- **JSON Payload Structure (`getConversation`)**:
  ```json
  {
    "requestClass": "ConversationService",
    "requestMethod": "getConversation",
    "responseData": {
      "id": 88412,
      "title": "1.90% Guild Great Buildings Boost"
    }
  }
  ```

#### 3.9.3 Parsed Data Structures & Arc Parsing Algorithm

- **Exported Functions**:
  - `conversationService(msg)`: Teaser scanner for GBG target topics.
  - `getConversation(msg)`: Thread title parser for Arc boost rates.
- **Arc Rate Parsing Algorithm (`getPercent(title)`)**:
  1. Checks for `%` character: if substring value > 100, passes value to `setCurrentPercent()`.
  2. Evaluates explicit string matches:
     - `1.85` $\rightarrow$ `185%` | `1.8` $\rightarrow$ `180%`
     - `1.91` .. `1.99` $\rightarrow$ `191%` .. `199%`
     - `2.0` / `2.00` / `200%` $\rightarrow$ `200%`
     - `1.9` / `1,9` / `190%` $\rightarrow$ `190%`
  3. Fallback: defaults to `190%` and iterates space-delimited title tokens (`getIntValue`).

#### 3.9.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `currentPercent` in [`src/js/msg/GreatBuildingsService.js`](../src/js/msg/GreatBuildingsService.js) via `setCurrentPercent(percent)`.
- **DOM Rendering Targets**:
  - `#targetsGBG`: Renders GBG target alert box with sender info, timestamp, Discord webhook trigger (`postTargetsToDiscord`), and a 10-minute auto-dismiss timer (`setTimeout 600000 ms`).

---

### 3.10 `GuildExpeditionService` (`src/js/msg/GuildExpeditionService.js`)

#### 3.10.1 Purpose & Extension Role

`GuildExpeditionService` ([`src/js/msg/GuildExpeditionService.js`](../src/js/msg/GuildExpeditionService.js)) parses Guild Expedition (GE) member contribution lists. It extracts solved encounter counts and accumulated expedition points for all guild members and renders an interactive contribution table.

#### 3.10.2 Intercepted Game API Payloads

- **`requestClass`**: `GuildExpeditionService` | **`requestMethod`**: `getContributionList`
- **JSON Payload Structure**:
  ```json
  {
    "requestClass": "GuildExpeditionService",
    "requestMethod": "getContributionList",
    "responseData": [
      {
        "player": { "name": "PlayerOne", "player_id": 101 },
        "solvedEncounters": 64,
        "expeditionPoints": 145000
      }
    ]
  }
  ```
- Related inline routes in [`src/js/index.js`](../src/js/index.js):
  - `GuildExpeditionService.getOverview`: Triggers `clearExpedition()` to reset GE UI.
  - `GuildExpeditionService.openChest`: Accumulates `rewardsGE[name]` rewards and triggers `showReward(reward)`.

#### 3.10.3 Parsed Data Structures & Exported Objects

- **Exported Functions**:
  - `guildExpeditionService(msg)`: Main GE member table parser. Builds `ExpeditionPerformance` array `[[name, solvedEncounters], ...]`.

#### 3.10.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Updates `toolOptions.expeditionSize` in storage via `ResizeObserver` listener on `#expeditionText`.
- **DOM Rendering Targets**:
  - `donationDIV2`: Injects GE contribution card, data table (`#expeditionText`), clipboard copy button (`copy.ExpeditionCopy`), and collapse toggle (`fCollapseExpedition`).

---

### 3.11 `ResourceService` (`src/js/msg/ResourceService.js`)

#### 3.11.1 Purpose & Extension Role

`ResourceService` ([`src/js/msg/ResourceService.js`](../src/js/msg/ResourceService.js)) manages global resource definitions (goods names, eras, ranking point values) and active player inventory resource counts (goods quantities, forge points). It serves as the primary data provider for resource lookups across all extension services.

#### 3.11.2 Intercepted Game API Payloads

- **`requestClass`**: `ResourceService` | **`requestMethod`**: `getResourceDefinitions` / `getPlayerResources`
- **JSON Payload Structure (`getPlayerResources`)**:
  ```json
  {
    "requestClass": "ResourceService",
    "requestMethod": "getPlayerResources",
    "responseData": {
      "resources": {
        "strategy_points": 24,
        "marble": 1250,
        "bioplastics": 430
      }
    }
  }
  ```

#### 3.11.3 Parsed Data Structures & Exported Objects

- **Exported State Variables**:
  - `ResourceDefs` (Array): Full list of raw resource definition objects.
  - `ResourceNames` (Object): Map of resource ID $\rightarrow$ display name (`ResourceNames[id] = name`).
  - `Resources` (Object): Map of resource ID $\rightarrow$ current player inventory count.
  - `availableFP` (Number): On-hand strategy points from `Resources.strategy_points`.
- **Exported Functions**:
  - `getResourceDefinitions(msg)`: Main entrypoint for resource metadata.
  - `saveResourceDefs(msg)`: Persists `ResourceDefs` to local storage (`storage.set('ResourceDefs', ResourceDefs)`).
  - `setResourceDefs(msg)`: Restores `ResourceDefs` from storage load.
  - `getPlayerResources(msg)`: Updates `Resources`, sets `availableFP`, updates `#availableFPID`, and renders `#goodsDIV`.
  - `setResources(resource, needed)`: Returns net required goods count after subtracting on-hand `Resources[resource]`.

#### 3.11.4 State Mutations & DOM Rendering Targets

- **State Mutations**:
  - Mutates `ResourceDefs`, `ResourceNames`, `Resources`, `availableFP`.
  - Persists `ResourceDefs` to WebExtension local storage.
  - Mutates `toolOptions.goodsSize` in storage via `ResizeObserver`.
- **DOM Rendering Targets**:
  - `#availableFPID`: Updates text content with combined total FP (`availablePacksFP + availableFP`).
  - `#goodsDIV`: Injects Goods Inventory table with clipboard copy and collapse bindings.

---

## 4. Cross-Service Dependency & Global State Matrix

The table below illustrates the interactions, shared state exports, and cross-dependencies between the 11 domain service modules and [`src/js/index.js`](../src/js/index.js).

```
┌──────────────────────────────┬───────────────────────────────┬────────────────────────────────────────┐
│ Service Module               │ Exported Shared State         │ Cross-Module Dependencies              │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ StartupService.js            │ City, Galaxy, fArcname,       │ Calls clearArmyUnits() in ArmyUnit;    │
│                              │ updateGalaxy(), showGalaxy()  │ Imports ResourceDefs, availableFP from │
│                              │                               │ ResourceService.                       │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ GreatBuildingsService.js     │ showGreatBuldingDonation(),   │ Imports City from StartupService;      │
│                              │ setCurrentPercent()           │ Imports friends, guildMembers, hood    │
│                              │                               │ from OtherPlayerService.               │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ GuildBattlegroundService.js  │ BattlegroundPerformance,      │ Imports Volcano/WaterfallDefs,         │
│                              │ GuildMembers, BGtime, GBGdata │ BuildingDefs, targets from index.js.   │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ OtherPlayerService.js        │ friends, guildMembers,        │ Imports fArcname from StartupService;  │
│                              │ hoodlist                      │ Imports CityEntityDefs from index.js.  │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ ArmyUnitManagementService.js │ ArmyUnits, clearArmyUnits()   │ Imports MilitaryDefs, armyDIV from     │
│                              │                               │ index.js.                              │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ BonusService.js              │ getBonuses(),                 │ Mutates City, Galaxy in StartupService;│
│                              │ getLimitedBonuses()           │ Mutates Bonus in index.js.             │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ CityProductionService.js     │ pickupProduction()            │ Calls updateGalaxy() in Startup;       │
│                              │                               │ Mutates rewardsArmy/City in index.js.  │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ ClanBattleService.js         │ gvgContainer, gvgSummary,     │ Uses BigNumber for boost precision;    │
│                              │ gvgAges                       │ Clears UI via fCleardForGVG() in index.│
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ ConversationService.js       │ conversationService(),        │ Calls setCurrentPercent() in GreatBldg;│
│                              │ getConversation()             │ Reads targets, targetsTopic in index.  │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ GuildExpeditionService.js    │ guildExpeditionService()      │ Uses donationDIV2 from index.js;       │
│                              │                               │ Uses setExpeditionSize from globals.   │
├──────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ ResourceService.js           │ ResourceDefs, ResourceNames,  │ Mutates availableFP, Resources;        │
│                              │ Resources, availableFP        │ Saves ResourceDefs to local storage.   │
└──────────────────────────────┴───────────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Edge Cases, Fail-Safes & Error Recovery

1. **Unloaded Static Metadata Protection**:
   If `StartupService.getData` arrives before `StaticDataService.getMetadata` finishes loading, execution is deferred into `pendingStartupMsg`. `startupService` runs automatically once `metadataLoaded = true`.
2. **Metadata Fetch Retry Pipeline**:
   If `Promise.all` fails while fetching metadata JSON resources, the extension executes a sequential retry loop over each URL item in `responseData`, falling back to cached local storage if network requests fail entirely.
3. **Disconnected / Max-Level Great Buildings**:
   - Disconnected Great Buildings append a red warning label `<p class="red">*** DISCONNECTED ***</p>` to the donation card.
   - Max-level Great Buildings append `<p class="red">*** LOCKED ***</p>`.
4. **Guild Battleground Permission Guard**:
   If a player's `clan_permissions` bitwise check `& 64` evaluates to `0`, GBG target list rendering in `#targetsGBG` is suppressed to prevent unauthorized sector signaling.
5. **Visited Player Active Shield Countdown**:
   When visiting an enemy or neighbor, `OtherPlayerService` checks the `CityProtections` array. If an active shield timestamp is found, it renders `*** SHIELD ***` with a live countdown timer.
6. **Arc Boost Rate Fallback Cascade**:
   When parsing thread titles in `ConversationService`, if no explicit percentage (e.g. `1.85`, `190%`, `2.0`) is found, the parser safely defaults to `190%` before checking space-separated numeric tokens.

---

## 6. Verification Method

To verify the implementation and network route dispatch mapping documented in this reference:

1. **Verify Source Code Imports & Dispatch Table**:
   ```bash
   grep -n "requestClass" src/js/index.js | head -100
   ```
2. **Inspect Service Exports**:
   ```bash
   ls -la src/js/msg/
   ```
3. **Validate Webpack Production Build**:
   Run the production build script to confirm Webpack bundles all 11 domain service modules without compilation or syntax errors:
   ```bash
   npm run build
   ```
   Or using `mise`:
   ```bash
   mise run build
   ```
   The build must exit with status `0` and generate the extension artifact in `build/`.
