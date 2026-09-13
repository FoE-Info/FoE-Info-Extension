# Agentic Harness Review — Findings & Decisions

**Date:** 2026-09-13 · **Based on:** Antigravity CLI history (1,745 entries), conversation DBs (96 + summaries), `.agents/` harness, global `~/.gemini/config/`, `llama-swap` config.

---

## 1. MCP Configuration & Scope

### 1.1 Global vs local MCP ownership ✓ RESOLVED

- `~/.gemini/config/mcp_config.json` is **empty (0 bytes)** — confirmed.
- All 9 MCP servers live in `.agents/mcp_config.json`: `chrome-devtools`, `graphify-foe-info`, `graphify-forge-hammer`, `graphify-foe-info-original`, `graphify-low-tool`, `graphify-metadata-store`, `github-mcp`, `linux-tools`.
- **Decision:** Keep MCP strictly project-scoped. The global `config.json` `globalPermissionGrants.allow` list contains 50 `mcp(graphify-...)` grants and ~15 `unsandboxed(python3 -c "...")` inline CDP scripts — these are dead weight outside the workspace and should be trimmed to the minimum needed for the CLI to function in any workspace.

**Action item:** Audit `globalPermissionGrants.allow` — remove the 15 inline `unsandboxed(python3 -c ...)` CDP scripts (they're one-off ad-hoc commands, not hooks). Keep only the `mcp(graphify-...)` and `mcp(chrome-devtools/...)` grants that are actually exercised. Consider whether the per-tool `mcp(chrome-devtools/click)`, `mcp(chrome-devtools/fill)`, etc. are redundant given the `chrome-devtools` plugin grant.

### 1.2 `graphify` vs `graphify-foe-info` naming ✓ RESOLVED

- **No standalone `graphify` server exists.** The `.agents/mcp_config.json` has 6 graphify servers, all properly named (`graphify-foe-info`, `graphify-forge-hammer`, `graphify-foe-info-original`, `graphify-low-tool`, `graphify-metadata-store`).
- The global `config.json` permissions list `mcp(graphify-foe-info/...)` (line 120) — no bare `mcp(graphify/...)` grant exists.
- **The historical confusion** (user asking "why do I see `graphify` as a separate MCP?") was transient — it stemmed from stale `~/.gemini/antigravity-cli/mcp/` schema caches, not from an actual duplicate server.

**Action item:** Purge stale schema caches in `~/.gemini/antigravity-cli/mcp/` if any remain referencing a bare `graphify` server.

### 1.3 Permission grant bloat ✓ IDENTIFIED

The global `config.json` `globalPermissionGrants.allow` list is 175 entries — mostly individual `mcp(chrome-devtools/...)` tool grants + 15 `unsandboxed(python3 -c "...")` inline CDP scripts. The plugin-based chrome-devtools MCP likely grants blanket tool access, making the per-tool grants redundant. The inline Python CDP scripts are legacy one-offs.

**Action item:** Trim global grants. See Q1.1 above.

---

## 2. Skills & Subagents

### 2.1 Plugin-shadow-copy parity ✓ MOSTLY RESOLVED

- **Enabled plugins** (from `config.json`): `chrome-devtools-plugin: enabled`, `modern-web-guidance-plugin: enabled`, `google-antigravity-sdk: enabled`. `gemini-api: disabled`.
- `.agents/skills/` has shadow-copies: `chrome-devtools/`, `chrome-extensions/`, `debug-optimize-lcp/`, `a11y-debugging/`, `modern-web-guidance/`, `browser-testing/`, plus `superpowers`-related skills (`using-superpowers/`, `writing-agents/`, etc.).
- **56 skills** total (up from 55 in AGENTS.md — one new skill added since the doc was written).
- **36 subagents** — matches AGENTS.md.
- **17 rules** — matches AGENTS.md.

**Open:** The user's intent was to disable all plugins and achieve 100% local parity. Currently `chrome-devtools-plugin` and `modern-web-guidance-plugin` are still enabled. Need user confirmation: are these still wanted as plugins, or should they be disabled with full reliance on local skill copies?

### 2.2 Deprecated workflows → skills migration ✓ DONE

- `.agents/workflows/` directory **does not exist** — confirmed absent.
- The 8 workflows identified in history (line 546) have been migrated to skills or removed.
- **Verification:** Skills like `add-rpc-service/`, `add-feature-panel/`, `audit-memory-leaks/`, `package-release/`, `refactor-index-slice/`, `test-panel/` (now `browser-testing/`?), `update-metadata-graph/` (now `ingest-game-metadata/`?) exist as SKILL.md-based skills.

### 2.3 Subagent dispatch automation ⚠ PARTIALLY ADDRESSED

- The `subagent-delegation` rule is `always_on` and mandates "Role Match Check (Delegation First)".
- **History evidence:** The agent frequently falls back to manual `grep_search`/`view_file` instead of dispatching subagents, even when the task clearly fits (e.g. "audit the CSS", "explore the Forge-Hammer graph").
- **Root cause hypothesis:** The agent doesn't automatically know which subagent fits which task — it needs either an explicit user instruction ("use css-expert") or a strong enough match in its reasoning. The rule says "check whether the task fits" but doesn't provide a decision table mapping task types → subagent names.
- **Decision:** The harness is configured correctly; the gap is in agent behavior, not configuration. Consider adding a **subagent dispatch decision table** to `superpowers.md` or `subagent-delegation.md` that lists: "If task involves X → dispatch Y subagent."

---

## 3. Graphify & Local AI Backend

### 3.1 llama-swap lifecycle integration ⚠ INCONSISTENT

- **Update scripts do NOT source llama-swap** (confirmed: `graph-foe-info-update.sh`, `graph-forge-hammer-update.sh`, `graph-metadata-update.sh`, `graph-low-tool-update.sh`, `graph-foe-info-original-update.sh` all have 0 llama-swap references).
- **Reindex scripts DO source llama-swap** (confirmed: all 5 `graph-*-reindex.sh` scripts reference `llama-swap-lifecycle.sh`).
- **User intent** (history line 635-641): every graphify script should auto-launch llama-swap if port 8080 is idle, run graphify, then unload and stop.

**This is a real gap.** The `update` scripts run AST extraction (no LLM) + doc exports (which DO need the LLM for semantic extraction). If port 8080 is idle when an update script runs the export phase, the exports will fail or fall back to no-LLM mode.

**Action item:** Make all `graph-*-update.sh` scripts source `llama-swap-lifecycle.sh` (or `run-with-llama-swap.sh`) so the LLM backend is guaranteed available during the export phase. The `update` scripts currently only do AST + export — the export step needs the LLM.

### 3.2 Qwen2.5-VL-7B as graphify backend ✓ FIXED

- `llama-swap` config (`~/.config/llama-swap/config.yaml`) for `Qwen/Qwen2.5-VL-7B-Instruct`:
  ```
  cmd: llama-server ... --temp 0 --reasoning-format none --parallel 1 -ngl 99 --flash-attn on
  ```
- **`--reasoning-format none`** — this is the fix. The historical problem was `--reasoning-budget 0` which triggered DeepSeek-style reasoning parsing. Now it's explicitly `none`.
- The model is `unsloth/Qwen2.5-VL-7B-Instruct-Q8_0.gguf` with mmproj — correct for a vision-language model.

**Status:** Resolved. Hollow responses should no longer occur from reasoning-parsing mismatch. However, hollow responses can still occur from other causes (model overload, context truncation) — the graphify retry logic handles some of these.

### 3.3 Graph isolation ✓ RESOLVED

- `graphify-out/` contains only `foe-info/graph.json` — **no symlinks** found.
- The AGENTS.md mentions `metadata symlink -> ../metadata-store/graphify-out` — but this is the **metadata-store sibling repo's** graphify-out, not a symlink inside this repo's `graphify-out/`. The actual `graphify-out/` in this repo is isolated.
- **6 graphify MCP servers** serve 6 independent graphs from 6 independent paths — no collisions.

**Status:** Clean. No action needed.

---

## 4. Browser Automation & CDP

### 4.1 `foe-browser` behavior ⚠ NEEDS LIVE VERIFICATION

**Cannot verify from static config alone.** The `foe-browser` script is at `~/.local/bin/foe-browser` (outside the repo). Its behavior depends on the script's current implementation, which has been modified multiple times in the history.

**User requirements (from history):**

- Take over existing en7.forgeofempires.com tab if present (not open duplicate that kicks user out).
- Open DevTools only on the game tab, not on every new tab.
- Open `chrome://extensions/`.
- Load FoE-Info panel automatically.

**Action item:** Launch `foe-browser` and verify behavior against the user's requirements. This is a live browser test — cannot be done from config inspection.

### 4.2 Browser-environment-hygiene vs practical reloads ⚠ DESIGN TENSION

- The `browser-environment-hygiene` rule (always_on) prohibits autonomous reloads.
- **Practical workflow:** rebuild → reload game (F5) → inspect panel. The user explicitly wants to control the F5, but the agent needs to know that after a rebuild, the game needs a reload to pick up fresh `StartupService.getData`.

**Current behavior:** Unknown from static config. The `foe-browser --reload` CLI command exists as an explicit exemption.

**Decision:** The rule is correct as-is — the agent should rebuild, then prompt the user to reload (or offer `foe-browser --reload` as an explicit action). The tension is in agent behavior: does the agent wait for the user, or does it try to auto-reload via CDP (violating the rule)?

### 4.3 Bitwarden vs FoE-Info memory attribution ✓ UNRESOLVED

- The history shows the agent attributing a memory/CPU issue to Bitwarden after the user uninstalled it to test — the user disputes this conclusion.
- **No conclusive investigation** was completed. The issue may be unresolved or may have been caused by a different factor (metadata processing load, duplicate tab behavior, etc.).

**Status:** Open. No action unless the user wants to re-investigate.

---

## 5. Rules & Configuration Hygiene

### 5.1 Rule trigger audit ✓ DOCUMENTED

| Rule                                | Current Trigger | Assessment                                                                                                |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `superpowers.md`                    | always_on       | Correct — proactive skill-first loop                                                                      |
| `verification-before-completion.md` | always_on       | Correct — must fire every turn                                                                            |
| `small-incremental-changes.md`      | always_on       | Correct — surgical edits                                                                                  |
| `subagent-delegation.md`            | always_on       | Correct — delegation check every turn                                                                     |
| `graphify.md`                       | always_on       | Correct — query-first protocol                                                                            |
| `modular-architecture.md`           | always_on       | **Debatable** — this is about folder structure, may not need every-turn firing                            |
| `scope-control.md`                  | always_on       | Correct — prevent scope creep                                                                             |
| `browser-environment-hygiene.md`    | always_on       | Correct — zero autonomous browser control                                                                 |
| `monolith-containment.md`           | model_decision  | **Debatable** — user wants always_on; fires only when modifying index.js/StartupService.js, which is rare |
| `workspace-structure.md`            | model_decision  | **Debatable** — user wants always_on; fires on workspace decisions                                        |
| `dynamic-runtime-metadata.md`       | model_decision  | Probably correct — metadata decisions are situational                                                     |
| `bignumber-precision.md`            | model_decision  | Probably correct — only matters when doing calculations                                                   |
| `i18n-compliance.md`                | model_decision  | Probably correct — only matters when touching i18n                                                        |
| `security-permissions.md`           | model_decision  | Probably correct — permission decisions are situational                                                   |
| `release-policy.md`                 | model_decision  | Correct — only matters at release time                                                                    |
| `debuggability-by-design.md`        | model_decision  | Probably correct — only matters when extracting modules                                                   |
| `unslop-commit.md`                  | model_decision  | **Debatable** — user wants always_on; fires on commit decisions                                           |

**Key tension:** The user wants `monolith-containment`, `workspace-structure`, and `unslop-commit` to be `always_on`. The current `model_decision` trigger means these rules only fire when the model decides they're relevant — which may be never if the model doesn't recognize the situation.

**Decision:** For `monolith-containment` and `workspace-structure`, `always_on` would add token overhead on every turn for rules that only apply in specific situations. The `model_decision` trigger is arguably correct — but the model needs to recognize the trigger conditions. Consider adding explicit trigger conditions to the rule frontmatter (e.g. `trigger: model_decision` + `when: "modifying src/js/index.js or StartupService.js"`).

### 5.2 AGENTS.md overlap with rules ⚠ REDUNDANT

- AGENTS.md Section 4 lists all 17 rules by name with a one-line description each.
- The rules are also injected individually from `.agents/rules/*.md` (17 separate files).
- **This is pure token duplication.** The AGENTS.md summary adds ~500 tokens per turn that duplicate content already loaded from the individual rule files.

**Decision:** Consider trimming AGENTS.md Section 4 to a one-line pointer ("See `.agents/rules/` for 17 always_on and model_decision rules") instead of listing all 17 with descriptions. The individual rule files are the source of truth.

### 5.3 `.vscode` recurrence ✓ RESOLVED

- `.vscode/` is **not present** in the repository — confirmed.
- The `workspace-structure` rule explicitly prohibits it.
- The historical recurrence (3x) was agent behavior, not a config trigger. No skill/hook currently references `.vscode`.

**Status:** Clean. No action needed unless it recurs.

### 5.4 `.gitignore` / `.graphifyignore` sync ✓ MOSTLY CONSISTENT

- `.gitignore` ignores: `graphify-out/`, `.worktrees/`, `worktrees/`, `.superpowers/`, `node_modules/`, `build/`, `dist/`, `*.map`, `*.min.js`, `*.min.css`.
- `.graphifyignore` ignores: `.agents/`, `AGENTS.md`, `.gemini/`, `.superpowers/`, `tests/`, `graphify-out/`, `metadata-store/`, `offline-metadata/`, `.worktrees/`, `worktrees/`, `node_modules/`, `stuff/`, `vendor/`, `package-lock.json`, `build/`, `dist/`, `*.map`, `*.min.js`, `*.min.css`.
- **Difference:** `.graphifyignore` has `.agents/`, `AGENTS.md`, `.gemini/`, `tests/`, `metadata-store/`, `offline-metadata/`, `stuff/`, `vendor/` — these are graphify-specific ignores that don't need to be in `.gitignore` (they're not committed anyway).
- **No conflicts.** Paths ignored by one are either also ignored by the other or don't need to be in the other.

