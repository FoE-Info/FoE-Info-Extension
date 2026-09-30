# Graph Target Profiles

Select one repository when dispatching `graph-knowledge-explorer`: the current
repository by default, or an explicitly assigned path/profile. Known profiles
provide target-specific policy; an assigned repository can also be identified by
its verified path without a preconfigured profile. The agent owns the shared
investigation workflow. `metadata-store` is the wrapper target for the sibling
folder `../metadata-store/`, separate from upstream Graphify metadata fields.

| Target profile  | Project root                                                         | Graph artifact                      | Graphify source         | Status                                   | Durable artifact                                 | Allowed persistence                       | Read-only verification                                                                                             |
| --------------- | -------------------------------------------------------------------- | ----------------------------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `foe-info`      | Repository root                                                      | `graphify-out/graph.json`           | `graphify-foe-info`     | Live host repository                     | `.agents/references/graph-knowledge-foe-info.md` | Local Graphify memory and reflection only | `npm run check`                                                                                                    |
| Sibling targets | Discovered from local layout / `scripts/audit-references.mjs` config | `<sibling>/graphify-out/graph.json` | Per sibling MCP profile | Peer, metadata, or baseline repositories | None                                             | Host memory only; no peer writes          | Confirm the sibling `graph.json` exists, was built from the expected source, and has been labeled before querying. |

## Boundaries & Evaluation Lenses

- `foe-info`: investigate the active host. Can be compared against peers for feature parity, data flow, and architecture benchmarking.
- `metadata-store`: read-only. Use it for game entities, technologies, and identifiers, not host-code architecture; never write into the metadata repository.
- `forge-hammer`: evaluate feature parity, architecture, data flow, performance, and calculation logic worth adopting or rejecting. Source edits require an explicit user request.
- `foe-info-original`: strictly read-only and historical. Used for regression detection, intentional modernization verification, lost behavior, and obsolete legacy patterns.
- `graph-knowledge-explorer` saves Q&A through local `save-result` and regenerates
  lessons through local `reflect`, using upstream default paths. Peer sources
  stay read-only; peer findings are saved in the host repository's memory. The
  main agent owns reconciliation and shared documentation. No custom or dated
  findings directories are created.

## Comparison Guidelines

When performing cross-codebase comparisons:

1. **Establish FoE-Info Baseline**: Query `graphify-foe-info` and inspect current source, state, and test suites.
2. **Establish Peer Baseline**: Query the peer's graph and examine implementation independently; never assume identical names imply identical semantics.
3. **Evaluate Invariants**: Verify calculation precision against FoE-Info's BigNumber rules (never adopt peer floating-point arithmetic).
4. **Synthesize Findings**: Return a side-by-side evidence table with cited source lines/nodes, confirmed parity, architectural gaps, peer risks, and prioritized recommendations.
