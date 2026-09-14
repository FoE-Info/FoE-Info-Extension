# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## Todos

- [ ] Agent framework: introduce task-scoped MCP profiles.
  - Keep only `graphify-foe-info` enabled for ordinary development.
  - Enable Chrome DevTools, GitHub, Linux, metadata, baseline, and competitor MCPs only for matching tasks.
  - Evaluate one Graphify multiplexer to replace five copies of the same ten-tool schema.
- [ ] Agent framework: reduce OpenCode always-injected instructions.
  - Inject only the nine canonical `always_on` rules.
  - Add a compact router that loads scoped rules by trigger.
  - Replace duplicated guardrail/tool-translation prose with pointers to the shared harness adapter.
- [ ] Agent framework: slim startup context and remove stale coordination history.
  - Stop requiring `docs/HANDOFF.md` on every session; load it only when resuming a named thread.
  - Keep `AGENTS.md`, `docs/README.md`, `docs/STATUS.md`, `docs/HANDOFF.md`, `docs/COORDINATION.md`, and `docs/OPENCODE.md` current-state-only.
  - Delete completed plans, superseded audits, resolved questionnaires, and removal narration; Git history remains the backup.
- [ ] Agent framework: deduplicate self-improvement instructions.
  - Replace 91 repeated logging blocks with one compact shared invariant/reference.
  - Replace 55 identical `references/skill-memory.md` copies with one canonical reference.
- [ ] Agent framework: remove stale manual catalogs and count-locked tests.
  - Delete or generate `docs/SKILLS.md` and `docs/SUBAGENTS.md` from actual frontmatter/routing data.
  - Replace exact 56-skill/36-agent/17-rule assertions with discovery, parity, uniqueness, routing, and required-core invariants.
  - Correct stale framework counts and paths in remaining current-state docs.
- [ ] Agent framework: compress and consolidate overlapping skills.
  - Remove `using-superpowers` duplication with the always-on rule and reduce `verification-before-completion` duplication.
  - Consider merging `chrome-devtools-troubleshooting` into `chrome-devtools`, `service-extractor` with `refactor-index-slice`, and release/changelog workflows.
  - Shrink frequently loaded large skills via progressive disclosure; keep all `writing-*` skills separate and leave `chrome-extensions` untouched.
- [ ] Agent framework: consolidate overlapping subagents and OpenCode shims.
  - Merge the four near-identical graph explorers into one target-driven role.
  - Merge the three extension comparators into one target-driven role.
  - Reduce each OpenCode shim to frontmatter plus a canonical-role pointer; defer broader FoE specialist consolidation until dispatch usage is measured.
- [ ] Modern-web Tier 3 (deferred, higher risk): migrate Bootstrap popovers/collapse to native `popover` + CSS Anchor Positioning, adopt `light-dark()`/`[data-bs-theme]` theming, and evaluate opt-in Built-in AI/WebMCP enhancements.
- [ ] Modern-web deferred items: `content-visibility` on measured card bodies (no safe stable selector yet), `MessageDispatcher` parse yielding, and residual table semantics. `renderBattlegroundsPanel.js` already has `<caption>`/`scope="col"`; the `renderInvestedPanel.js` table is a commented-out future feature.
- [ ] Graph-explorer follow-up (2026-09-12), full ranked backlog in [`docs/plans/2026-09-12-post-f2-refactor-backlog.md`](plans/2026-09-12-post-f2-refactor-backlog.md):
  - Review the 4 lazy `resolveDep` `ui/ → msg/` fallbacks in `ui/indexUiBindings.js` (F3 left them, injectable from `index.js`).

## Open threads requiring a decision

- `graphify-out/foe-info/obsidian/` and `wiki/` markdown exports: git-ignored generated artifacts from the graphify knowledge graphs, retained locally.
