# Test Suite Fixture Pruning Plan (Footprint Optimization Phase 3)

**Date**: 2026-09-14
**Status**: Completed (2026-09-14) — Steps 1–5 complete
**Branch**: `test-fixture-pruning` (worktree: `.worktrees/test-fixture-pruning`)
**Source**: `docs/STATUS.md` Test Suite Footprint Optimization (Phase 3)

> Standing constraint (`AGENTS.md`): no commit/push without explicit user
> approval; investigate-and-report before fixing; one verified change at a time.
> All slices ≤ 100 lines, files ≤ 600 L, BigNumber hybrid preserved, dynamic runtime
> metadata preserved, failing-first tests added where applicable, and `npm run verify`
> green before completion.

---

## 1. Overview & Objectives

The test suite contains over 30 MB and 700,000+ lines of captured JSON fixtures under `tests/fixtures/`.
Much of this disk weight comes from massive raw JSON dumps that either duplicate data or contain thousands of repetitive array entries where tests only assert on basic normalization and a handful of attributes.

Phase 3 aims to systematically prune oversized fixtures while maintaining 100% test coverage and full test suite verification.

---

## 2. Inventory of Oversized Fixtures

| Fixture                                                           | Current Size | Current Lines | Consumers / Usages                                    | Target Action                                                            |
| :---------------------------------------------------------------- | -----------: | ------------: | :---------------------------------------------------- | :----------------------------------------------------------------------- |
| `tests/fixtures/rpc/TradeService.getTradeOffers.json`             |       6.2 MB |       226,659 | 0 direct references in `tests/`                       | **Step 1**: Delete redundant unreferenced file (-6.2 MB / -226k lines)   |
| `tests/fixtures/rpc/har/economy/marketplace_trades.json`          |       7.5 MB |       226,674 | `tests/msg/trade-service.test.mjs` (3,109 offers)     | **Step 2**: Prune to representative offers (~20), update test assertions |
| `tests/fixtures/rpc/har/greatbuildings/construction_ranking.json` |       4.9 MB |       167,688 | `tests/msg/har-great-buildings-ground-truth.test.mjs` | **Step 3**: Prune to representative top ranks                            |
| `tests/fixtures/rpc/OutpostService.getAll.json`                   |       2.1 MB |        61,186 | `tests/protocol/domain-services*.test.mjs`            | **Step 3**: Prune repetitive settlement history                          |
| `tests/fixtures/rpc/har/treasury/guild_overview.json`             |       1.6 MB |        44,426 | 0 direct test references                              | **Step 3**: Prune unreferenced mirrored bundle                           |

---

## 3. Step-by-Step Implementation

- [x] **Step 1: Delete redundant unreferenced `TradeService.getTradeOffers.json`**
  - Verified zero consumers across `src/`, `tests/`, and `scripts/`.
  - Removed file: trimmed 6.2 MB and 226,659 lines.
  - Verified: `npm test` passed (0 failures), full `npm run verify` gate passed cleanly.

- [x] **Step 2: Prune `marketplace_trades.json` and adjust `trade-service.test.mjs`**
  - Selected representative slice of 20 trades covering 1:1, 2:1, 1:2, merchant (0.1), and fractional ratios.
  - Updated `tests/msg/trade-service.test.mjs` offer length and count assertions.
  - Trimmed 7.76 MB and 225,713 lines (-99.6%).
  - Verified: `npm test` and `npm run verify` passed cleanly (0 failures).

- [x] **Step 3: Prune remaining oversized HAR mirrors and settlement dumps**
  - Pruned `construction_ranking.json` to 20 representative captures (reduced 4.80 MB, 164,392 lines).
  - Pruned `OutpostService.getAll.json` settlement playthroughs (reduced 2.09 MB, 60,945 lines).
  - Pruned `guild_overview.json` duplicate clan captures and members list (reduced 1.55 MB, 42,980 lines).
  - Updated `tests/msg/har-great-buildings-ground-truth.test.mjs` captures assertion.
  - Verified all GB, settlement, and protocol tests pass cleanly (0 failures).

- [x] **Step 4: Full verification gate & footprint audit**
  - Ran `npm run verify` (lint, typecheck, rpc contracts, i18n, full test suite, webpack dev build).
  - Total reduction: ~22.4 MB disk space trimmed, ~720,689 lines deleted across test fixtures.

- [x] **Step 5: Documentation & handoff**
  - Update `docs/STATUS.md` and `docs/HANDOFF.md`.