**Status:** Clean. No action needed.

---

## 6. Commit History & Artifact Cleanup

### 6.1 Soft-reset & unslop-commit ⚠ STATE UNKNOWN

- Cannot determine current git state from static inspection — need `git log` to see if the commit history is clean or if another soft-reset is pending.
- The user's workflow: `git reset --soft 8c681d1` → `/unslop-commit` → logical commits.

**Action item:** Check `git log --oneline` to assess current commit history quality.

### 6.2 `docs/completed-work` artifacts ✓ EMPTY

- `docs/completed-work/` directory **does not exist** or is empty — confirmed (no files listed).
- No stale artifacts to prune.

**Status:** Clean.

---

## 7. Scripts & Runners Audit

### 7.1 Graph runners — complete and consistent ✓ GOOD

All 6 graphs have matching runner triplets:

- `graph:<name>:ast` — bash script
- `graph:<name>:reindex` — bash script (sources llama-swap)
- `graph:<name>:update` — bash script (does NOT source llama-swap — gap identified in §3.1)
- `graph:<name>:export` — inline command

Plus `graph:foe-info:watch` and `graph:foe-info-original:*` runners for the original snapshot.

### 7.2 `scripts/` directory ✓ CLEAN

Contains: `audit-i18n.mjs`, `build-metadata-graph.mjs`, `collect-visits.mjs`, `download-offline-metadata.mjs`, `ingest-hars-to-metadata.mjs`, `package-extension.js`, `query-metadata-store.mjs`, `release.mjs`, `rpc-contract.mjs`, `sanitize-skill.mjs`, `validate-commit-msg.mjs`. All seem relevant.

