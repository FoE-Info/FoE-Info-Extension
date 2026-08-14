# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FoE Info is a Chrome Manifest V3 extension for Forge of Empires: a DevTools
panel that intercepts the game's own API responses, parses player/guild data
client-side, and renders derived tools alongside the game. There is no backend
— all logic runs in the browser against traffic the game already sends.

## Scope

- Root instructions apply repository-wide.
- Nested `CLAUDE.md` files (`src/CLAUDE.md`, `src/chrome/CLAUDE.md`, `src/css/CLAUDE.md`, `src/js/CLAUDE.md`) supplement these root instructions when working in their directory — Claude Code loads them automatically, no manual dispatch needed.
- Preserve unrelated working-tree changes.

## Commands

- Use npm 12 with Node.js 24+. Treat `package-lock.json` as authoritative; do not add another lockfile.
- **There is no lint, type-check, or test runner** — Prettier formatting is the only automated gate. Treat manual verification (build + exercise the unpacked extension) as required, not optional, for behavioral changes.
- Load `build/FoE-Info-DEV` as an unpacked extension in `chrome://extensions` to exercise a change; there is no other way to validate feature behavior.

## Git & Remote Workflow Invariants

- Never push or modify remote branches without explicit, prior user approval in chat. Local commits and branch checkouts are fine; remote push operations wait for authorization.
- Never delete, prune, or force-reset local topic or scratch branches (`fix/...`, `feat/...`) without explicit, prior user confirmation.

## Key Conventions

- Run `graphify update .` after code changes; treat `graphify-out/` as generated.
- See `README.md` for setup/debugging steps and `docs/knowledgebase/audit-summary.md` for known risk areas (unescaped `innerHTML` sinks, a storage helper missing `return`, a no-op `webRequest` listener).
