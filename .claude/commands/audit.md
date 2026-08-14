---
description: Run a modular, per-domain codebase audit using expert subagents, writing one file per lens plus a synthesized summary
---

Run a fresh audit of `FoE-Info-Extension`, split by domain lens rather than as one flat
pass — each lens gets its own file under `docs/knowledgebase/`, tied together by
`docs/knowledgebase/audit-summary.md`.

## Lenses and their file

Dispatch these as separate `Agent` calls so each subagent works from a clean context
scoped to its lens. Tell each one explicitly: read only its lens's files, verify every
finding against the actual source line before including it, tag each finding P0
(breaks something now / security-relevant), P1 (real correctness or process gap), or
P2 (cleanup/polish), and end by writing (not just returning) its file.

| Lens                | Subagent(s)                                                                                                  | Scope                                                                    | Output file                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Node.js & Webpack   | `nodejs-expert`, `webpack-expert`                                                                            | `package.json`, `webpack.*.js`, build output                             | `docs/knowledgebase/audit-nodejs-webpack.md`    |
| JavaScript & jQuery | `javascript-expert` (split across `src/js/index.js`+entries and `src/js/msg/`+`src/js/fn/`), `jquery-expert` | `src/js/**`                                                              | `docs/knowledgebase/audit-javascript-jquery.md` |
| CSS & HTML          | `css-expert`, `html-expert`                                                                                  | `src/css/**`, `src/chrome/*.html`                                        | `docs/knowledgebase/audit-css-html.md`          |
| Extension/MV3       | use the `/chrome-extensions` skill inline (no subagent)                                                      | `src/chrome/manifest*.json`, extension API call sites in `src/js/**`     | `docs/knowledgebase/audit-chrome-extension.md`  |
| DevTools panel      | use `/modern-web-guidance` and, if a live browser session is available, `browser-testing-with-devtools`      | `src/js/devtools.js`, panel/devtools HTML templates, live panel behavior | `docs/knowledgebase/audit-chrome-devtools.md`   |

Skip `websocket-expert` unless a real WebSocket implementation is found (as opposed to
a DevTools `_resourceType` filter check referencing the string `'websocket'`).

## Per-file format

Each lens file should have:

```
# <Lens> Audit

**Verified**: <date> against <specific files/evidence checked>.

## Confirmed findings

### P0/P1/P2: <short title>
<what's wrong, the exact file:line, and the fix — no vague "consider reviewing X">

## What's solid
<brief, only things actually verified, not assumed>
```

If the DevTools-panel lens couldn't get a live session, say so explicitly in that
file's header and list what a live pass would still need to check — don't silently
present a static-only pass as complete.

## Synthesis

After every lens file is written, read all five and write
`docs/knowledgebase/audit-summary.md` with:

1. An **Outcome** paragraph naming the 2-4 most urgent risks across all lenses.
2. An **Audit matrix** table: lens | current strengths | highest-priority gaps | link
   to that lens's file.
3. A **Prioritized remediation roadmap** grouped P0/P1/P2, pulling the concrete findings
   (not restating the matrix) from across all five files in priority order.
4. A **Re-running this audit** section pointing back at `/audit`.

Do not fabricate a "Verified" evidence claim in any file — only state what was actually
checked in that run.
