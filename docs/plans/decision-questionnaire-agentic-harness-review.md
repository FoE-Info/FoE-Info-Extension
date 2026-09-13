# Decision Questionnaire: Agentic Harness Review — FoE-Info Extension

**Purpose:** Surface the key unresolved tensions from the Antigravity CLI conversation history (1,745 entries, 47 conversation summaries, 96 conversation DBs) and the current `.agents/` harness so we can decide what to fix, what to leave, and what to automate.

**From:** Kronikpillow · **To:** Self (async review) · **How your answers will be used:** Feeds a cleanup/optimization pass on `.agents/`, `package.json`, `hooks.json`, and the global `~/.gemini/config/` setup.

---

## Context

The workspace runs a fully agentic Antigravity CLI harness (no IDE). The history log reveals a long migration from Claude-era `.claude/` config → Antigravity 2.0 → Antigravity-CLI, with repeated rounds of:

- **MCP config churn**: global `~/.gemini/config/mcp_config.json` (empty) vs local `.agents/mcp_config.json`; 10 graphify MCP servers declared in `config.json` permissions; `graphify`/`graphify-foe-info`/`graphify-forge-hammer`/`graphify-metadata-store` naming confusion.
- **Skill sprawl**: 55 skills, 36 subagents, 17 rules — several duplicates between plugin-shadow-copies and local `.agents/skills/`; workflows (`.agents/workflows/*.md`) deprecated in favor of skills.
- **Graphify debugging**: llama-swap lifecycle, hollow responses, `--reasoning-budget 0` on a non-reasoning model (Qwen2.5-VL-7B), `graphifyy[mcp]` not installed, scripts vs hooks environment setup.
- **Browser automation tension**: `foe-browser` launcher, CDP attachment, duplicate-tab/kick-out behavior, DevTools-on-every-tab bug, `browser-environment-hygiene` rule vs practical need to reload game and attach panel.
- **Subagent underutilization**: user repeatedly asking "why didn't you use subagent X" — several specialists exist but aren't dispatched automatically.
- **Commit hygiene**: repeated `/unslop-commit`, soft-reset to `8c681d1`, `docs/completed-work` artifact export, `.vscode` repeatedly restored then removed.
- **Rule trigger confusion**: user questioning why some rules are `model_decision` vs `always_on`.

---

## How to answer

Deadline: whenever you're ready. Partial answers and "I don't know" are useful — flag uncertainty rather than skipping.

---

## 1. MCP Configuration & Scope

### 1.1 Global vs local MCP ownership

Currently `~/.gemini/config/mcp_config.json` is **empty** (0 bytes), and all MCP server declarations live in the repo's `.agents/mcp_config.json` (7 graphify servers + chrome-devtools + github-mcp). The global `config.json` permissions block lists 10 `mcp(graphify-...)` grants plus `read_file(/var/home/kronikpillow/.local/bin/graphify)` and several `unsandboxed(...)` entries.

**Question:** Should the global MCP config be populated with the same 7 graphify servers so that conversations outside the workspace (e.g. in `~/Projects/Forge-Hammer` or `~/Projects/FoE-Info` without a local `.agents/mcp_config.json`) still have graph access? Or is the intent to keep MCP strictly project-scoped, meaning the global grants are dead weight and should be trimmed?

_Why this matters: The history shows repeated confusion where `/mcp` in a non-workspace chat only sees `graphify-forge-hammer` while the FoE-Info graph is invisible — this traces to which config file the CLI reads in that workspace._

### 1.2 `graphify` vs `graphify-foe-info` naming

The global permissions list a `graphify` MCP grant (line 120 of `config.json`) alongside `graphify-foe-info`, `graphify-forge-hammer`, `graphify-metadata-store`, `graphify-low-tool`, `graphify-foe-info-original`. The history shows the user explicitly asking "why do I still see `graphify` as a separate MCP server?" and "should we rename `graphify` to `graphify-foe-info`?".

**Question:** Is there still a standalone `graphify` server configured anywhere (global or local) that is a duplicate of `graphify-foe-info`? If so, which config file owns it, and should it be removed or renamed?

### 1.3 Permission grant bloat

The global `config.json` `globalPermissionGrants.allow` list is ~175 entries — mostly individual `mcp(chrome-devtools/...)`, `mcp(graphify-...)` tool grants, plus ~15 `unsandboxed(python3 -c "...")` entries containing inline CDP scripts (panel.html inspection, game page reload, metadata capture, etc.).

**Question:** Are all of these still needed, or can some be removed? Specifically:

