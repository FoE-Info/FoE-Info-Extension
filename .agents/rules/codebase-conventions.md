# Codebase Conventions & Service Architecture

Guidelines for code structure, DOM manipulation, service dispatching, and math utilities in `FoE-Info-Extension`.

## Code Conventions & Interfaces

- **Modular Services (`src/js/msg/`)**:
  - Network message handling is split into domain-specific service files (e.g. [`StartupService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/StartupService.js), [`GreatBuildingsService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/GreatBuildingsService.js), [`OtherPlayerService.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/msg/OtherPlayerService.js)).
  - Service functions accept parsed JSON payload objects and update global state / DOM UI accordingly.
- **UI & DOM Overlays**:
  - Use [`src/js/fn/AddElement.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/AddElement.js) and Bootstrap 5 components for injecting custom overlays into Forge of Empires game windows.
  - DOM selection and event binding use jQuery 3.7 (`$`).
- **Precision Math**:
  - Always use `bignumber.js` (`BigNumber`) for large Forge of Empires resource, point, or donor calculation math to prevent JS IEEE 754 float precision loss.
- **Date Formatting**:
  - Use `dayjs` for timestamp parsing and date formatting.
- **Error Handling**:
  - Wrap network payload extraction in guard clauses (`checkDebug()`) to prevent uncaught runtime errors from disrupting the main game loop.
