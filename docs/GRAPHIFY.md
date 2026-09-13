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
