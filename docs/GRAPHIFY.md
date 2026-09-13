# Graphify Multi-Graph Knowledge Infrastructure

Consult knowledge graphs before wide disk searches.

## Graph Catalog (5 graphs)

| Graph                        | Path                                                     | Source                            | Type                          |
| ---------------------------- | -------------------------------------------------------- | --------------------------------- | ----------------------------- |
| `graphify-foe-info`          | `graphify-out/foe-info/graph.json`                       | In-repo `src/js/`                 | Code (AST)                    |
| `graphify-foe-info-original` | `../FoE-Info-Extension-original/graphify-out/graph.json` | Frozen sibling (commit `8c681d1`) | Code (AST, baseline)          |
| `graphify-metadata-store`    | `../metadata-store/graphify-out/graph.json`              | Entity JSON (5,400+ entities)     | Metadata                      |
| `graphify-forge-hammer`      | `../forge-hammer/graphify-out/graph.json`                | Optional sibling clone            | Code (AST, competitor)        |
| `graphify-low-tool`          | `../LoW-Tool/graphify-out/graph.json`                    | Optional sibling clone            | Code (AST, closed-source ref) |

## 3-Tier Contract

| Tier           | Command                        | LLM | Applies To       |
| -------------- | ------------------------------ | --- | ---------------- |
| **1. ast**     | `npm run graph:<repo>:ast`     | No  | Code graphs only |
| **2. update**  | `npm run graph:<repo>:update`  | No  | Code + metadata  |
| **3. reindex** | `npm run graph:<repo>:reindex` | Yes | Code + metadata  |

**Key invariant:** tiers are strictly additive. Never run a lower tier expecting higher-tier output.

## Llama-Swap Contract (for reindex / LLM-backed exports)

Every script triggering graphify export **must** source `llama-swap-lifecycle.sh` before export:

```bash
source "${SCRIPT_DIR}/llama-swap-lifecycle.sh"
# Then: graphify export wiki, export callflow-html, export obsidian, etc.
```

This guarantees an OpenAI-compatible backend (local llama.cpp on `http://127.0.0.1:8081/v1`) for semantic extraction and community labeling. All 10 update/reindex scripts comply.

## Local Execution Policy

All Graphify MCP registrations in `.agents/mcp_config.json` launch via `.agents/scripts/run-graphify-local.sh --mcp`. Restart/reconnect host MCP sessions after changing registrations; existing processes retain their launch environment. The original graph is a separate graph and server, not an alias of the current graph.

The launcher, git rebuild hooks, update scripts, and llama-swap lifecycle share the inference policy in `.agents/scripts/llama-swap-env.sh`: OpenAI-compatible inference is pinned to `http://127.0.0.1:8081/v1`, key `local`, model `qwen2.5-vl-7b` (including `GRAPHIFY_OPENAI_MODEL`). Higher-priority cloud provider credentials and proxy variables are removed from the child environment. The lifecycle script starts/stops the model only for explicit reindex jobs; MCP and AST updates do not allocate GPU memory.

`npm run graph:foe-info:ast` performs one AST update. Every code graph exposes the same `:ast` tier; the generated metadata graph has no AST tier. `npm run graph:foe-info:watch` starts a real foreground watcher when requested. Routine stdout/stderr goes to `~/.cache/foe-info/graphify-watch.log`; failures return nonzero and print the log path plus its last lines. `GRAPHIFY_LOG` selects another log file. MCP stdout remains the protocol stream; its stderr goes to `~/.cache/foe-info/graphify-mcp.log`.

AST extraction runs without an LLM. Non-code changes mark semantic work as pending rather than auto-running it. `GRAPHIFY_NO_TIPS=1` suppresses the cosmetic Gemini tip (it ignores OpenAI configuration). MCP graph traversal uses no LLM either. Semantic extraction may fetch an uncached public tokenizer asset. For standalone semantic work, use the launcher with `extract` or `label` — it pins backend/model and skips with a log entry if the local model endpoint is unavailable.

## Delegation

Deep cognitive mapping → delegate to `graph-knowledge-explorer` subagent.

## Technical References (in `.agents/skills/graphify/references/`)

- `query.md` — Query syntax & traversal
- `update.md` — Incremental updates & git sync
- `exports.md` — Multi-format exports (HTML, Obsidian, Wiki, SVG, Neo4j)
- `extraction-spec.md` — Extraction pipeline & AST spec
- `github-and-merge.md` — Multi-repo merge & monorepo indexing
- `hooks.md` — Git hooks automation
- `add-watch.md` — Folder watch daemon
- `transcribe.md` — Multimodal audio transcription
