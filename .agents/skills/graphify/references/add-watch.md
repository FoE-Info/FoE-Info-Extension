# Watch mode and added content

```bash
bash scripts/graphify/graphify.sh foe-info watch .
```

Watch is a foreground code-maintenance process. Stop it when the requested
observation session ends. It does not start the model. Inspect graph labels after
membership changes, just as for AST refreshes.

Native `add <url>` downloads content and updates a corpus. It is outside the
shared source-and-selected-documentation graph workflow; do not use it to import external pages
into this graph. Use a separately scoped corpus if the user requests that work.
