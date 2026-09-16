---
name: agent-orchestration-improve-agent
description: 'Improve agents via performance analysis, prompt tuning, and iteration.'
---

# Agent Orchestration Improvement

Improve a delegated agent workflow using measured baselines, bounded prompt or routing changes, and repeatable evaluation.

## When to Use

- A subagent repeatedly misses a verifiable requirement.
- Routing, prompts, tool policy, or evaluation gates need measured improvement.

## Procedure

1. Define the failing task class and objective ground signals.
2. Record a baseline across representative cases.
3. Change one prompt, routing, tool, or memory variable at a time.
4. Re-run the same cases and compare correctness, cost, latency, and regressions.
5. Keep only improvements supported by evidence; revert neutral or harmful changes.
6. Read [Reference catalog](references/README.md) and load `references/detailed-guide.md` for full experiment, rollout, and monitoring patterns.

## Verification

Report baseline and final measurements, changed variables, regressions checked, and stop conditions.
