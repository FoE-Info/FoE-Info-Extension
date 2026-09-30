# Graph queries

Use the repository wrapper, which selects the graph and local package:

```bash
bash scripts/graphify/graphify.sh foe-info query "networkListener" --budget 700
bash scripts/graphify/graphify.sh foe-info query "dispatch" --dfs --context call
bash scripts/graphify/graphify.sh foe-info path "networkListener" "rpcRouter"
bash scripts/graphify/graphify.sh foe-info explain "rpcRouter"
bash scripts/graphify/graphify.sh foe-info affected "rpcRouter" --depth 2
```

BFS provides nearby context; DFS follows deeper chains. Use actual source or node
names when conceptual searches miss. Cite source locations and distinguish stored
edges from inferred behavior. AST coverage is incomplete for dynamic dependencies.

MCP provides `query_graph`, `get_node`, `get_neighbors`, `get_community`,
`god_nodes`, and `shortest_path`. Inspect exposed schemas before calling them.
MCP does not persist findings. Save verified results with wrapper `save-result`
using `--question`, `--answer`, `--outcome`, and `--nodes`; provide `--correction`
for corrected outcomes. Wrapper `reflect` reads the same `memory/` and
replaces `reflections/LESSONS.md`. Memory files retain full answer prose.
