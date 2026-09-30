# Graph Exploration Examples

Use these examples with `graph-knowledge-explorer` after selecting the matching profile in `graph-targets.md`.

## Metadata

**Question:** Locate the authoritative entity and ability identifiers for one FoE feature.

1. Confirm the metadata graph exists and is labeled (see `graph-targets.md` for discovery guidance).
2. Query `graphify-metadata-store` only if the graph is available; do not infer host-code architecture from metadata nodes.
3. Treat the metadata repository as read-only and report unknown or conflicting identifiers.
4. Return the verified report in the task response. The explorer never writes files; the main agent owns any `graphify-out/findings/` entry.

## Frozen FoE-Info baseline

**Question:** Inspect the v1 architecture of `helper.js`.

1. Confirm the `foe-info-original` graph exists and is labeled (see `graph-targets.md` for discovery guidance).
2. Query `graphify-foe-info-original` for the `helper.js` baseline node.
3. Follow callers and dependencies to document legacy coupling.
4. Do not query peer graphs or make comparative claims during an exploration task.
5. Return the verified report in the task response. The explorer never writes files; the main agent owns any `graphify-out/findings/` entry.

## Forge-Hammer

**Question:** Inspect Forge-Hammer packet interception.

1. Confirm the `forge-hammer` graph exists and is labeled (see `graph-targets.md` for discovery guidance).
2. Query `graphify-forge-hammer` for `network` and `interceptor` concepts.
3. Trace ownership and dependencies within Forge-Hammer only.
4. Do not query FoE-Info or turn the result into a comparison.
5. Return the verified report in the task response. The explorer never writes files; the main agent owns any `graphify-out/findings/` entry.
