# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `AGENTS.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## Todos

- [x] Modern-web Tier 3 (Popovers & Tooltips): migrated `PopoverManager.js` to native HTML Popover API with CSS Anchor Positioning (`position-anchor`, `position-area: bottom span-all`) and smooth `@starting-style` transitions.
- [x] Modern-web Tier 3 (Collapses & Theming): migrated Bootstrap collapse to native CSS Grid 0fr/1fr transitions with lifecycle event dispatching and height preservation (`.foe-resizable` support). Evaluated Bootstrap 5.3 `[data-bs-theme]` and rejected it to preserve FoE-Info's signature dark backdrop with pastel alert card palette.
- [ ] Modern-web Tier 3 (remaining): evaluate opt-in Built-in AI/WebMCP enhancements.
- [x] 500-Line Ratchet & Modular Decomposition: 100% complete! Cluster 1 (Slices 1A-1C) and Cluster 2 (Slices 2A-2C) finished. All 110+ JS files in src/js/ are strictly <= 500 lines (max 497 L). Hard cap officially ratcheted from 600 to 500 lines across AGENTS.md and .agents/rules/modular-architecture.md.
- [ ] Modern-web deferred items: `content-visibility` on measured card bodies (no safe stable selector yet), `MessageDispatcher` parse yielding, and residual table semantics. `renderBattlegroundsPanel.js` already has `<caption>`/`scope="col"`; the `renderInvestedPanel.js` table is a commented-out future feature.

## Open threads requiring a decision

- `graphify-out/foe-info/obsidian/` and `wiki/` markdown exports: git-ignored generated artifacts from the graphify knowledge graphs, retained locally.
