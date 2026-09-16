# Four-Stream Graph Exploration and Comparison Plan

## Purpose

Run four bounded investigations against the current FoE-Info architecture and its three declared comparison targets. Verify every graph conclusion against current source before recommending code changes.

## Roles

| Stream                     | Canonical subagent                                                               | Required profile    | Output                                                              |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| FoE-Info host exploration  | [`graph-knowledge-explorer`](../../.agents/agents/graph-knowledge-explorer.md)   | `foe-info`          | `graphify-out/foe-info/findings/foe-info-modern-architecture.md`    |
| Frozen baseline comparison | [`cross-codebase-comparator`](../../.agents/agents/cross-codebase-comparator.md) | `foe-info-original` | `graphify-out/foe-info-original/findings/v1-baseline-comparison.md` |
| Forge-Hammer comparison    | [`cross-codebase-comparator`](../../.agents/agents/cross-codebase-comparator.md) | `forge-hammer`      | `graphify-out/forge-hammer/findings/forge-hammer-comparison.md`     |
| LoW-Tool comparison        | [`cross-codebase-comparator`](../../.agents/agents/cross-codebase-comparator.md) | `low-tool`          | `graphify-out/low-tool/findings/low-tool-comparison.md`             |

Load [graph target profiles](../../.agents/references/agents/graph-targets.md) and [comparison target profiles](../../.agents/references/agents/comparison-targets.md) before dispatch. Peer repositories and frozen baselines are read-only; all reports are written inside this repository.

## Stream 1: FoE-Info Host Exploration

Inspect the current graph and source for:

1. End-to-end data flow from passive packet capture through dispatch, services, calculators, and renderers.
2. High-centrality nodes and remaining oversized boundaries.
3. DOM or browser leakage into pure calculation modules.
4. Graph/source disagreement or stale graph evidence.

Dispatch `graph-knowledge-explorer` with profile `foe-info`.

## Stream 2: Frozen Baseline Comparison

Compare the current extension with the frozen original for:

1. Responsibilities extracted from historical monoliths.
2. Precision and safety changes in FP and boost calculations.
3. Packet-routing and startup changes.
4. Behavioral regressions or intentionally retired behavior.

Dispatch `cross-codebase-comparator` with profile `foe-info-original`.

## Stream 3: Forge-Hammer Comparison

Compare architecture and behavior for:

1. Feature boundaries and modularity.
2. Date/time formatting capabilities.
3. Blue Galaxy and sniping calculations.
4. Rendering, performance, and memory trade-offs.

Dispatch `cross-codebase-comparator` with profile `forge-hammer`.

## Stream 4: LoW-Tool Comparison

Use the removed-feature/security lens for:

1. Omitted RPC handlers or features that remain policy-compliant and useful.
2. Calculation-formula lineage.
3. Reconnection, world-switch, and cold-start behavior.
4. Security boundaries that must not be restored.

Dispatch `cross-codebase-comparator` with profile `low-tool`.

## Synthesis

After all four reports exist:

1. Cross-check every material claim against current source.
2. Separate confirmed regressions, optional opportunities, and rejected historical behavior.
3. Deduplicate recommendations and rank them by impact, risk, and verification cost.
4. Update `docs/STATUS.md` only with genuinely open work.
