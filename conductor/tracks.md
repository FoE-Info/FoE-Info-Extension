# Project Tracks Index

## Active Tracks

- [x] **modernization** - [Codebase Modernization (Cluster 4: UI & Panels)](./tracks/modernization/index.md)
  - Completed: all 7 Cluster 4 slices (4A–4G); `src/js/ui/indexUiBindings.js` 422L $\rightarrow$ 220L.
  - Status: `complete`

## Completed Tracks (Archived)

- **[Milestone 1 Decomposition (Clusters 1–3)](./tracks/modernization/index.md#completed-milestones-archive)**
  - Cluster 1 Production: `entityProductionParser.js` (497L $\rightarrow$ 202L).
  - Cluster 2 Protocol Handlers: `GuildBattlegroundService.js` (489L $\rightarrow$ 240L), `StartupService.js` (424L $\rightarrow$ 246L), `GbgSignalService.js` (403L $\rightarrow$ 221L).
  - Cluster 3 Protocol & State: `MessageDispatcher.js` (494L $\rightarrow$ 187L), `MetadataStore.js` (487L $\rightarrow$ 245L), `networkListener.js` (477L $\rightarrow$ 231L), `storageListener.js` (403L $\rightarrow$ 193L).
  - Cluster 4 Slices 4A–4F: `panelDispatcher.js` (475L $\rightarrow$ 131L), `collapse.js` (450L $\rightarrow$ 142L), `renderTargetGeneratorCard.js` (442L $\rightarrow$ 180L), `renderGbDonationPanel.js` (422L $\rightarrow$ 239L), `renderGalaxyPanel.js` (283L $\rightarrow$ 215L), `renderLiveCityStats.js` (416L $\rightarrow$ 233L).
- **[Legacy Bridge Modernization (Phases 1–4)](./tracks/modernization/index.md#legacy-bridge-retirement)**
  - Fully retired all 5 legacy route tables (`quantumRoutes`, `buildingRoutes`, `cityRoutes`, `socialRoutes`, `combatRoutes`).
  - Decoupled `MessageDispatcher` and initialized `src/js/state/viewState.js`.
- **[Modern-Web Tier 3 Upgrades](./tracks/modernization/index.md#modern-web-tier-3)**
  - HTML Popover API with CSS Anchor Positioning (`PopoverManager.js`).
  - Native CSS Grid 0fr/1fr collapse transitions.
  - ThemeManager with light/dark preference synchronization.
