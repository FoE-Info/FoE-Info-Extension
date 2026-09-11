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

1. **Automated Local LLM Lifecycle**:
   - Reindexing scripts automatically source `.agents/scripts/llama-swap-lifecycle.sh`.
   - If `llama-swap` (vision instance) is not running, it is spawned automatically on `http://127.0.0.1:8081`.
   - As soon as semantic extraction and community labeling complete, `stop_llama_swap` unloads the vision model and stops the server before visual exports begin.

2. **Run Semantic Re-indexing & Labeling**:
   - FoE-Info reindex:
     ```bash
     npm run graph:foe-info:reindex
     ```
   - FoE Metadata reindex:
     ```bash
     npm run graph:metadata:reindex
     ```
   - Forge-Hammer reindex:
     ```bash
     npm run graph:forge-hammer:reindex
     ```
   *(Flags such as `--mode deep` or `--force` can be passed directly to the reindex scripts if needed).*

3. **Fast Incremental AST & Documentation Updates** (No LLM required):
   - FoE-Info AST update: `npm run graph:foe-info:update`
   - FoE-Info visual export: `npm run graph:foe-info:export`
   - FoE metadata update: `npm run graph:metadata:update`
   - FoE metadata export: `GRAPHIFY_OUT=graphify-out/metadata bash .agents/scripts/run-graphify-local.sh export html` (there is no separate metadata export npm runner)
   - Forge-Hammer AST update: `npm run graph:forge-hammer:update`
   - Forge-Hammer visual export: `npm run graph:forge-hammer:export`

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
