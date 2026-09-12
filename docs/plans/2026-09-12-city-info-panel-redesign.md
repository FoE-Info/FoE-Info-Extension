# City Info Panel Redesign & Section Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the City Info dashboard cards (`#header`, `#citystats`, and `#visit`) into a clean, hierarchical layout with dedicated "Daily Production" and "Combat Boosts" section headers, inline coin/supply boosts, AO and Cosmic Catalyst critical strike display, and a daily units building breakdown popover.

**Architecture:** Extend calculation accumulators in `UnitCalculator.js` to collect unit-producing entities and extract critical hit chances strictly from Arctic Orangery and Cosmic Catalyst. Enhance `cityStatsTooltipBuilder.js` and `statFormatters.js` to expose unit breakdown popovers and critical strike strings. Update `ownCityCard.js` and `visitedCityCard.js` to share a symmetrical, sectioned layout styled via `.foe-section-header` in `custom.scss`. Maintain complete localization parity across all 7 supported languages.

**Tech Stack:** JavaScript (ESM/CJS), Bootstrap 5.3, SCSS, BigNumber.js, Node.js test runner (`node:test`).

**Spec:** Self-contained design in this document (aligned with conversation spec)

## Global Constraints

- Target module size <= 250 lines (hard ceiling <= 600 lines).
- Debuggability Invariant (Rule 16): Every new or refactored module must instantiate `createLogger('<ModuleName>')` from `src/js/utils/logger.js`, emitting `logger.debug(...)` diagnostics when debug mode is enabled, while remaining 100% silent in standard mode.
- BigNumber precision (Rule 9) for all FP and game resource math.
- 5-stage verification gate: `npm run verify` (formatting, lint, i18n parity, tests, development build); run `npm run typecheck` separately.
- Symmetrical layout between own city (`#citystats`) and visited city (`#visit`).
- Narrow DevTools docking tolerance: layout must render cleanly down to 250px without horizontal overflow.

---

### Target Layout Wireframe

