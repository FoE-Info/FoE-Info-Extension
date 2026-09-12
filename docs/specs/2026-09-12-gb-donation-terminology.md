# GB Donation Terminology (Own view vs Donor view)

**Date**: 2026-09-12
**Status**: working glossary — correct me and I'll update it.
**Purpose**: one shared vocabulary so host-perspective and donor-perspective
math, code symbols, and colours never get mixed up again.

The word **"safe" is view-scoped**, and that polysemy is the main source of
confusion. Prefer the qualified terms below over bare "safe".

---

## 1. The two views

| View                          | Trigger                     | Question being answered                                                     | FH panel                                    |
| :---------------------------- | :-------------------------- | :-------------------------------------------------------------------------- | :------------------------------------------ |
| **Own GB view** (host)        | GB opened on your own city  | "How much FP do I (host) add to make my positions safe for supporters?"     | `part-calc.js` (`GB Calculator` / Sequence) |
| **Other-player view** (donor) | GB opened on a visited city | "If I donate here, is the position at a profit, break-even, or a net loss?" | `calculator.js` (donor table)               |

Both are the same FH button, toggled by hand or by switching GB view self↔other.

---

## 2. Shared quantities (used by both views)

| Term                             | Meaning                                                                                                  | Code symbol                  | Formula                                                                |
| :------------------------------- | :------------------------------------------------------------------------------------------------------- | :--------------------------- | :--------------------------------------------------------------------- |
| **base reward**                  | server FP reward for a rank                                                                              | `baseReward`                 | `reward.strategy_point_amount`                                         |
| **gross reward**                 | Arc-boosted payout you receive (the break-even value)                                                    | `donorReward` / `rewardFP`   | `base × (1 + Arc/100)`                                                 |
| **lock (cost basis)**            | FP needed so nobody can overtake; **this is the cost NET is measured against**                           | `spotLock` / `donorRankCost` | `((remaining − occupant) / 2) + occupant ≡ (remaining + occupant) / 2` |
| **deposit** (suggested donation) | the friendly rate (1.9×) — used **only** for the "Add X FP to make safe for 1.9" line, **never** for NET | `costs` / `donateCustom`     | `base × (rate/100)`, rate default 190                                  |
| **remaining**                    | FP still needed to level the GB                                                                          | `remaining`                  | `total − current`                                                      |
| **NET**                          | donor's net vs break-even                                                                                | `net` / `donorProfit`        | `gross reward − lock`; `0` = break-even                                |

Lock in plain terms: `R = Total − Invested`, `X = occupant of the spot`, then
`lock = ((R − X) / 2) + X`. Grouping matters — `(R − X)` first, then `/ 2`, then
`+ X`; that equals `(R + X) / 2`. `R − X/2 + X` (= `R + X/2`) is wrong.

> `NET` is measured against the **lock** (break-even = lock equals the Arc
> reward). The 1.9× **deposit** is never a NET cost; it only feeds the
> "Add X FP to make safe for 1.9" line.

---

## 3. Own GB view (host perspective)

| Term                       | Meaning                                                                                        | Code symbol           | FH name        |
| :------------------------- | :--------------------------------------------------------------------------------------------- | :-------------------- | :------------- |
| **Own FP**                 | FP the host adds to secure a position for a supporter                                          | `ownerAdd` / `lockFP` | `Eigens`       |
| **secured position**       | a position no rival can overtake (`occupant ≥ remaining`)                                      | `isSafe`              | (taken)        |
| **safePlaces**             | leading positions that need **zero** host top-up                                               | `getSafePlaces()`     | `SafePlaces`   |
| **levels** (level warning) | the payment/host-add would level the GB                                                        | `levelWarning`        | `LeveltLG`     |
| **danger**                 | over-donation exposure: donating past the lock shrinks the pool and can expose lower positions | `danger`              | `DangerPlaces` |

Host goal: add `ownerAdd` until every intended donation lands in `safePlaces`.

---

## 4. Other-player view (donor perspective)

| Term                    | Rule                                                        | Colour |
| :---------------------- | :---------------------------------------------------------- | :----- |
| **profitable**          | `NET > 0`                                                   | green  |
| **safe** (break-even)   | `NET == 0` — show `0 NET`, never a loss                     | green  |
| **not safe = net loss** | `NET < 0` (the lock exceeds the gross reward)               | red    |
| **not possible**        | position already held beyond reach (`occupant ≥ remaining`) | n/a    |

Do **not** introduce a separate "not safe" meaning on top of net loss — in the
donor view **not safe == net loss**.

Donor goal: only donate where `NET ≥ 0`.

---

## 5. Colour rule (single source)

- **green** → profitable (`NET > 0`) **or** safe (`NET == 0`)
- **red** → not safe, i.e. **net loss** (`NET < 0`)

---

## 6. Worked examples (captured payloads, Arc 100%, rate 1.9)

`NET = gross reward − lock`.

### Cosmic Catalyst P3 (`total 48328 / current 47470`, occupant 130, base 260)

- gross `520`, lock `494` → **NET +26 → profit / green**

### Statue of Zeus P2 (occupant 1480, base 740)

- gross `1480`, lock `1480` → **NET 0 → safe / green / `0 NET`** (old panel wrongly showed `Loss: 74`)

### Statue of Zeus P3 (occupant 0, base 245)

- gross `490`, lock `740` → **NET −250 → not safe / red / loss 250**

### Statue of Zeus P1 (occupant 2960, base 1480)

- gross `2960`, lock `2220` → **NET +740 → profit**
- not shown: `lock 2220 > remaining 1480`, so the cascade skips it

### The Blue Galaxy P3 (occupant 620, base 310)

- gross `620`, lock `620` → **NET 0 → safe / green** (the "bakiron can't be passed" case)

### The Blue Galaxy P4 (occupant 0, base 80)

- gross `160`, lock `310` → **NET −150 → not safe / red / loss 150** (the spot the cascade shows)

### Cosmic Catalyst P3 (host view)

- ownerAdd `0` → already in `safePlaces`; no host action needed.

---

## 7. Implementation status

1. **Done**: cascade selection = first position with `lock < remaining`; verdict =
   `gross − lock` with `0` → safe/green; owner add exact (`ceil(R+X−2·dep)`).
2. **Pending**: donor state machine (`NOT_POSSIBLE`, `LEVEL_WARNING`,
   `WORSE_PROFIT`) and the other-player `+/-` column.
3. **Pending**: own-view routing directly through `calculateSafeSpots` +
   `getSafePlaces`.
