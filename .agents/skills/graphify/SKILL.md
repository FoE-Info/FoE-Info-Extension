---
name: graphify
description: 'Maintain and query the repository-local Graphify graph, repair community labels, and generate optional visual exports.'
---

# Graphify Knowledge Graph

Use the repository wrapper for FoE-Info graph maintenance. This guidance was
checked against `graphifyy` **0.9.64** and repository scripts. The current
locked package is **0.9.67**; its CLI help and wrapper tests were rechecked.
Check the installed package and `--help` again after dependency upgrades; a global
skill's version warning does not identify this repository's package version.

## Environment and scope

```bash
.venv/bin/python -c 'import importlib.metadata as m; print(m.version("graphifyy"))'
bash scripts/graphify/graphify.sh foe-info --help
```

The wrapper uses `.venv/bin/graphify`, then `uv run --project <repo> graphify`;
it deliberately avoids a global executable. Install with `mise run setup-full`
or `uv sync`. Repair a moved virtualenv's broken shebang with
`uv sync --reinstall-package graphifyy`.

`pyproject.toml` declares `graphifyy[mcp,openai,watch,svg]` and `scipy`:
the installed SVG exporter imports scipy beyond the SVG extra's dependencies.

Default to the local `foe-info` target. The wrapper also accepts
`foe-info-original`, `forge-hammer`, and `metadata-store`; verify any requested peer's
location, source, and labels before querying. `metadata-store` selects the sibling
folder `../metadata-store/`; upstream Graphify metadata fields and memory
frontmatter remain unchanged. `CONTRIBUTING.md` owns graph scope,
shared artifacts, and hook policy. Do not run `graphify install` over the local
skill or agent entrypoint to synchronize documentation.

## Choose the operation

Native commands pass through unchanged, including flags, defaults, exit status,
and caller provider/proxy settings. Use the installed CLI help for their syntax.
The wrapper selects the target working directory and repository-local executable.

Repository conveniences have separate names:

- `ast` (default): native `update .`.
- `reindex`: native `extract .`; caller flags go only to extraction.
- `export-all`: wiki, Obsidian, SVG, HTML, and tree; accepts no flags.
- `metadata-build`: the repository's entity-JSON indexer, for the `metadata-store` target.
- `serve-mcp`: the repository-local MCP server for the selected graph.

```bash
bash scripts/graphify/graphify.sh foe-info update .
bash scripts/graphify/graphify.sh foe-info label .
bash scripts/graphify/graphify.sh foe-info extract .
bash scripts/graphify/graphify.sh foe-info export html
bash scripts/graphify/graphify.sh metadata-store metadata-build
```

The `graph:export` npm script uses `export-all`. Metadata indexing has no AST
or semantic extraction tier; `metadata-store update` passes the native upstream `update` command unchanged.

## Community labels and outputs

After refreshing, inspect community names before interpreting topics. Filename
names and `Community N` placeholders indicate missing semantic labels. Use
`label` to repair filename-derived names. `label --missing-only` preserves
saved names, including filename-derived names; it selects only absent labels
and exact `Community N` placeholders. Labels are model-produced navigation aids;
verify architectural conclusions against source.

```bash
node -e 'const d=require("./graphify-out/graph.json");const c=new Map();for(const n of d.nodes||[])if(n.community!=null)c.set(n.community,n.community_name||"");console.log(JSON.stringify([...c],null,2))'
```

`graph.json` supplies queries; `GRAPH_REPORT.md` summarizes the graph. The wrapper
makes its **full export set** opt-in through the `export-all` convenience.
However, native clustering/labeling may regenerate `graph.html` automatically;
“no wrapper exports” does not mean “no HTML writes.” Native label/cluster-only
support `--no-viz`, which can remove existing HTML. Do not use it merely to avoid
writing the repository's shared viewer.

For one format, use native export:

```bash
bash scripts/graphify/graphify.sh foe-info export svg
bash scripts/graphify/graphify.sh foe-info export callflow-html --lang en
```

## Queries and diagnostics

Native commands preserve arguments and exit status. `cli` remains an optional
pass-through alias; it is not required for native commands.

```bash
bash scripts/graphify/graphify.sh foe-info query networkListener --budget 700
bash scripts/graphify/graphify.sh foe-info affected networkListener --depth 2
bash scripts/graphify/graphify.sh foe-info explain networkListener
bash scripts/graphify/graphify.sh foe-info god-nodes --top 10
bash scripts/graphify/graphify.sh foe-info diagnose multigraph --json
```

Use `path "A" "B"` for shortest paths, `query --dfs` for depth-first traversal,
and repeated `--context` filters for scoped queries. `affected` reverses edges
and supports repeated `--relation` filters. `diagnose multigraph` checks
same-endpoint edge collapse risk; it does not repair the graph.

The wrapper's `save-result` and `reflect` actions use the native
`graphify-out/memory/` directory.

## Optional local model lifecycle

The Graphify wrapper does not start models or source `inference-env.sh`.
To explicitly use the repository's local model helper:

```bash
bash scripts/graphify/graphify-model.sh run bash scripts/graphify/graphify.sh foe-info label .
```

The helper configures its local endpoint only for this explicit invocation.
It stops containers it starts, and leaves an already healthy endpoint running.

## Supporting references

The references describe repository workflows checked against Graphify 0.9.64.
Use upstream syntax and defaults for native commands. `CONTRIBUTING.md` owns
repository scope, shared artifacts, and Git delivery policy. Read only the
relevant reference; verify examples against the installed package before use.

- [Query and traversal](references/query.md)
- [Incremental extraction and clustering](references/update.md)
- [Exports](references/exports.md)
- [Extraction specification](references/extraction-spec.md)
- [Multi-repository graphs](references/github-and-merge.md)
- [Git hooks](references/hooks.md)
- [Watch mode](references/add-watch.md)
- [Transcription](references/transcribe.md)
- [Reference catalog](references/README.md)
