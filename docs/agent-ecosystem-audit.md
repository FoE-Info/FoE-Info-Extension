# Agent ecosystem accuracy audit — 2026-09-08

This is a separate documentation pass from the former Codex hook-parity task
(Codex was decommissioned on 2026-09-09; opencode is the sole coding host — see
`docs/OPENCODE.md`). No application source, tests, hook implementations, or host
registrations were changed by this pass. No commits are authorized until the
user reviews this ledger.

## Coverage

- Inventoried all 31 personas, 16 rules (9 always-on / 7 model-decision), and 51 skills; compared them with AGENTS.md and the skill directory registration.
- Reviewed persona/rule bodies and all skill entrypoints; scanned 343 existing ecosystem Markdown files, including skill references, for broken local Markdown links.
- Checked frontmatter with a YAML parser, required fields, persona names, and `subagent: true`.
- Checked hook/MCP/skill registrations and their actual referenced scripts, graph files, package runners, and relevant installed-tool schemas.
- Reviewed current ecosystem documentation and distinguished historical plans from executable/current guidance. Historical plans already superseded by HANDOFF were not rewritten as current facts.

No missing persona/rule frontmatter, empty main runbook, roster orphan, or missing configured graph/MCP executable was found. The 141-guide library and its category counts are correct. The earlier 28/31 and 15/16 corrections predate this pass.

## Fixed: root and current documentation

| File                | Correction                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`         | Separated the actual ESLint runner from Prettier commands; listed all four registered Antigravity graph-guard tool matchers.                                                                                                                                             |
| `docs/OPENCODE.md`  | Documented the hook-based grid-check for host parity. The former `docs/CODEX.md` was decommissioned with the Codex host (2026-09-09).                                                                                                                                    |
| `docs/HANDOFF.md`   | Corrected the removed three-second early-render fallback and changed MCP registrations; distinguished uncommitted follow-ups from historical takeover results; replaced the obsolete unmeasured-cold-entry TODO with measured endpoints and the account-preserving flow. |
| `docs/debugging.md` | Replaced the nonexistent StartupRenderOrchestrator logger tag with its real caller tag, StartupService, and P5g/P6g timing markers.                                                                                                                                      |

## Fixed: rules

| File under `.agents/rules/` | Correction                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superpowers.md`            | Removed nonexistent bootstrap-expert and extension-qa-auditor alternatives; retained the registered UI and CDP specialists already in those rows.                                                                                       |
| `subagent-delegation.md`    | Updated the runtime fact from Node 20+ to the package's Node 24+ requirement.                                                                                                                                                           |
| `graphify.md`               | Replaced missing `graph:update` runner with `graph:foe-info:ast`; described the original shared 1800-second stamp check accurately, including its pre-call/update-stamping limitation.                                                  |
| `modular-architecture.md`   | Moved donation/GBG service names out of the pure-math column, expeditionTables into UI, and removed the nonexistent HistoricalAlliesService math entry. Marked the placement table as partly proposed, not an implementation inventory. |

## Fixed: personas

All paths in this table are under `.agents/agents/`.

