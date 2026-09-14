# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## Todos

- [ ] Modern-web Tier 3 (deferred, higher risk): migrate Bootstrap popovers/collapse to native `popover` + CSS Anchor Positioning, adopt `light-dark()`/`[data-bs-theme]` theming, and evaluate opt-in Built-in AI/WebMCP enhancements.
- [ ] Modern-web deferred items: `content-visibility` on measured card bodies (no safe stable selector yet), `MessageDispatcher` parse yielding, and residual table semantics. `renderBattlegroundsPanel.js` already has `<caption>`/`scope="col"`; the `renderInvestedPanel.js` table is a commented-out future feature.
- [ ] Graph-explorer follow-ups (2026-09-12), full ranked backlog in [`docs/plans/2026-09-12-post-f2-refactor-backlog.md`](plans/2026-09-12-post-f2-refactor-backlog.md):
  - Review the 4 lazy `resolveDep` `ui/ → msg/` fallbacks in `ui/indexUiBindings.js` (F3 left them, injectable from `index.js`).
  - Decide the fate of `ui/cityStatsHtmlBuilder.js` (production orphan).

## Open threads requiring a decision

- `graphify-out/foe-info/obsidian/` and `wiki/` markdown exports: git-ignored generated artifacts from the graphify knowledge graphs, retained locally.
