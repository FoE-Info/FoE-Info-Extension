# GB Donation Historical Behaviour Baseline (v1 & LoW-Tool)

**Date**: 2026-09-12
**Sources**: `FoE-Info-Extension-original/src/js/msg/GreatBuildingsService.js` (v1, commit
`8c681d1`) and `LoW-Tool/src/js/msg/GreatBuildingsService.js` +
`LoW-Tool/src/extras/msg/GreatBuildingsService.js`.
**Status**: v1 and both LoW-Tool copies share **byte-identical** GB donation math; the
extras copy is the same `getPlaceValues`/`getSafe`.

This is the reference for "restore original behaviour". The 4-way oracle lives in
`tests/math/gb-four-implementation-parity.test.mjs`.

---

## 1. v1 selection — a top-down cascade

```js
getPlaceValues(1); getSafe(1);
if (Donation < remaining) { show P1 }
else { getPlaceValues(2); if (Donation < remaining) { show P2 }
  else { ... P3, P4, P5 } }
```

- `Donation` = lock = `round((total − current + Top[place]) / 2)`
- `Donation < remaining` ⟺ `occupant < remaining`
- It shows the **topmost available position**, dropping to the next if taken.
- `remaining` is **reset each call** (`total − current`); it is never threaded.

## 2. v1 verdict (one per displayed position)

```js
RewardFP = round(base × (1 + Arc/100))   // gross reward / break-even
Profit   = RewardFP − Donation           // gross − lock
Profit >= 0 → green "Profit: N (P%)"
else        → red   "Loss: N"
```

- `0` is **green** (`Profit: 0`), never a loss.
- No `NOT_POSSIBLE` label — taken positions are simply skipped by the cascade.

## 3. v1 owner add (own GB only)

```js
if (PlayerName == MyInfo.name && lock − donateSuggest > 0)
  "Add (lock − donateCustom) × 2 FP to make safe for 1.9"
```

- Shown only when viewing your own GB.
- The deposit (`donateCustom`, 1.9×) appears here, **not** in the profit/loss.

## 4. Own vs other view

v1 uses **one shared calculation for both views**. The only difference is that the
"Add … to make safe" line renders only when `PlayerName == MyInfo.name` (host).

## 5. 4-way parity result (Arc 100%, rate 1.9)

| Case               | lock | gross | ours | v1 / LoW | Forge-Hammer |
| :----------------- | ---: | ----: | ---: | -------: | -----------: |
| Cosmic P3          |  494 |   520 |  +26 |      +26 |          +26 |
| Zeus P2            | 1480 |  1480 |    0 |        0 |          +74 |
| Zeus P3            |  740 |   490 | −250 |     −250 |          +24 |
| Blue Galaxy P3     |  620 |   620 |    0 |        0 |          +31 |
| Blue Galaxy P4     |  310 |   160 | −150 |     −150 |           +8 |
| edge: deposit>lock |   50 |   400 | +350 |     +350 |          +20 |
| edge: odd owner    |   51 |    40 |  +25 |      +26 |            — |

- **ours == FoE-Info-original == LoW-Tool** on every row (after the alignment fix).
- The only literal v1 difference is the **odd owner-add**: v1's `(lock − dep) × 2`
  overcharges by 1 FP; our exact `ceil(R+X−2·dep)` is kept deliberately.
- Forge-Hammer's verdict subtracts the **deposit**, not the lock, so its sign
  differs — that is FH's model, not v1.

## 6. Modern divergences that were fixed

1. Selection used `lock <= remaining` instead of `<`, wrongly targeting the
   boundary-safe position (the Zeus P2 / Blue Galaxy P3 bug).
2. Verdict fell into a `lock − deposit` "loss" branch that labelled a `0 NET`
   position as a loss.
3. `calculateSafeSpots` now exposes `safePlaces`, `levelWarning`, `danger`, and
   threads P6+ contributors as P5's next occupant.