- The inline `unsandboxed(python3 -c "...")` CDP scripts — are these exercised by hooks/scripts, or are they legacy one-off ad-hoc commands that are no longer used?
- The per-tool `mcp(chrome-devtools/...)` grants — does the `chrome-devtools` plugin grant a blanket permission that makes individual tool grants redundant?

---

## 2. Skills & Subagents

### 2.1 Plugin-shadow-copy parity

The user's intent (from history, line 427-435) is to **disable all plugins** and achieve **feature parity via local skills** in `.agents/skills/`. The `superpowers`, `modern-web-guidance`, and `chrome-devtools` plugins each have skill shadow-copies in `.agents/skills/`. The history shows the user asking "is the superpowers plugin now 100% parity with the local setup without the plugin?" and "did it also copy the mcp stuff?".

**Question:** Which plugins are currently **enabled** in `~/.gemini/config/config.json` `plugins`? (The file shows `chrome-devtools-plugin: enabled, gemini-api: disabled, google-antigravity-sdk: enabled, modern-web-guidance-plugin: enabled`.) Are any of the enabled plugins providing skills/rules that are also shadow-copied locally — and if so, is the local copy complete (including references, scripts, MCP config) or partial?

### 2.2 Deprecated workflows → skills migration

The `agy-customizations` review (history line 546) found 8 deprecated workflows under `.agents/workflows/*.md` that should be migrated to `.agents/skills/<name>/SKILL.md` with YAML frontmatter. The user approved the migration (line 547: "1. yes, 2. remove them once confirmed. 3 yes").

**Question:** Have these 8 workflows actually been migrated to skills, or do they still exist as flat `.md` files under `.agents/workflows/`? If migrated, are the old workflow files removed? If not, which ones are still pending?

### 2.3 Subagent dispatch automation

The user repeatedly asks why subagents aren't used automatically when they fit the task (history lines 857-862). The `subagent-delegation` rule mandates "Role Match Check (Delegation First)" but the history shows the main agent often doing manual file reads and grep searches instead of dispatching `css-expert`, `javascript-expert`, `graph-knowledge-explorer`, etc.

**Question:** When a task clearly fits a subagent (e.g. "audit the CSS", "explore the Forge-Hammer graph", "review the RPC handlers"), does the agent currently dispatch that subagent automatically, or does it fall back to manual exploration? If it falls back, is that because:

- The subagent's prompt/frontmatter isn't triggering a match?
- The agent doesn't know the subagent exists?
- There's no explicit user instruction to use subagents?

---

## 3. Graphify & Local AI Backend

### 3.1 llama-swap lifecycle integration

The user's intent (history line 635-641) is that **any graphify script/skill should auto-launch llama-swap if nothing is serving on port 8080**, run graphify, then unload the model and stop llama-swap. The `run-with-llama-swap.sh` / `llama-swap-lifecycle.sh` scripts exist for this.

**Question:** Do all graphify update/reindex scripts (`.agents/scripts/graph-*-update.sh`, `graph-*-reindex.sh`) currently source or call the llama-swap lifecycle wrapper? Or do some scripts bypass it and fail when port 8080 is idle (as happened in history line 720: "it says it can't find out script to launch llama-swap")?

### 3.2 Qwen2.5-VL-7B as graphify backend

The history shows graphify configured to use `qwen2.5-vl-7b` via llama-server with `--reasoning-budget 0`, which triggers DeepSeek-style reasoning parsing on a non-reasoning model, causing hollow responses (content=no nodes/edges). The user eventually accepted a fix.

**Question:** What is the current llama-swap model configuration in `~/.config/llama-swap/config.yaml`? Is `--reasoning-budget 0` still set on the model used for graphify semantic extraction? Has the hollow-response problem been resolved, or does it recur on some graphify runs?

### 3.3 Graph isolation

The user explicitly wants the 3 graphs (foe-info, forge-hammer, metadata) to be **independent** — no symlinks, no shared `graphify-out/graph.json`. The history shows repeated confusion about a symlinked `graphify-out/metadata/graph.json` pointing elsewhere (lines 704, 710-711).

**Question:** What is the current state of `graphify-out/`? Are there any symlinks between the subfolder graphs? Does each graph have its own isolated `graph.json`? Is the `metadata` symlink (mentioned in AGENTS.md: `metadata symlink -> ../metadata-store/graphify-out`) still present, and if so, does it violate the user's isolation intent?

---

## 4. Browser Automation & CDP

### 4.1 `foe-browser` tab/duplicate behavior

