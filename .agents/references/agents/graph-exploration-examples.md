# Graph Exploration Examples

Use these examples with `graph-knowledge-explorer` after selecting the matching profile in `graph-targets.md`.

## Metadata

**Question:** Locate the authoritative entity and ability identifiers for one FoE feature.

1. Query `graphify-metadata-store` only; do not infer host-code architecture from metadata nodes.
2. Treat the metadata repository as read-only and report unknown or conflicting identifiers.
3. Write the verified report under `graphify-out/metadata/findings/` in this repository.

## Frozen FoE-Info baseline

**Question:** Inspect the v1 architecture of `helper.js`.

1. Query `graphify-foe-info-original` for the baseline node associated with commit `8c681d1`.
2. Follow callers and dependencies to document legacy coupling.
3. Do not query peer graphs or make comparative claims during an exploration task.
4. Write the verified report under `graphify-out/foe-info-original/findings/`.

## Forge-Hammer

**Question:** Inspect Forge-Hammer packet interception.

1. Query `graphify-forge-hammer` for `network` and `interceptor` concepts.
2. Trace ownership and dependencies within Forge-Hammer only.
3. Do not query FoE-Info or turn the result into a comparison.
4. Write the report under `graphify-out/forge-hammer/findings/` in this repository.

## LoW-Tool

**Question:** Inspect legacy Great Building calculation formulas.

1. Query `graphify-low-tool` for the Great Buildings service and its calculation dependencies.
2. Treat the target as read-only and do not expose credentials or identifying data found in the private overlay.
3. Do not query FoE-Info or make comparative claims.
4. Write the report under `graphify-out/low-tool/findings/` in this repository.
