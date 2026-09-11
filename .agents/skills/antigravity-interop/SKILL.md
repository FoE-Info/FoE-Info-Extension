---
name: antigravity-interop
description: Dual-harness interop contract between Antigravity and OpenCode — portability, grants, handoff protocol, and caveats.
---

# Antigravity ↔ OpenCode Interop

This skill documents the dual-harness contract so work hands off seamlessly between Antigravity and OpenCode. The goal: any user with OpenCode + Antigravity installed clones the repo, enters the directory, grants permission, and gets the full harness working.

---

## 1. Canonical Source of Truth

| Artifact | Canonical Location | Host Shim |
| :--- | :--- | :--- |
| Subagents (31) | `.agents/agents/*.md` | `.opencode/agents/*.md` (thin shims) |
| Rules (16) | `.agents/rules/*.md` | `opencode.json` instructions glob |
| Skills (51+) | `.agents/skills/*/SKILL.md` | Auto-discovered via `skills.json` |
| MCP servers | `.agents/mcp_config.json` | `opencode.json` `mcp` block |
| Hooks | `.agents/hooks.json` | `.opencode/plugins/*.mjs` |
| Grants | `~/.gemini/config/config.json` | `opencode.json` `permission` block |

**Rule**: `.agents/` is canonical. `.opencode/` mirrors only what the host requires. When updating configs, always write the `.agents/` version first, then mirror.

---

## 2. Portable MCP Configuration

Both `.agents/mcp_config.json` and `opencode.json` use **native `env` injection** instead of wrapper-script env sourcing. This makes configs portable across machines — no absolute `/var/home/kronikpillow/...` paths.

### Design

- **`graphify-mcp`** is on PATH via `uv tool install "graphifyy[mcp,openai,watch,svg]" --force`.
- **`chrome-devtools-mcp`** is on PATH via `brew install chrome-devtools-mcp` (or npx fallback in wrapper).
- Graph paths are **relative** (resolved from workspace root via `cwd` or CWD convention).
- Cloud key neutralization: graphify's `detect_backend()` uses truthiness (`if value:`), so empty-string `env` overrides (`GEMINI_API_KEY: ""`) replicate the wrapper's `unset` behavior exactly.

### Graph path resolution

| Server | Relative graph path | Resolved when cloned |
| :--- | :--- | :--- |
| `graphify-foe-info` | `graphify-out/foe-info/graph.json` | In-repo (generated) |
| `graphify-foe-info-original` | `../FoE-Info-Extension-original/graphify-out/graph.json` | Sibling repo clone (frozen baseline commit `8c681d1faa1f87930ecae3ffc3f9008ec49fe164`) |
| `graphify-metadata-store` | `graphify-out/metadata/graph.json` | In-repo (generated) |
| `graphify-forge-hammer` | `../forge-hammer/graphify-out/graph.json` | Sibling repo clone (optional) |
| `graphify-low-tool` | `../LoW-Tool/graphify-out/graph.json` | Sibling repo clone (optional; original closed-source implementation) |

### Wrapper scripts (kept for non-MCP use)

- `run-graphify-local.sh` — used by `npm run graph:*` scripts (terminal/CI use, with `--mcp` mode no longer invoked by MCP config).
- `run-chrome-devtools-mcp.sh` — still invoked by MCP config via `bash .agents/scripts/...` (real browser orchestration: foe-browser lifecycle, extension list, standalone fallback).

---

## 3. Grant Format

Antigravity permission grants **must** use the `mcp(server/tool)` wrapper form:

```
mcp(graphify-foe-info/query_graph)
mcp(graphify-foe-info/*)
```

Bare `server/tool` strings are rejected as "invalid grant string" by `permission_grant_store.go:366`.

OpenCode grants live in `opencode.json` `permission` block — different format, no `mcp()` wrapper needed.

### Grant topology (as of last rebuild)

| File | Scope | Count | Notes |
| :--- | :--- | :--- | :--- |
| `~/.gemini/config/config.json` | Global | 86 | All 6 servers × per-tool + `*` wildcards |
| `projects/5c62244a-...json` | FoE-Info project | 79 | Host-scoped grants (incl. 10 graphify-low-tool) |
| `projects/18cb2ceb-...json` | Forge-Hammer project | 13 | Peer-scoped grants |
| `projects/outside-of-project.json` | Outside-of-project | 86 | Global fallback |

Zero bare MCP grants remaining after rebuild.

---

## 4. Handoff Protocol

When Antigravity runs out (context/token exhaustion), OpenCode continues. When Antigravity refreshes, hand back via docs.

### Handoff forward (Antigravity → OpenCode)

1. Before the session ends, write a progress summary to `docs/OPENCODE.md` (or the active handoff file).
2. Include: what was done, what's in progress, what's blocked, relevant file paths, and the next step.
3. OpenCode reads `docs/OPENCODE.md` on startup and picks up where Antigravity left off.

### Handback (OpenCode → Antigravity)

1. OpenCode writes its progress to the same handoff file.
2. Antigravity reads the file on next session start and resumes.

---

## 5. Version Context

- **Electron Antigravity 2.0+** started the agentic work (initial `.agents/` scaffold, rules, hooks).
- **Antigravity CLI** did most of the recent work (grant rebuilds, portability migration, MCP env proof).
- **Antigravity-IDE** (VS Code extension base) — barely used, not the primary harness.
- **OpenCode** (`big-pickle` model) — continued work when Antigravity ran out; will pick up handoffs.

---

## 6. FoE Expert Caveat

Many FoE custom expert/subagent claims were **AI-inferred** by Antigravity from inspecting the codebase (which was broken at the time) + live network/RPCs. Some claims may be inaccurate. The GB calculation claim was wrong.

**Rule**: Treat expert/subagent claims as hypotheses. Always verify against actual source code before implementing. Do not trust expert descriptions of algorithms — read the code.

---

## 7. Baseline Reference

- **Pre-agentic v1 baseline**: commit `8c681d1faa1f87930ecae3ffc3f9008ec49fe164`
- The `graphify-foe-info-original` graph was generated from this commit.
- All modernization, bugfixing, and improvement work started from this baseline.

---

## 8. How to Use This Skill

Load this skill when:
- Setting up the repo on a new machine (check MCP config + grants + PATH binaries).
- Switching between Antigravity and OpenCode mid-task.
- Debugging MCP server connection issues (check relative paths, env neutralization, command resolution).
- Documenting handoff state before session end.
- Verifying grant format after config changes.
