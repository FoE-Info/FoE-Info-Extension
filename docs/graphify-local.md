# Local Graphify execution

All four Graphify MCP registrations in `.agents/mcp_config.json` use
`.agents/scripts/run-graphify-local.sh --mcp`.
Restart/reconnect the host MCP sessions after changing these registrations;
existing processes retain their launch environment. The original graph is a
separate graph and server, not an alias of the current graph.

The launcher, Git rebuild hooks, update scripts, and llama-swap lifecycle share
`graphify-local-env.sh`: OpenAI-compatible inference is pinned to
`http://127.0.0.1:8081/v1`, key `local`, model `qwen2.5-vl-7b` (including
`GRAPHIFY_OPENAI_MODEL`). Higher-priority cloud provider credentials and proxy
variables are removed from the child environment. Other applications' credentials
are not changed. The lifecycle still starts/stops the model for explicit reindex
jobs; MCP and AST updates do not allocate GPU memory.

`npm run graph:foe-info:ast` performs one AST update. Every code graph exposes
the same `:ast` tier (`graph:foe-info-original:ast`, `graph:forge-hammer:ast`,
`graph:low-tool:ast`); the generated metadata graph has no AST tier. The upstream
log prefix is
`[graphify watch]`, but this does not mean a watcher daemon is running.
`npm run graph:foe-info:watch` starts an actual foreground watcher when requested.
Both write routine stdout/stderr to `~/.cache/foe-info/graphify-watch.log`;
failures return nonzero and print the log path plus its last lines.
`GRAPHIFY_LOG` can select another log file. MCP stdout remains the protocol stream;
its stderr goes to `~/.cache/foe-info/graphify-mcp.log`.

Installed Graphify update/watch perform AST extraction without an LLM. Non-code
changes mark semantic work as pending, rather than automatically running it.
The Gemini tip was cosmetic and ignored OpenAI configuration; `GRAPHIFY_NO_TIPS=1`
suppresses it. MCP graph traversal also uses no LLM. Its PR tools can still contact
GitHub through `gh`; this policy concerns inference, not a network firewall.
Semantic extraction may fetch an uncached public tokenizer asset.

For explicit standalone semantic work, use the launcher with `extract` or `label`.
It pins the backend/model and skips with a log entry if the local model endpoint
is unavailable. Installed Graphify retries failed local inference against the
same endpoint; it does not fall back to another provider. Existing full reindex
commands retain their managed llama-swap startup and teardown.

Validation on 2026-09-08 found no Gemini/Google API keys in the shell, running
Graphify processes, or checked host/launch configuration. Two copies of each
server were parented by the then-active agent host; no watch daemon was running.
This is a launch-policy guarantee for the managed entry points, not protection
against arbitrary direct CLI commands, modified upstream code, or an
intentionally reconfigured local proxy.
