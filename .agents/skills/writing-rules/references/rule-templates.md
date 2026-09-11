# Antigravity Rule Templates

Templates for authoring high-leverage workspace rules.

---

## Template: Architecture Invariant (`always_on`)

```markdown
---
trigger: always_on
description: Enforces strict modular boundaries and file length limits across src/.
---

# Rule: Modular Architecture & File Boundaries

All new or modified files in `src/` must adhere to modular responsibility boundaries.

## Invariants

1. **Line Limit**: No file in `src/` may exceed 250 lines.
2. **Placement**:
   - `src/js/calc/`: Pure mathematical engines only (zero DOM references).
   - `src/js/ui/`: DOM rendering, templates, event listeners.
   - `src/js/msg/`: InnoGames JSON-RPC service handlers.
3. **No Monolith Growth**: Never add inline feature logic to legacy orchestrators (`index.js`).
```

---

## Template: Scoped Glob Rule (`glob`)

```markdown
---
trigger: glob
glob: "src/js/calc/**"
description: Mandates BigNumber precision for Great Building arithmetic.
---

# Rule: BigNumber Arithmetic Precision

In Forge of Empires, Great Building rewards and Arc boosts exceed standard JS floating point limits.

## Invariants

- Always import and use `bignumber.js`.
- Use ceiling rounding (`BigNumber.ROUND_CEIL`) for 1.9x Arc investment boosts.
- Convert to `.toNumber()` only at the final display rendering boundary.
```
