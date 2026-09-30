# Repository hooks and merge driver

Shared `.husky/post-commit` and `.husky/post-checkout` refresh code in the
background using the clone's `.venv` Python. They skip rebase/merge/cherry-pick
operations and use `memory/` for optional reflection. Logs are written to
`~/.cache/graphify-rebuild.log`. Set the hook’s `GRAPHIFY_SKIP_HOOK` environment variable to `1` to skip a rebuild.

`mise run setup-full` synchronizes uv dependencies and registers the clone-local
Graphify merge driver. It does not replace shared hooks. Do not run upstream
`graphify hook install` over the customized tracked files. Git settings are local
to each clone; source exports without Git skip merge-driver registration.

Hooks run asynchronously: command completion is not proof of graph completion.
Run wrapper `ast` explicitly when a task requires a verified current graph.
