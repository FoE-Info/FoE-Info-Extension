# Project roadmap

This document owns direction, intended outcomes, priorities and sequencing.
[Tracked tasks](tasks.md) owns execution status, dependencies, acceptance criteria
and completion evidence. Reconciled 2026-09-30 against source, former plans and
local Graphify findings; the detailed reconciliation is retained in tasks.

## Direction

Improve architecture incrementally while preserving player behavior. Keep
cohesive feature modules, the supported CommonJS/ESM hybrid, and Node 26.8.2.
Retain both passive intake paths, including the MAIN-world observer needed for
metadata compatibility. Never send game actions, automate gameplay, or write
into game frames. Numeric entity data must come from observed metadata; FP,
boosts, treasury, and locks retain BigNumber with explicit rounding.

[Architecture](architecture.md), [security](../SECURITY.md) and
[contribution policy](../CONTRIBUTING.md) own boundaries and delivery rules.
Preserve implemented consolidation, passive intake, bounded canonical caches,
metadata recovery, explicit rounding and the existing verification harness.
Do not repeat completed refactors merely because historical plans describe them.

## R0: Finish pending work

Establish behavioral acceptance for the pending migration, registration and
presentation changes before building further work on them. Outcome: a verified
composition and storage foundation with clear limitations. [Tasks](tasks.md#r0-pending-work-acceptance).

## R1: Enforce domain boundaries

Make service/presentation and calculator/state boundaries executable while
preserving startup, rewards, view switching and grouped goods behavior. Keep
cohesive modules and the existing composition point. Sequence after R0 acceptance
for shared wiring. [Tasks](tasks.md#r1-domain-boundaries).

## R2: Repair cache and persistence lifecycle

Unify persistent metadata admission and bound derived GB aliases. Establish reset
subscription ownership and the actual cross-context storage guarantee through
reproducers. Independent cache investigations can proceed alongside R1; avoid
schema changes or wholesale store replacement without evidence.
[Tasks](tasks.md#r2-cache-and-persistence-lifecycle).

## R3: Expand types and validate numerical semantics

Extend the passing strict calculator slice incrementally, starting with spatial
utilities and then military boosts. Resolve numerical discrepancies only after
realistic fixtures and observed metadata establish expected behavior. Sequence
formatter-dependent work after R1. [Tasks](tasks.md#r3-types-and-numerical-semantics).

## R4: Target evidence-driven follow-through

Strengthen Graphify scope and CI artifact regressions, then use bounded runtime,
input-provenance and callsite investigations to select worthwhile fixes. Browser
acceptance depends on an available session; optimization depends on measurements.
Configured external exports remain until an explicit product decision.
[Tasks](tasks.md#r4-focused-follow-through).

## Deferred direction

Broad causal tracing, mandatory browser gates, full ESM conversion, extra agent
entrypoints, arbitrary file-size splits and new player features are deferred.
Do not optimize bundles, fonts or rendering without measured cost. These choices
can be revisited when evidence changes the expected value, rather than becoming
an automatic implementation queue.

## Updating direction

Revise this roadmap when intended outcomes, priority order, dependencies between
outcomes or deferrals change. Routine implementation status and verification
updates belong in tasks; technical decisions belong in their design guides.
