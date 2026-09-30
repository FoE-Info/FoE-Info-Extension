# Peer graphs and Git merging

The default MCP profile exposes only the host graph. Research/full profiles
require explicit sibling roots; CONTRIBUTING.md owns profile generation.
Before querying a peer, verify graph existence, source scope, and labels.
Do not infer meaning or current behavior from a historical graph's filenames.

Native `merge-graphs <graph1> <graph2> --out <output>` creates a combined graph;
request an explicit output outside the shared host graph. Native `global` commands
manage user-global graph state and are separate from repository maintenance.
Do not merge peers or register global state as part of a routine local refresh.

The Git merge driver unions graph artifacts; it does not establish that merged
edges match current source. Refresh AST and inspect labels after resolving a
source merge. `mise run setup-full` registers the repository-local driver.
