# Graph Target Profiles

Select exactly one profile when dispatching `graph-knowledge-explorer`. The profile owns target-specific policy; the agent owns the shared investigation workflow.

| Profile | Graph source | Status | Allowed persistence | Verification |
| --- | --- | --- | --- | --- |
| `foe-info` | `graphify-foe-info` | Live host repository | `graphify-out/foe-info/findings/` | `npm run graph:foe-info:ast && npm run check` |
| `metadata` | `graphify-metadata-store` | External game-metadata graph | `graphify-out/metadata/findings/` in this repository | `node -e "JSON.parse(require('node:fs').readFileSync('../metadata-store/graphify-out/graph.json', 'utf8'))" && npm run check` |
| `forge-hammer` | `graphify-forge-hammer` | Live peer repository | `graphify-out/forge-hammer/findings/` in this repository | `npm run graph:forge-hammer:ast && npm run check` |
| `low-tool` | `graphify-low-tool` | External closed-source baseline | `graphify-out/low-tool/findings/` | `npm run graph:low-tool:ast && npm run check` |
| `foe-info-original` | `graphify-foe-info-original` | Frozen v1 baseline at commit `8c681d1faa1f87930ecae3ffc3f9008ec49fe164` | `graphify-out/foe-info-original/findings/` | `npm run graph:foe-info-original:ast && npm run check` |

## Boundaries

- `foe-info`: investigate the active host. Use the comparator for peer benchmarking.
- `metadata`: read-only. Use it for game entities and identifiers, not host-code architecture, and never write into the metadata repository.
- `forge-hammer`: treat the peer as its own live project. Do not benchmark it during an exploration task. Source edits require an explicit user request.
- `low-tool`: read-only. Do not infer maintainability or security from unavailable source.
- `foe-info-original`: strictly read-only and historical. Never recommend restoring legacy behavior without checking current requirements.
- All findings stay under this repository's git-ignored `graphify-out/` tree.