### 7.3 Ephemeral llama-swap skill ✓ EXISTS

The `ephemeral-llama-swap/` skill exists in `.agents/skills/` — this is the skill that auto-launches llama-swap when nothing is serving on port 8080. The intent was that graphify scripts/skills would use this. Confirm whether the update scripts actually invoke this skill or if they bypass it.

---

## 8. Open Items Summary

| #   | Item                                                                                                                                          | Priority | Action                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| 1   | Trim `globalPermissionGrants.allow` — remove 15 inline CDP scripts, consolidate chrome-devtools tool grants                                   | Medium   | Edit `~/.gemini/config/config.json` |
| 2   | Make all `graph-*-update.sh` scripts source llama-swap lifecycle                                                                              | **High** | Patch 5 update scripts              |
| 3   | Verify `chrome-devtools-plugin` and `modern-web-guidance-plugin` should remain enabled, or disable for local-skill parity                     | Medium   | User decision                       |
| 4   | Add subagent dispatch decision table to `superpowers.md` or `subagent-delegation.md`                                                          | Medium   | Patch rule file                     |
| 5   | Consider trimming AGENTS.md Section 4 rule summary to reduce token duplication                                                                | Low      | Edit AGENTS.md                      |
| 6   | Consider `model_decision` → `always_on` for `monolith-containment`, `workspace-structure`, `unslop-commit` (with explicit trigger conditions) | Low      | User decision                       |
| 7   | Check `git log` for commit history quality                                                                                                    | Low      | Run git log                         |
| 8   | Purge stale `~/.gemini/antigravity-cli/mcp/` schema caches if any reference bare `graphify`                                                   | Low      | Inspect and clean                   |
| 9   | Verify `ephemeral-llama-swap` skill is actually invoked by graphify scripts                                                                   | Medium   | Inspect script invocations          |
| 10  | Live browser test: verify `foe-browser` behavior (tab reuse, DevTools-on-game-only, extensions page)                                          | **High** | Launch foe-browser and inspect      |
| 11  | Confirm `metadata-store` graphify-out symlink intent (AGENTS.md says symlink → `../metadata-store/graphify-out`)                              | Low      | Verify actual state                 |

