# Graphify Knowledge Graph Sync Workflow

Standard workflow for updating the repository AST graphify knowledge graph after modifying source files.

## Steps

1. **Update Graph (AST-only, zero API cost)**:
   ```bash
   mise exec -- graphify update .
   ```

2. **Verify Graph Output**:
   Check that `graphify-out/graph.json` has been updated without errors.