The user's stated requirement (history line 374, 452): `foe-browser` should **take over an existing en7.forgeofempires.com tab** if one exists (rather than opening a new one that gets the user kicked out of the game), reload it with DevTools open and FoE-Info selected, and **only** open DevTools on the game tab — not on every new tab.

**Question:** What is the current `foe-browser` behavior? Does it:

- Detect an existing game tab and reuse it?
- Open DevTools only on the game tab, or on every new tab?
- Open `chrome://extensions/` as the user also requested (line 449)?

### 4.2 Browser-environment-hygiene vs practical reloads

The `browser-environment-hygiene` rule (always_on) states: "The agent must NEVER automatically trigger page reloads without express permission." Yet the practical workflow requires reloading the game tab (F5) after extension rebuild to ingest fresh `StartupService.getData`.

**Question:** When the user asks the agent to "rebuild and test", what is the current reload behavior? Does the agent:

- Rebuild, then wait for the user to press F5?
- Rebuild, then auto-reload the game tab (violating the rule)?
- Use `foe-browser --reload` (which the rule exempts as an explicit CLI command)?

### 4.3 Bitwarden vs FoE-Info memory attribution

A notable thread in the history (lines 457-464): the user attributes a severe memory/CPU issue to FoE-Info, the agent investigates Bitwarden as a possible cause, the user uninstalls Bitwarden to prove a point, and then the agent concludes "it is coming from bitwarden" — which the user disputes. This is a case of the agent reaching a conclusion the user didn't accept.

**Question:** (Optional / retrospective) Was the memory-leak investigation conclusive, or did it stop at a plausible guess? Is there a remaining open issue tracking the browser performance problem?

---

## 5. Rules & Configuration Hygiene

### 5.1 Rule trigger audit

The user asked (history line 814): "all these should be always_on i don't know why you changed them to model_decission when all these rules are relevant for our coding."

**Question:** Which rules currently have `trigger: model_decision` vs `trigger: always_on`? Specifically:

- `monolith-containment.md` — `model_decision` (does it need to fire on every turn, or only when modifying `index.js`/`StartupService.js`?)
- `workspace-structure.md` — `model_decision` (same question)
- `graphify.md` — `always_on`
- `small-incremental-changes.md` — `always_on`
- `superpowers.md` — `always_on`

### 5.2 AGENTS.md overlap with rules

AGENTS.md Section 4 summarizes the 17 rules in prose. The user questioned (line 871) whether this overlap is necessary, since the rules are also injected individually from `.agents/rules/*.md`.

**Question:** Does AGENTS.md Section 4 (the rule summary) duplicate content that's already loaded via the individual rule files? If the rules are `always_on` and injected separately, is the AGENTS.md summary redundant token waste, or does it serve as a quick-reference index that's worth keeping?

### 5.3 `.vscode` recurrence

The user told the agent 3 times to remove `.vscode` (history lines 541-544), and the `workspace-structure` rule explicitly says "Never create, generate, or restore `.vscode/`...". Yet the history shows `.vscode` being restored repeatedly.

**Question:** Is `.vscode/` currently present in the repository? If so, what creates it — a plugin, a skill, a hook, or the agent itself? Is there a specific file in `.agents/` or a skill that references `.vscode` and triggers its recreation?

### 5.4 `.gitignore` / `.graphifyignore` sync

The user repeatedly checked whether `.gitignore` and `.graphifyignore` are in sync (history lines 47, 393, 755). The AGENTS.md mentions both `graphify-out/` and `.worktrees/` are git-ignored.

**Question:** Are `.gitignore` and `.graphifyignore` currently consistent — i.e., does every path ignored by one have a corresponding entry in the other where applicable, and are there any paths tracked by one but ignored by the other that shouldn't be?

---

## 6. Commit History & Artifact Cleanup

### 6.1 Soft-reset & unslop-commit

The user's workflow involves `git reset --soft 8c681d1` followed by `/unslop-commit` to rebuild a clean commit history. This has been done multiple times.

**Question:** What is the current state of the `development` branch relative to `8c681d1`? Is the commit history clean (logical commits representing actual work, no reverted/undone changes), or is another soft-reset + rebuild pending?

### 6.2 `docs/completed-work` artifacts

The user exports "artifacts of completed work" to `docs/completed-work/` and periodically asks whether old artifacts are still relevant (lines 601, 744, 880).

**Question:** What's currently in `docs/completed-work/`? Are these artifacts referenced by any skill, rule, or workflow, or are they purely archival? Should stale artifacts be pruned?

---

## Anything else?

A closing catch-all: anything in the Antigravity CLI conversation history, the `.agents/` harness, or the global `~/.gemini/config/` setup that we didn't ask about but should know?