---

## What was learned from the Antigravity CLI conversation DBs

1. **The conversation_summaries.db** (47 rows) tracks high-level metadata: conversation ID, title, step count, last modified time, workspace URI, status, source, agent name, nesting depth, battle ID, group ID. Most recent conversations are all `CASCADE_RUN_STATUS_IDLE` with `source=0` (antigravity-cli) or `source=antigravity`. The titles reveal the workflow: "Workflow Migration Guide", "Agent Orchestration Improvement", "Working With Git Worktrees", "Agent Configuration Code Review", "Clean Up Stale References", "List Workspace Rules".

2. **The per-conversation .db files** (96 files, 49KB–10MB each) store the full trajectory: `steps` table (idx, step_type, status, metadata BLOB, step_payload BLOB), `trajectory_meta`, `gen_metadata`, `executor_metadata`, `parent_references`. Step types include 15 (= user message), 132 (= tool call), and others. The metadata blobs are protobuf-serialized — not directly readable as text.

3. **The history.jsonl** (1,745 lines, 631KB) is the most informative — it's a line-delimited JSON log of every slash command and user message with timestamp, workspace, conversationId, and display text. This is what we scanned for the review.

4. **The brain/ directory** (47 subdirectories matching the 47 summaries) contains `.system_generated/logs/transcript.jsonl` and chunked transcript files — the full conversation transcripts.