```text
┌─────────────────────────────────────────────────────────────┐
│ [-] [EN7] PlayerName (i)                           [ Copy ] │
├─────────────────────────────────────────────────────────────┤
│ Guild: MyGuildName                                          │
│ Score: 1,234,567,890                                        │
│ Age: Space Age Space Hub                                    │
│ Arc Bonus: 90.0%                                            │
│ Chateau Frontenac Bonus: 750% (35 Goods)                    │
│ Crit Strike: 33% (AO), 25% (CC)                             │
│                                                             │
│ ── DAILY PRODUCTION ─────────────────────────────────────── │
│ Coins: 25,000,000 (+120%)                                   │
│ Supplies: 14,200,000 (+85%)                                 │
│ FP: 1,450 (with breakdown popover)                          │
│ Goods: 2,300 (with era popover)                             │
│ Guild Goods: 850 (with popover)                             │
│ Units: 120 (with building breakdown popover)                │
│                                                             │
│ ── COMBAT BOOSTS ────────────────────────────────────────── │
│ Attackers: 2,450% Att, 1,980% Def                           │
│ Defenders: 850% Att, 1,120% Def                             │
│ GBG Attackers: 3,100% Att, 2,800% Def                       │
│ GBG Defenders: 1,200% Att, 1,450% Def                       │
│ GE Attackers: 2,200% Att, 2,050% Def                        │
│ GE Defenders: 950% Att, 1,100% Def                          │
│ QI Attackers: 450% Att, 420% Def                            │
│ QI Defenders: 210% Att, 310% Def                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 1: Calculation Engine & Tooltip Extensions

**Files:**

- Modify: `src/js/calc/units/UnitCalculator.js`
- Modify: `src/js/calc/CityStatsCalculator.js`
- Modify: `src/js/calc/VisitedCityStatsCalculator.js`
- Modify: `src/js/ui/components/cityStatsTooltipBuilder.js`
- Test: `tests/calc/unit-calculator-breakdown.test.mjs`

**Interfaces:**

- Consumes: `entities` and `meta` from `CityStatsCalculator` / `VisitedCityStatsCalculator`.
- Produces:
  - `accum.buildings`: `Array<{ name: string, amount: number }>` in `createUnitsAccumulator()`.
  - `spec.aoCritPercent`: `BigNumber` (from `X_ArcticFuture_Landmark2`).
  - `spec.ccCritPercent`: `BigNumber` (from `X_SpaceAgeSpaceHub_Landmark2`).
  - `buildUnitsTooltipHTML(unitBuildingsList)` in `cityStatsTooltipBuilder.js`.

- [ ] **Step 1: Write the failing test**

Create `tests/calc/unit-calculator-breakdown.test.mjs`:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  createUnitsAccumulator,
  extractSpecialBonuses,
  processEntityUnits,
} from '../../src/js/calc/units/UnitCalculator.js';
import { buildUnitsTooltipHTML } from '../../src/js/ui/components/cityStatsTooltipBuilder.js';

test('Unit Calculator Breakdown & Critical Hit Suite', async (t) => {
  await t.test(
    'accumulates unit-producing buildings in units accumulator',
    () => {
      const accum = createUnitsAccumulator();
      assert.ok(
        Array.isArray(accum.buildings),
        'accum.buildings should be an array',
      );

      // Alcatraz product
      processEntityUnits({
        entity: {
          cityentity_id: 'X_ProgressiveEra_Landmark1',
          state: { current_product: { name: 'penal_unit', amount: 80 } },
        },
        meta: { name: 'Alcatraz' },
        prodResources: {},
        accum,
      });

      // Daily unit building (e.g. Governor's Villa)
      processEntityUnits({
        entity: { cityentity_id: 'villa_1' },
        meta: { name: "Governor's Villa" },
        prodResources: { units: 4 },
        accum,
      });

      assert.equal(accum.dailyUnits.toNumber(), 84);
      assert.equal(accum.buildings.length, 2);
      assert.equal(accum.buildings[0].name, 'Alcatraz');
      assert.equal(accum.buildings[0].amount, 80);
      assert.equal(accum.buildings[1].name, "Governor's Villa");
      assert.equal(accum.buildings[1].amount, 4);
    },
  );

  await t.test(
    'extracts critical hit chance strictly from AO and Cosmic Catalyst',
    () => {
      // Arctic Orangery
      const aoSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_ArcticFuture_Landmark2',
          bonus: { value: 33 },
        },
        meta: {},
        level: 70,
      });
      assert.ok(aoSpecial.aoCritPercent instanceof BigNumber);
      assert.equal(aoSpecial.aoCritPercent.toNumber(), 33);

      // Cosmic Catalyst
      const ccSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_SpaceAgeSpaceHub_Landmark2',
          bonus: { value: 25 },
        },
        meta: {},
        level: 68,
      });
      assert.ok(ccSpecial.ccCritPercent instanceof BigNumber);
      assert.equal(ccSpecial.ccCritPercent.toNumber(), 25);

      // Kraken must NOT have critical strike
      const krakenSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_OceanicFuture_Landmark1',
          bonus: { value: 50 },
        },
        meta: {},
        level: 60,
      });
      assert.equal(krakenSpecial.aoCritPercent, undefined);
      assert.equal(krakenSpecial.ccCritPercent, undefined);
      assert.equal(krakenSpecial.critPercent, undefined);
    },
  );

  await t.test('buildUnitsTooltipHTML formats sorted building list', () => {
    const html = buildUnitsTooltipHTML([
      { name: "Governor's Villa", amount: 4 },
      { name: 'Alcatraz', amount: 80 },
    ]);
    assert.match(html, /80 <strong>Alcatraz<\/strong>/);
    assert.match(
      html,
      /4 <strong>Governor&#39;s Villa<\/strong>|4 <strong>Governor's Villa<\/strong>/,
    );
    // Alcatraz should appear before Governor's Villa due to descending sort
    const alcIdx = html.indexOf('Alcatraz');
    const villaIdx = html.indexOf('Villa');
    assert.ok(alcIdx < villaIdx, 'Higher unit yield should be listed first');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/calc/unit-calculator-breakdown.test.mjs`
Expected: FAIL (accum.buildings is undefined, ccCritPercent not implemented, buildUnitsTooltipHTML not a function).

- [ ] **Step 3: Implement calculation and tooltip changes**

In `src/js/calc/units/UnitCalculator.js`:

- Update `createUnitsAccumulator()`:
  ```javascript
  function createUnitsAccumulator() {
    return {
      dailyUnits: new BigNumber(0),
      trazUnits: new BigNumber(0),
      buildings: [],
    };
  }
  ```
- In `processEntityUnits`:
  When units are added, record `{ name: meta?.name || entityId, amount }` into `accum.buildings`.
- In `extractSpecialBonuses`:
  - `X_ArcticFuture_Landmark2` -> `res.aoCritPercent = toBigNumber(bonusVal)`.
  - `X_SpaceAgeSpaceHub_Landmark2` -> `res.ccCritPercent = toBigNumber(bonusVal)`.
  - Remove `krakenCritPercent` (or ensure it's not tagged as critical strike).

In `src/js/calc/CityStatsCalculator.js` and `src/js/calc/VisitedCityStatsCalculator.js`:

- Forward `aoCritPercent` and `ccCritPercent` to `special.aoCriticalStrike` and `special.ccCriticalStrike`.
- Forward `unitsAccum.buildings` into the returned `units.buildings` array.

In `src/js/ui/components/cityStatsTooltipBuilder.js`:

- Add and export `buildUnitsTooltipHTML(unitBuildingsList, customHelper)`:
  Groups buildings by name, sums amounts, sorts descending by amount, and returns formatted HTML rows:
  `${item.amount} <strong>${escapeHtml(item.name)}</strong>${countStr}<br>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/calc/unit-calculator-breakdown.test.mjs`
Expected: PASS (all 3 subtests pass).

- [ ] **Step 5: Commit**

```bash
git add src/js/calc/units/UnitCalculator.js src/js/calc/CityStatsCalculator.js src/js/calc/VisitedCityStatsCalculator.js src/js/ui/components/cityStatsTooltipBuilder.js tests/calc/unit-calculator-breakdown.test.mjs
git commit -m "feat(calc): track unit buildings and AO/CC critical hit chance"
```

---

### Task 2: Stat Formatters & Localization Setup

**Files:**

- Modify: `src/js/ui/components/statFormatters.js`
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/de.json`
- Modify: `src/i18n/fr.json`
- Modify: `src/i18n/es.json`
- Modify: `src/i18n/it.json`
- Modify: `src/i18n/el.json`
- Modify: `src/i18n/gr.json`
- Test: `tests/ui/stat-formatters-sections.test.mjs`

**Interfaces:**

- Consumes: `spec` (`aoCriticalStrike`, `ccCriticalStrike`), `units` (`daily`, `traz`, `tooltipHTML`).
- Produces:
  - `formatCritStrikeHTML(spec)`: returns formatted HTML for Critical Strike line.
  - `formatUnitsHTML(stats, playerInfo, prefix, exact)`: returns formatted HTML for Daily Units with popover.
  - Localization keys: `daily_production`, `combat_boosts`, `crit_strike`.

- [ ] **Step 1: Write the failing test**

Create `tests/ui/stat-formatters-sections.test.mjs`:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  formatCritStrikeHTML,
  formatUnitsHTML,
} from '../../src/js/ui/components/statFormatters.js';

test('Stat Formatters Sections & Boosts Suite', async (t) => {
  await t.test(
    'formatCritStrikeHTML returns empty string when neither AO nor CC built',
    () => {
      const html = formatCritStrikeHTML({});
      assert.equal(html, '');
    },
  );

  await t.test(
    'formatCritStrikeHTML renders single percentage when only AO is built',
    () => {
      const html = formatCritStrikeHTML({
        aoCriticalStrike: new BigNumber(33),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 33%/,
      );
      assert.doesNotMatch(html, /\(AO\)/);
    },
  );

  await t.test(
    'formatCritStrikeHTML renders single percentage when only CC is built',
    () => {
      const html = formatCritStrikeHTML({
        ccCriticalStrike: new BigNumber(25),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 25%/,
      );
      assert.doesNotMatch(html, /\(CC\)/);
    },
  );

  await t.test(
    'formatCritStrikeHTML renders dual breakdown when both AO and CC are built',
    () => {
      const html = formatCritStrikeHTML({
        aoCriticalStrike: new BigNumber(33),
        ccCriticalStrike: new BigNumber(25),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 33% \(AO\), 25% \(CC\)/,
      );
    },
  );

  await t.test(
    'formatUnitsHTML renders interactive popover when tooltip is present',
    () => {
      const html = formatUnitsHTML(
        {
          units: {
            daily: new BigNumber(120),
            tooltipHTML: '120 <strong>Alcatraz</strong><br>',
          },
        },
        {},
        'citystats',
        false,
      );
      assert.match(html, /data-bs-toggle="popover"/);
      assert.match(html, /data-bs-title="Daily Units"/);
      assert.match(html, /120/);
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/stat-formatters-sections.test.mjs`
Expected: FAIL (`formatCritStrikeHTML` is not a function).

- [ ] **Step 3: Implement formatters and update i18n dictionaries**

In `src/js/ui/components/statFormatters.js`:

- Implement `formatCritStrikeHTML(spec)`:
  - If both `aoCriticalStrike` and `ccCriticalStrike` > 0:
    `<div><span data-i18n="crit_strike">Crit Strike</span>: ${formatPercent(spec.aoCriticalStrike)} (AO), ${formatPercent(spec.ccCriticalStrike)} (CC)</div>`
  - If only AO > 0:
    `<div><span data-i18n="crit_strike">Crit Strike</span>: ${formatPercent(spec.aoCriticalStrike)}</div>`
  - If only CC > 0:
    `<div><span data-i18n="crit_strike">Crit Strike</span>: ${formatPercent(spec.ccCriticalStrike)}</div>`
  - Else return `''`.
- Implement `formatUnitsHTML(stats, playerInfo, prefix, exact)`:
  - Check `stats.units?.tooltipHTML || playerInfo.unitsTooltipHTML`.
  - If present, wrap count in `<span id="${prefix}-units" class="pop" role="button" tabindex="0" data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true" data-bs-title="Daily Units" data-bs-content='${escapedTip}'>${unitCount}</span>`.
  - Return `<span data-i18n="stat_daily_units">Daily Units</span>: ${body}`.

In `src/i18n/en.json`:

- Add `"daily_production": "Daily Production",`
- Add `"combat_boosts": "Combat Boosts",`
- Add `"crit_strike": "Crit Strike",`

Run `npm run i18n:fix` and `npm run i18n:check` to propagate across `de`, `fr`, `es`, `it`, `el`, `gr`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/stat-formatters-sections.test.mjs`
Expected: PASS.
Run: `npm run i18n:check`
Expected: Exit code 0 (all keys in parity).

- [ ] **Step 5: Commit**

```bash
git add src/js/ui/components/statFormatters.js src/i18n/*.json tests/ui/stat-formatters-sections.test.mjs
git commit -m "feat(ui): add crit strike and units popover formatters with i18n keys"
```

---

### Task 3: Section Header Stylesheet (`custom.scss`)

**Files:**

- Modify: `src/css/custom.scss`

**Interfaces:**

- Produces: `.foe-section-header` CSS class.

- [ ] **Step 1: Add `.foe-section-header` rules to `src/css/custom.scss`**

Add right under `.goods-era-header`:

```scss
.foe-section-header {
  font-weight: 600;
  font-size: 0.78em;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 6px 3px 6px;
  margin: 6px 0 4px 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  user-select: none;
}
```

- [ ] **Step 2: Verify SCSS builds cleanly**

Run: `npm run build:dev`
Expected: Webpack builds successfully with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/css/custom.scss
git commit -m "style(ui): add .foe-section-header styles for dashboard cards"
```

---

### Task 4: Card Templates Symmetrical Redesign

**Files:**

- Modify: `src/js/ui/templates/ownCityCard.js`
- Modify: `src/js/ui/templates/visitedCityCard.js`
- Modify: `src/js/ui/renderLiveCityStats.js`
- Test: `tests/ui/city-card-bonuses.test.mjs`

**Interfaces:**

- Consumes:
  - `formatCritStrikeHTML`, `formatUnitsHTML` from `statFormatters.js`.
  - `buildUnitsTooltipHTML` from `cityStatsTooltipBuilder.js`.
- Produces:
  - Symmetrical card HTML with:
    - Top identity: `Guild`, `Score`, `Age`, `Arc Bonus`, `CF Bonus`, `Crit Strike`.
    - `── DAILY PRODUCTION ──` header:
      - `Coins: total (+boost%)`
      - `Supplies: total (+boost%)`
      - `FP: total`
      - `Goods: total`
      - `Guild Goods: total`
      - `Units: total`
    - `── COMBAT BOOSTS ──` header:
      - 8 attacker/defender lines.

- [ ] **Step 1: Update existing bonus assertions and add section tests in `tests/ui/city-card-bonuses.test.mjs`**

Update `tests/ui/city-card-bonuses.test.mjs`:

- Assert presence of `<div class="foe-section-header"><span data-i18n="daily_production">Daily Production</span></div>`.
- Assert presence of `<div class="foe-section-header"><span data-i18n="combat_boosts">Combat Boosts</span></div>`.
- Assert Coins line includes `(+120%)` when coin boost is active.
- Assert Supplies line includes `(+85%)` when supply boost is active.
- Assert `Guild: Test Guild` appears before `Score`.
- Assert Crit Strike renders when `aoCriticalStrike` or `ccCriticalStrike` is present.
- Assert symmetry: verify `buildVisitedCityCard` includes the same section headers and inline coin/supply boosts.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/city-card-bonuses.test.mjs`
Expected: FAIL (headers not found, coin boost not formatted inline).

- [ ] **Step 3: Update `ownCityCard.js` and `visitedCityCard.js`**

In `ownCityCard.js`:

- Format inline coins:
  `${formatStatNumber(coins?.total ?? 0, { exact, comma: true })}${coinBoostVal > 0 ? ` (+${coins.boostPercent}%)` : ''}`
- Format inline supplies:
  `${formatStatNumber(supplies?.total ?? 0, { exact, comma: true })}${supplyBoostVal > 0 ? ` (+${supplies.boostPercent}%)` : ''}`
- Format Crit Strike via `formatCritStrikeHTML(spec)`.
- Format Units via `formatUnitsHTML(stats, playerInfo, prefix, exact)`.
- Reorder card body:
  1. `Guild: ${safeGuild}`
  2. `Score: ${playerScore}`
  3. `Age: ${formatEraName(playerEra)}`
  4. `Arc Bonus: ...`
  5. `CF Bonus: ...`
  6. `${critStrikeHTML}`
  7. `<div class="foe-section-header"><span data-i18n="daily_production">Daily Production</span></div>`
  8. `Coins`, `Supplies`, `FP`, `Goods`, `Guild Goods`, `Units`
  9. `<div class="foe-section-header"><span data-i18n="combat_boosts">Combat Boosts</span></div>`
  10. Attacker/Defender boost lines.

In `visitedCityCard.js`:

- Apply the identical structure, inline boosts, section headers, and crit strike line.

In `renderLiveCityStats.js`:

- Attach `unitsTooltipHTML: buildUnitsTooltipHTML(calculatedStats.units?.buildings)` to `renderCityStats` options.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/city-card-bonuses.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/ui/templates/ownCityCard.js src/js/ui/templates/visitedCityCard.js src/js/ui/renderLiveCityStats.js tests/ui/city-card-bonuses.test.mjs
git commit -m "feat(ui): redesign own and visited city cards with sections, inline boosts, and crit strike"
```

---

### Task 5: Full 5-Stage Verification Gate & Final Parity Check

**Files:** None (pipeline verification).

- [ ] **Step 1: Run full unit test suite**

Run: `npm test`
Expected: 1000+ tests PASS with 0 failures.

- [ ] **Step 2: Run i18n parity check**

Run: `npm run i18n:check`
Expected: 0 missing or redundant keys.

- [ ] **Step 3: Run formatting and linting**

Run: `npm run check`
Expected: Prettier and ESLint pass with 0 errors.

- [ ] **Step 4: Run full verification gate**

Run: `npm run verify`
Expected: All 5 verification stages succeed.

- [ ] **Step 5: Update documentation status**

Update `docs/STATUS.md` and `docs/HANDOFF.md` with the new City Info panel layout changes.

```bash
git add docs/STATUS.md docs/HANDOFF.md
git commit -m "docs: document city info card layout redesign and section hierarchy"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-09-12-city-info-panel-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** - We dispatch specialized subagents (`javascript-expert`, `ui-design-system-architect`, `code-reviewer`) across isolated worktrees in Antigravity / OpenCode.
2. **Inline Execution** - Execute tasks directly in this session step-by-step with checkpoints.
