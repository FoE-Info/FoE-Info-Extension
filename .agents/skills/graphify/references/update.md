# Incremental maintenance and clustering

```bash
bash scripts/graphify/graphify.sh foe-info ast
bash scripts/graphify/graphify.sh foe-info update .
bash scripts/graphify/graphify.sh foe-info label .
```

`ast` calls native `update .`; `update` passes through to upstream. They refresh code
and clustering, not semantic extraction. Confirm intentional code deletion before
passing `--force` to permit a smaller graph. Inspect labels afterward; full
`label` repairs saved filename names. `--missing-only` preserves such saved names.

For semantic extraction use native `extract .` or the `reindex` convenience.
Flags reach extraction only; labeling is a separate native operation.

Native `cluster-only .` reclusters an existing graph. It can invoke labeling,
so use the model lifecycle helper when labels require the local endpoint.
`--no-label` skips semantic naming. `--no-viz` can remove existing HTML.