5. **Key patterns from history:**
   - Repeated migration confusion: `.claude/` → Antigravity 2.0 → Antigravity-CLI, with skills/workflows/plugins being reshuffled multiple times.
   - MCP config thrashing: global vs local, server naming, stale caches.
   - Graphify debugging: llama-swap lifecycle, hollow responses, model config mismatches.
   - Subagent underutilization: user repeatedly asking why specialists weren't dispatched.
   - Browser automation friction: duplicate tabs, DevTools-on-every-tab, FoE-Info not auto-loading.
   - Commit hygiene: soft-resets, unslop-commit, artifact export, .vscode recurrence.

---

## What was learned from `~/.gemini/config/`

1. **`config.json`** is the global Antigravity CLI settings file — plugins, permission grants, auto-execution policy, theme. The `globalPermissionGrants.allow` list is the bloat source.
2. **`mcp_config.json`** is empty (0 bytes) — all MCP servers are project-local.
3. **`skills.json`** has an empty `entries` array — no global skill overrides.
4. **`config/projects/default-cli-project.json`** points to the FoE-Info-Extension workspace with `sandboxMode: false` and `autoExecutionPolicy: CASCADE_COMMANDS_AUTO_EXECUTION_EAGER`.
5. **`plugins`** in `config.json`: `chrome-devtools-plugin` and `modern-web-guidance-plugin` enabled; `gemini-api` disabled; `google-antigravity-sdk` enabled.
