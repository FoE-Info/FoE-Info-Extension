# Specification: Codebase Modernization (Milestone 1)

## Overview

Decompose legacy monolithic files across `src/js/` to comply with the project's $\le 500$ lines ceiling and active refactoring target of $\le 250$ lines per file, while maintaining 100% test parity, BigNumber math precision, and dynamic runtime metadata invariants.

## Requirements

1. **Modular Architecture**: All new and refactored files in `src/js/` must be $\le 250$ lines.
2. **BigNumber Precision**: All arithmetic calculations involving Forge Points, guild boost factors, lock requirements, or donation payouts must use `bignumber.js`.
3. **No Dynamic Regressions**: Existing service registrations with `MessageDispatcher.js` and public APIs must maintain full backward compatibility.
4. **Test-First Parity**: Every extracted module must be accompanied by a dedicated unit test suite under `tests/`.

## Completed Phase: Cluster 4 (UI & Panels Decomposition)

- **Result**: All 7 slices (4A–4G) complete — `src/js/ui/indexUiBindings.js` (422L $\rightarrow$ 220L) via `uiElementBindings.js`, `runtimeLifecycle.js`, `networkBridge.js` with 3 new test suites. Track status: `complete`.
