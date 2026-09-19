# Subagent Routing Table

Dispatch a subagent only for an independently bounded investigation, implementation, or review. Profile-driven roles require the named target or topic in the dispatch prompt.

| If the task involves... | Dispatch subagent |
| --- | --- |
| One FoE-Info, peer, metadata, or baseline graph investigation | `graph-knowledge-explorer` with a graph target profile |
| Comparing FoE-Info with Forge-Hammer, LoW-Tool, or frozen v1 | `cross-codebase-comparator` with a comparison profile |
| Great Buildings, sniping, settlements, or Historical Allies | `foe-economy-analyst` with mechanics topics |
| Combat boosts, GBG, GE, QI, or PvP | `foe-combat-analyst` with mechanics topics |
| MV3 architecture, DevTools iframe, CSP, or cross-context messaging | `chrome-extension-architect` |
| CDP pipelines, mock RPC, DOM assertions, or live panel errors | `cdp-test-engineer` |
| Independent code review against repository invariants | `code-reviewer` |
| Full legacy decomposition and gradual TypeScript migration planning | `codebase-modernization-architect` |
| Manifest V3 security, DOM XSS, credentials, or host permissions | `extension-security-auditor` |
| Discord webhooks, rate limits, embeds, or snipe notifications | `discord-webhook-integrator` |
| Web Store packaging, manifest version sync, or changelogs | `extension-release-engineer` |
| Webpack 5 targets, assets, splitting, or MV3 packaging | `webpack-expert` |
| Bootstrap/SCSS design systems and responsive DevTools layouts | `ui-design-system-architect` |
| Locale dictionaries, translation bindings, or i18n parity | `localization-expert` |

Profiles live under `.agents/references/agents/`. Antigravity dispatch syntax lives in [Environment Reference](antigravity-environment.md).
