# Extraction scope and confidence

`.graphifyignore` selects extension source and canonical project guidance. Consult
AGENTS.md and CONTRIBUTING.md for authoritative scope and publication policy.

Wrapper `ast`/`update` refresh code without model calls. Wrapper `reindex` invokes
native `extract .` with caller flags and environment. Native `extract --code-only` skips semantic/document extraction;
`--no-cluster` writes raw extraction rather than a clustered graph.

`--mode deep` enables aggressive inferred-edge extraction. Verify inferred edges
against source before making dependency or runtime claims. Dynamic imports and
bare-assignment soft dependencies can be absent from AST results. A graph path
shows stored relationships, not proof that a runtime execution took that path.

Native extraction supports concurrency and timeout controls; use the installed
`--help` for supported flags. Wrapper reindex forwards flags only to extraction.
