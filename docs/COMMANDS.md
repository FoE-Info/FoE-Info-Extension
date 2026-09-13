# Commands & Verification Pipeline

Run all commands from workspace root.

## Pipeline Stages

| Stage                 | Command                           | Purpose                                                  |
| --------------------- | --------------------------------- | -------------------------------------------------------- |
| **Verification Gate** | `npm run verify`                  | Full 5-stage: format, lint, i18n, test, dev build        |
| **Unit Tests**        | `npm test` / `npm run test:watch` | Node.js tests (`tests/**/*.test.mjs`, includes hooks)    |
| **Format Check**      | `npm run check`                   | Prettier dry-run                                         |
| **Format Write**      | `npm run format`                  | Prettier write                                           |
| **Lint**              | `npm run lint`                    | ESLint                                                   |
| **i18n Check**        | `npm run i18n:check`              | Key parity across 7 locales (de, el, en, es, fr, gr, it) |
| **i18n Fix**          | `npm run i18n:fix`                | Auto-fix missing keys                                    |
| **Dev Build**         | `npm run build:dev`               | Webpack dev bundle                                       |
| **Watch**             | `npm run dev`                     | Webpack watch mode                                       |
| **Prod Build**        | `npm run build`                   | Webpack production bundle                                |
| **CDP Browser**       | `foe-browser [--restart]`         | Isolated Chromium on port 9222                           |
| **Metadata Download** | `npm run metadata:download`       | Ingest live InnoGames entity datasets                    |
| **Metadata Query**    | `npm run metadata:query`          | Query offline entity database                            |

## Graphify Commands (3-tier contract)

### Code Graphs (foe-info, foe-info-original, forge-hammer, low-tool)

| Tier        | Command                        | LLM | Description                     |
| ----------- | ------------------------------ | --- | ------------------------------- |
| **ast**     | `npm run graph:<repo>:ast`     | No  | Incremental AST refresh only    |
| **update**  | `npm run graph:<repo>:update`  | No  | AST + visual/doc exports        |
| **reindex** | `npm run graph:<repo>:reindex` | Yes | Full: extract + label + exports |

Flags: `-- --mode deep` (aggressive INFERRED edges), `-- --force` (bypass cache)

### Metadata Graph

| Tier        | Command                          | LLM | Description                   |
| ----------- | -------------------------------- | --- | ----------------------------- |
| **update**  | `npm run graph:metadata:update`  | No  | Build from entities + exports |
| **reindex** | `npm run graph:metadata:reindex` | Yes | Cluster + label + exports     |

### Standalone Exports (included in Tiers 2–3)

```bash
npm run graph:<repo>:export
```

## Verification Order

Always run in this sequence:

```bash
npm run check      # format
npm run lint       # lint
npm run i18n:check # i18n parity
npm test           # unit tests
npm run build:dev  # dev build
```

Or the single gate: `npm run verify`
