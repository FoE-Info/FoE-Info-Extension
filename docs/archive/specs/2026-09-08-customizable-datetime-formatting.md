# Customizable Date & Time Formatting Engine Specification

## 1. Overview & Problem Statement

Currently, date and time formatting in FoE-Info is fragmented and inconsistent across panels:

- Many panels use raw JavaScript `new Date(...).toLocaleString()` or `.toLocaleTimeString()`, which defaults to browser settings and often defaults to US 12-hour AM/PM formats (`3:45:12 PM`) even when users prefer European 24-hour formats (`15:45:12` or `07.09.2026 15:45:12`).
- An earlier fix addressed only a single panel (`GbgSignalService.js`), leaving all other panels unaddressed.
- Forge-Hammer recently resolved this by implementing a customizable date/time formatting engine (`FH.DateFormat`) with preset formats and custom pattern support in their settings dialog.
- FoE-Info needs the exact same capability: customizable date and time formats in the Options settings panel with universal adoption across all DevTools panels.

---

## 2. Forge-Hammer Parity Analysis

In Forge-Hammer (`/var/home/kronikpillow/Projects/FoE-Info/forge-hammer/`):

- **Core Engine**: `FH.DateFormat` in `js/web/_main/js/_main.js` supports 4 types:
  1. `dateShort` (e.g. `DD.MM.YY` / `MM/DD/YY`)
  2. `dateLong` (e.g. `DD.MM.YYYY` / `MM/DD/YYYY`)
  3. `dateTimeShort` (e.g. `DD.MM. HH:mm` / `MM/DD hh:mm A`)
  4. `dateTimeLong` (e.g. `DD.MM.YYYY HH:mm:ss` / `YYYY-MM-DD HH:mm:ss`)
- **Settings UI**: `js/web/settings/js/settings.js` renders a dedicated `.dateFormats` section:
  - Preset dropdowns for common international and regional formats (European 24h, US 12h, ISO 8601).
  - A "Custom" option that reveals a text input with live preview of the current timestamp.
  - Reset to default button.
  - Persistent storage in extension settings.

---

## 3. FoE-Info Architecture & Implementation Plan

### A. Modular Pure Formatter (`src/js/utils/date.js`)

Create a lightweight, pure formatting utility with zero DOM dependencies:

- **Presets**:
  - `dateShort`: `DD.MM.YY`, `YYYY-MM-DD`, `MM/DD/YY`, `DD/MM/YY`
  - `dateLong`: `DD.MM.YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`
  - `timeShort`: `HH:mm`, `hh:mm A`
  - `timeLong`: `HH:mm:ss`, `hh:mm:ss A`
  - `dateTimeShort`: `DD.MM. HH:mm`, `YYYY-MM-DD HH:mm`, `MM/DD hh:mm A`
  - `dateTimeLong`: `DD.MM.YYYY HH:mm:ss`, `YYYY-MM-DD HH:mm:ss`, `MM/DD/YYYY hh:mm:ss A`
- **Functions**:
  - `formatDate(timestampOrDate, type = 'dateLong', customFormat = null)`
  - `formatTime(timestampOrDate, type = 'timeLong', customFormat = null)`
  - `formatDateTime(timestampOrDate, type = 'dateTimeLong', customFormat = null)`
  - Native token parser (`YYYY`, `YY`, `MM`, `DD`, `HH`, `hh`, `mm`, `ss`, `A`, `a`) without adding external bundle weight.

### B. Settings Storage & Options UI

- **Storage Keys in World/Global Settings**:
  - `dateFormat`: user's choice for date format (default: `'DD.MM.YYYY'` or `'locale'`)
  - `timeFormat`: user's choice for time format (default: `'24h'` / `'HH:mm:ss'`)
  - `dateTimeFormat`: user's choice for full datetime (default: `'DD.MM.YYYY HH:mm:ss'`)
  - `customDateFormat`: custom token string when "Custom" is selected
- **Options Form**: Add Date & Time Format controls to `src/chrome/options.html` and `src/js/ui/optionsForm.js`.

### C. Panels to Update

Replace hardcoded `toLocaleTimeString()` and `toLocaleString()` calls across:

1. **Blue Galaxy Panel** (`src/js/ui/renderGalaxyPanel.js`): Transition countdown timestamps.
2. **Great Buildings Info Panel** (`src/js/ui/renderGbInfoPanel.js`): Level up and ready timestamps.
3. **Guild Battlegrounds** (`src/js/msg/GuildBattlegroundService.js`): Last saved `BGtime`, sector lock timers.
4. **City Incidents** (`src/js/fn/helper.js`): Incident start and expiration timers.
5. **Player Profile & Stats** (`src/js/msg/StartupService.js`): Account creation date (`createdAt`).
6. **Cultural Outpost & Settlements** (`src/js/msg/OutpostService.js`): Quest and settlement completion timers.
