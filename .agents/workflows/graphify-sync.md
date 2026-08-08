# Graphify Knowledge Graph Sync Workflow

Standard workflow for updating the repository graphify knowledge graph after modifying code or documentation.

## Steps

1. **Update Graph**:
   ```bash
   uvx --from "graphifyy[gemini,mcp]==0.9.36" graphify update .
   # Alternatively: mise run graphify-update
   ```

   Code-only changes use deterministic AST extraction. Documentation, paper, or image changes may invoke semantic extraction; add `--mode deep` only when richer inferred relationships are worth the additional work.

2. **Verify Graph Output**:
   Check that `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, and `graphify-out/graph.html` were updated without errors, confirm that report surprises and suggested questions reference `src/` only, and surface any graph-health warning.
