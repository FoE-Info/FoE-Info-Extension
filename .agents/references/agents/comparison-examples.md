# Cross-Codebase Comparison Examples

Use these examples with `cross-codebase-comparator` after selecting the matching profile in `comparison-targets.md`.

## Frozen FoE-Info baseline

**Question:** Compare the Great Building donation rendering pipeline.

1. Query `graphify-foe-info-original` for the baseline service and inline rendering path.
2. Query `graphify-foe-info` for current service, state, binding, and renderer ownership.
3. Separate structural improvement from behavioral parity; verify calculations with tests.
4. Write the report under `graphify-out/foe-info-original/findings/`.

## Forge-Hammer

**Question:** Compare the safe-spot selection predicate.

1. Locate the Forge-Hammer locking predicate and current FoE-Info equivalent.
2. Compare boundary behavior, not just names or formula shape.
3. Apply the domain-scoped BigNumber rule when evaluating reward and lock rounding.
4. Write the report under `graphify-out/forge-hammer/findings/`.

## LoW-Tool

**Question:** Compare a private overlay with current FoE-Info security boundaries.

1. Read the approved fork-exclusion record before inspecting private code.
2. Report embedded credentials, allowlists, or closed-source dependencies without reproducing secret values.
3. Compare against current FoE-Info storage, credential, and open-source boundaries.
4. Write the report under `graphify-out/low-tool/findings/`.
