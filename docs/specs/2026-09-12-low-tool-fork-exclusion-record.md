# LoW-Tool Fork Lineage & Exclusion Record

**Date**: 2026-09-12
**Status**: Archived decision record (Roadmap D3g). LoW-Tool's `src/extras/`
overlay is **intentionally excluded** from FoE-Info for security, privacy, and
licensing reasons. Nothing here is a restoration backlog.
**Sources**: `../LoW-Tool/CLAUDE.md`, `../LoW-Tool/src/extras/`,
`../LoW-Tool/src/js/msg/GreatBuildingsService.js`; comparative dossier
`../LoW-Tool/graphify-out/findings/2026-09-12-low-tool-comparison.md` (git-ignored
sibling copy). No LoW-Tool source was modified.

---

## 1. Provenance model (correcting the original premise)

The execution plan that spawned this work called LoW-Tool "the original
closed-source implementation" and "the source of removed FoE-Info features."
That framing is **incorrect**:

- `LoW-Tool/CLAUDE.md:7` states LoW-Tool "is a variant/fork of the FoE-Info
  extension, adding an `extras` layer on top of the base extension code."
- The peer keeps **two source trees**: `src/js/` (the shared FoE-Info base) and
  `src/extras/` (a private overlay). The production build uses only
  `src/extras/index.js` as the `app` entry (`CLAUDE.md:31`).

**Correct model:** FoE-Info is the shared base; LoW-Tool is a downstream fork
that _adds_ an overlay. The "stripped features" are therefore the overlay that
was **never part of the open-source tree**, not features deleted from FoE-Info.
Confidence: HIGH.

---

## 2. Intentionally excluded artifacts

The `src/extras/` overlay bundles compliance-hostile material. None of it may be
ported, restored, or referenced by value:

1. **Hardcoded Discord webhooks** — multiple literal webhook URLs in
   `src/extras/fn/post_extras.js`. Committing or propagating these leaks private
   server endpoints. (Values deliberately not reproduced here.)
2. **Embedded shared Google Apps Script key** — a single API `key` literal reused
   across the extras posting routines in `post_extras.js`. A shared credential
   cannot be shipped to users.
3. **Per-world player-ID allowlists** — `src/extras/fn/users.js` hardcodes
   `snipeClubUsers`/`usersENSnipe`/`usersENPlunder`/`usersGC*`/`usersGBG` and
   gates features on `GameOrigin.substr(0, 2)` + `MyInfo.id`. World-specific,
   non-portable, and a privacy exposure.
4. **Debug leakage** — `users.js` logs player state via ungated `console.log`,
   violating the Debuggability-by-Design invariant.
5. **DOM-scraping post logic** — the extras scrape panel DOM and POST to the
   hardcoded endpoints, bypassing the sanitized posting primitive.
6. **GvG / `ClanBattleService`** — GvG is retired by the game; restoring it would
   be dead code. Confidence: MEDIUM (retirement date not re-verified here).

These violate, at minimum, the security-permissions invariant, the no-static
metadata/privacy boundary, and the debug-logging invariant. Restoration is
**denied by policy**, not deferred.

---

## 3. Features that were never in LoW-Tool (host-only)

Do not treat these as "lost LoW-Tool features" to recover — they are FoE-Info
additions with no peer equivalent:

- **Antique Dealer valuation** — `ItemExchangeService` (slot unlocks, output
  modifiers, exchange times). LoW-Tool has no equivalent.
- **Cultural Settlements** — `OutpostService` (Settlement model, goods map,
  advancements, remaining costs). LoW-Tool only ships `clearCultural()` /
  `fCollapseCultural()` stubs.
- **Blue Galaxy** modularized (`BlueGalaxyCalculator` + `BlueGalaxyState` +
  `renderGalaxyPanel`), pure `src/js/calc/` layer, and the `node:test` suite —
  LoW-Tool has **no `calc/` directory and no tests**.

---

## 4. Formula lineage note

The BigNumber hybrid is **not** a FoE-Info invention: LoW-Tool's
`getPlaceValues` already used `dp(0, 2)` (ROUND_CEIL) for locks and `dp(0)`
(HALF_UP) for rewards. FoE-Info preserved the hybrid and **improved** the
owner-safe-add to the direct-remainder form `max(0, ceil(rem + spot − 2·donate))`,
avoiding the odd-remainder doubling overcharge. This is a deliberate behavioral
change, pinned by `tests/math/gb-four-implementation-parity.test.mjs` and the
`bignumber-precision` rule — see
[`gb-historical-behavior-baseline.md`](2026-09-12-gb-historical-behavior-baseline.md).

---

## 5. Safe restoration candidate (capability only)

The overlay's only defensible capability is **scheduled/targeted donor-snipe
coordination posting**. FoE-Info already owns the sanitized primitive
(`src/js/fn/post.js`: `postToDiscord`, `sanitizeDiscordText`, reading a
user-configured `url.discordTargetURL`). Any future work must build on that
primitive with **user-supplied endpoints only**, never ported constants, and
must land in `src/js/calc/` (pure) + `src/js/ui/` with `node:test` coverage.
This is a scoped candidate, not an approved plan.

---

## 6. Decision

- Mark LoW-Tool as a **fork with a private overlay**, not the upstream original.
- Record the overlay as **excluded** for hardcoded-secret, allowlist, and
  privacy reasons.
- Keep the door open only for a generic, opt-in, user-configured coordination
  posting feature built on the existing sanitized primitive.

Confidence legend: HIGH = source-verified · MEDIUM = single-source/inferred ·
UNCERTAIN = inferred from identifiers only.
