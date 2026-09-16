# Comparison Target Profiles

Select exactly one profile when dispatching `cross-codebase-comparator`.

| Profile | Peer graph | Evaluation lens | Allowed report path |
| --- | --- | --- | --- |
| `forge-hammer` | `graphify-forge-hammer` | Feature parity, architecture, data flow, performance, and practices worth adopting or rejecting | `graphify-out/forge-hammer/comparisons/` |
| `low-tool` | `graphify-low-tool` | Removed or absent features, observable behavior, security limitations, and parity claims that can be supported without source access | `graphify-out/low-tool/comparisons/` |
| `foe-info-original` | `graphify-foe-info-original` | Regression detection, intentional modernization, lost behavior, and obsolete legacy patterns | `graphify-out/foe-info-original/comparisons/` |

Always compare against `graphify-foe-info` and current source. Use `graphify-metadata-store` only when game entities or formulas require independent ground truth.

## Required sections

1. Scope and versions compared
2. Evidence table with graph nodes and source paths
3. Confirmed parity
4. Behavioral or architectural gaps
5. Intentional differences
6. Risks in the peer implementation
7. Prioritized FoE-Info recommendations
8. Verification and uncertainty

Peer repositories and the frozen baseline are read-only unless the user explicitly asks to work in the live peer repository.
