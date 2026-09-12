---
name: graphify
description: "Run Graphify AST extraction, labeling, and visual exports."
---

# Graphify Knowledge Graph

This skill runs the local Graphify knowledge graph extraction, community labeling, and export generation pipeline for `FoE-Info-Extension`.

## Installation & Tool Environment

Graphify must be installed with the full extras bundle (`[mcp,openai,watch,svg]`) to ensure the MCP server, local LLM semantic extraction, file watching, and visual exports are functional:

```bash
uv tool install "graphifyy[mcp,openai,watch,svg]" --force
```

## Execution Steps

Every graph follows the same three-tier contract: **ast → update → reindex**.
`ast` is the primitive, `update` composes it, and `reindex` is the full LLM pipeline. Ascending tiers are strictly additive; never run a lower tier expecting higher-tier output.

| Tier | What it does | LLM | Code graphs | Metadata graph |
| :--- | :--- | :--- | :--- | :--- |
| **1. ast** | Incremental AST refresh only, no exports | No | `graph:<repo>:ast` | N/A (no AST) |
| **2. update** | Tier 1 + visual/doc exports | No | `graph:<repo>:update` | `graph:metadata:update` |
| **3. reindex** | `extract` + `label` + exports | Yes | `graph:<repo>:reindex` | `graph:metadata:reindex` |

`<repo>` is one of `foe-info`, `foe-info-original`, `forge-hammer`, `low-tool`. The metadata graph is built from entity JSON (`build-metadata-graph.mjs` + `cluster-only`), so it has no AST tier.

1. **Automated Local LLM Lifecycle** (reindex only):
   - Reindexing scripts automatically source `.agents/scripts/llama-swap-lifecycle.sh`.
   - If `llama-swap` (vision instance) is not running, it is spawned automatically on `http://127.0.0.1:8081`.
   - As soon as semantic extraction and community labeling complete, `stop_llama_swap` unloads the vision model and stops the server before visual exports begin.

2. **Tier 1 — Fast AST (no LLM, no exports)**: Use to refresh a stale graph before querying.
   ```bash
   npm run graph:foe-info:ast
   npm run graph:foe-info-original:ast
   npm run graph:forge-hammer:ast
   npm run graph:low-tool:ast
   ```

3. **Tier 2 — Update (AST + exports, no LLM)**:
   ```bash
   npm run graph:foe-info:update
   npm run graph:foe-info-original:update
   npm run graph:forge-hammer:update
   npm run graph:low-tool:update
   npm run graph:metadata:update
   ```

4. **Tier 3 — Semantic Reindex (LLM: extract + label + exports)**:
   ```bash
   npm run graph:foe-info:reindex
   npm run graph:foe-info-original:reindex
   npm run graph:forge-hammer:reindex
   npm run graph:low-tool:reindex
   npm run graph:metadata:reindex
   ```
   Forward flags after `--` for code graphs: `-- --mode deep` (aggressive INFERRED-edge extraction) or `-- --force` (bypass cached hashes). The metadata reindex has no `extract` stage, so it honors only `--force`; `--mode deep` is silently dropped there.

5. **Standalone exports** (already included in Tiers 2–3): `npm run graph:<repo>:export` regenerates visualization/docs only.

## Upstream Graphify Technical References

For deep technical specifications on Graphify core features, see:
- [Query Syntax & Traversal](references/query.md)
- [Incremental Updates & Git Sync](references/update.md)
- [Multi-Format Exports (HTML, Obsidian, Wiki, SVG, Neo4j)](references/exports.md)
- [Extraction Pipeline & AST Spec](references/extraction-spec.md)
- [Multi-Repo Merge & Monorepo Indexing](references/github-and-merge.md)
- [Git Hooks Automation](references/hooks.md)
- [Folder Watch Daemon](references/add-watch.md)
- [Multimodal Audio Transcription](references/transcribe.md)