| File                                  | Correction                                                                                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chrome-extension-architect.md`       | Replaced nonexistent CustomEvent/foe-info-message transport with postMessage FOE_INFO_XHR and runtime FOE_INFO_NET_DATA.                                                                                                                                                          |
| `webpack-expert.md`                   | Same transport correction; corrected the production ZIP filename pattern.                                                                                                                                                                                                         |
| `foe-game-data-expert.md`             | Corrected the interceptor/content-bridge transport description.                                                                                                                                                                                                                   |
| `javascript-expert.md`                | Node 20+ → Node 24+.                                                                                                                                                                                                                                                              |
| `extension-release-engineer.md`       | Four-stage → five-stage verification gate.                                                                                                                                                                                                                                        |
| `codebase-modernization-architect.md` | Removed obsolete per-file line-count snapshots from the active target inventory.                                                                                                                                                                                                  |
| `monolith-refactoring-specialist.md`  | Removed obsolete line counts and the nonexistent HistoricalAlliesService filename alternative.                                                                                                                                                                                    |
| `foe-historical-allies-expert.md`     | Corrected handler filename and registered RPC to AllyService/getAssignedAllies; described actual assignedAllies storage, labeling further state integration as proposed; corrected nonexistent metadata sources; corrected central registration; labeled absent proposed modules. |
| `foe-settlements-expert.md`           | Replaced nonexistent consolidated metadata filenames with discovery against available captures/graph; corrected central registration; labeled proposed modules.                                                                                                                   |
| `foe-city-optimizer.md`               | Removed nonexistent city/inventory snapshot assumptions and fixed building-count assumption; documented available corpus discovery; labeled proposed modules.                                                                                                                     |
| `foe-antiques-dealer-expert.md`       | Replaced three nonexistent metadata filenames with available-capture discovery; labeled proposed modules.                                                                                                                                                                         |
| `foe-combat-boost-analyst.md`         | Replaced nonexistent boost/military files and unverified dataset counts with current-corpus discovery; labeled proposed modules.                                                                                                                                                  |
| `foe-event-mechanics-expert.md`       | Replaced serviceRegistry/registerService references with the existing registerServices owner and register(dispatcher) interface; labeled proposed modules.                                                                                                                        |
| `foe-guild-battlegrounds-expert.md`   | Corrected central registration and labeled proposed modules.                                                                                                                                                                                                                      |
| `foe-guild-expedition-expert.md`      | Corrected central registration and labeled proposed modules.                                                                                                                                                                                                                      |
| `foe-quantum-incursions-expert.md`    | Corrected central registration and labeled proposed modules.                                                                                                                                                                                                                      |
| `foe-pvp-expert.md`                   | Corrected central registration and labeled proposed modules.                                                                                                                                                                                                                      |
| `foe-sniping-expert.md`               | Corrected central registration and labeled proposed modules; rounding instructions were deliberately not changed.                                                                                                                                                                 |
| `foe-great-buildings-expert.md`       | Labeled the absent renderGbCards module as proposed; rounding instructions were deliberately not changed.                                                                                                                                                                         |

## Fixed: skills

Paths below are under `.agents/skills/`; unqualified entries mean that skill's `SKILL.md`.

| File                                                                         | Correction                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modern-web-guidance`                                                        | Replaced two dead guide links with the existing scrollytelling and size-aware-styling guides.                                                                                                                         |
| `chrome-devtools`                                                            | Fixed the troubleshooting link; distinguished the workspace launch wrapper from upstream behavior; documented the pipe-only extensions category and current-schema authority instead of asserting a fixed tool count. |
| `chrome-devtools/references/advanced-usage.md`                               | Fixed the troubleshooting reference's relative path.                                                                                                                                                                  |
| `ephemeral-llama-swap`                                                       | Replaced three nonexistent wrapper filenames and nonexistent deep/force package runners with actual scripts and runner arguments; removed an unsupported GPU-model/VRAM assumption.                                   |
| `graphify`                                                                   | Replaced the nonexistent metadata export package runner with the existing local wrapper's export command.                                                                                                             |
| `add-rpc-service`                                                            | Replaced new index.js switch registration with registerServices/register(dispatcher); explicitly included the ESLint command in verification.                                                                         |
| `add-feature-panel`                                                          | Corrected the utilities directory and dynamic translation API to utils/i18n and t().                                                                                                                                  |
| `migrate-jquery-to-native`                                                   | Corrected three translation-engine/import references to utils/i18n; the legacy compatibility shim remains intact.                                                                                                     |
| `writing-plans`                                                              | Corrected the five-stage verification sequence, including i18n; kept typecheck as a separate command.                                                                                                                 |
| `package-release`                                                            | Replaced the incomplete preflight and conditional-lint claim with the actual verification gate plus typecheck.                                                                                                        |
| `service-extractor`                                                          | Corrected the verification command, distinguished graph queries from refreshes, removed fabricated example imports/state fields, and corrected service registration/import guidance.                                  |
| `codebase-modernization-planner`                                             | Removed stale active line-count claims; labeled the final size as a target; corrected the AST-command-as-query claim.                                                                                                 |
| `codebase-modernization-planner/references/monolith-decomposition-phases.md` | Explicitly labeled the retained historical inventory and proposed target filenames.                                                                                                                                   |
| `systematic-debugging`                                                       | Corrected the root-cause-tracing reference directory.                                                                                                                                                                 |
| `supply-chain-risk-auditor`                                                  | Corrected both results-template references to the references directory.                                                                                                                                               |
| `cookie-debugging`                                                           | Corrected navigate_page's reload argument to type: "reload".                                                                                                                                                          |
| `debug-optimize-lcp`                                                         | Corrected resource-type enum casing to image/font.                                                                                                                                                                    |
| `debate-review`                                                              | Corrected the invariant checklist count from seven to eight.                                                                                                                                                          |

## Needs your call — not changed

- **Rounding:** codebase-modernization-architect, foe-game-data-expert, foe-great-buildings-expert, foe-sniping-expert, and javascript-expert prescribe ROUND_CEIL where the precision rule prescribes ROUND_HALF_UP. Decide whether to replace blanket persona instructions or document operation-specific exceptions.
- **Logging:** debuggability-by-design and code-reviewer require cache-hit logging, conflicting with debugging.md's hot-path batch/miss discipline. Claims of complete Standard Mode silence also conflict with intentional warning/error output. Decide the canonical wording before propagating it.
- **File limits:** modular-architecture permits an 800-line dispatch-table exception while AGENTS.md and review guidance impose a 600-line hard cap. Keep or remove that exception explicitly.
- **Unavailable imported specialists/runbooks:** complexity-cuts requires invariant-guard (and mentions math-guard); brooks-lint names logic-lens, security-auditor, and lint-and-validate; codebase-audit-pre-push names security-auditor/git-pushing; cross-platform-contract-propagation-audit names api-analyzer, spec-to-code-compliance, and technical-change-tracker; git-hooks-automation names bash-pro/github-actions-templates; frontend-security-coder names security-auditor. These are not installed under those names. Decide which to map to existing roles, install, or remove; mandatory missing delegates can block those workflows.
- **Workflow policy:** brainstorming approval requirements, stop-on-any-uncertainty review guidance, and subagent-driven-development's repeated review/model-escalation requirements need reconciliation with the desired autonomous, economical workflow. These are substantive policy choices, not typographical corrections.
- **Antigravity-only runtime assumptions:** relative hook script commands and workspace-sharing/isolation claims need a native Antigravity host check. Local file existence does not prove the host's working directory or isolation behavior. No registration was changed based on that uncertainty.

This audit does not certify game formulas, imported third-party technical claims, or live Antigravity host behavior. Proposed modules were labeled, not implemented.

## Verification

- YAML/frontmatter and roster checks passed: 31 personas, 16 rules (9 always_on, 7 model_decision), 51 skills.
- Local Markdown reference check passed across 345 files and 178 local links, with no missing targets.
- `npm run verify` passed: formatting, ESLint (0 errors, 203 existing warnings), i18n parity, 572 passing tests (0 failures), and development build. Full output: `/tmp/foe-ecosystem-audit-verify.log`.
- `npm run typecheck` and `git diff --check` passed.
- No commits were made. Existing application and hook-parity changes remain separate, uncommitted work.
