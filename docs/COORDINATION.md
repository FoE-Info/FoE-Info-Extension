# Cross-Agent Coordination

This repo is worked on by AI coding agents. **`docs/README.md` is the single
coordination hub** every agent should read at session start, alongside
`AGENTS.md`. Live work/todos live in `docs/STATUS.md`; project history and
resume-safely notes are in `docs/HANDOFF.md`; host-specific wiring is in
`docs/OPENCODE.md`. Whichever agent is reading this should treat the status
board as current status, not a changelog — update `docs/STATUS.md` when
something here goes stale rather than letting it drift.

## Roster and roles

- **Antigravity** — the MAIN agent. Owns and canonicalizes `.agents/` (36 subagent
  personas, 17 rules, 53 skills, 5 lifecycle hooks). User has an Ultra package that
  refreshes roughly every 2 days.
- **opencode** — the primary CLI agent, running against a local LLM via
  `llama-swap` (see `.agents/scripts/llama-swap-lifecycle.sh` and the llama-swap
  `config.yaml`) or a cloud fallback. Adapts Antigravity's canonical setup
  (`.agents/`) through its own `.opencode/` directory and `docs/OPENCODE.md`.
- **The user** — coordinates activity from outside the repo (browser-based team
  chat, console logs, screenshots, bug reports) and turns observations into scoped
  prompts for whichever agent is active. The user does the external coordination a
  separate assistant previously performed.

## Standing rules for every agent, every session

1. **No AI co-authorship or attribution markers in any commit**, ever, unless the
   user explicitly asks for one this specific time. Already codified in
   `.agents/rules/unslop-commit.md` — this is not optional or agent-specific.
2. **No commit or push without the user's explicit approval for that specific
   change.** A prior incident: an agent session committed with AI attribution and
   pushed to GitHub without asking — do not repeat this, regardless of which tool.
3. **Investigate and report before fixing**, unless a fix is explicitly
   pre-authorized (e.g. the subagent/rule count-mismatch fix was authorized as a
   standing exception). Default to reporting findings and waiting for a go-ahead.
4. **One capability/change at a time, verified live, before moving to the next.**
   Don't batch unverified changes.
5. **Flag any staleness you find.** If you notice anything stale, wrong,
   inconsistent, half-written, or referencing something that no longer exists in
   `.agents/` or the ecosystem docs — even if unrelated to your current task — say
   so explicitly in your report. Don't silently fix it and don't silently ignore it.
6. **`.agents/` is canonical and Antigravity's.** Other agents adapt to it via their
   own tool-specific directory (`.opencode/`) rather than modifying it, except for
   narrow, pre-authorized text/count corrections.
7. **Browser/login test flows must reuse the existing scripted CDP flow** at
   `tests/cdp/verify-startup-logs.mjs`. Never touch the actual account/login
   session, never use mouse/keyboard browser automation for testing — an ambiguous
   "cold login" instruction previously caused a real account logout and wasted a
   large amount of token budget.
8. **Graphify semantic extraction (and any agent's own local-LLM calls) must use
   the local `llama-swap` backend only, never a cloud/paid API.** See
   `.agents/scripts/llama-swap-lifecycle.sh` for the env vars
   (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `GRAPHIFY_BACKEND`, `OPENAI_MODEL`).

## Current status

Live thread states, todos, and recently-completed work are maintained in
`docs/STATUS.md` — see that board for current status instead of this file.
Open items that span coordination (rather than a single thread) are noted there
under "Open threads requiring a decision".
