---
name: subagent-driven-development
description: Execute plans via delegate_task subagents with two-stage review (spec
  then quality).
version: 1.2.0
author: Hermes Agent (Curator scaffold)
license: MIT
platforms:
- linux
- macos
- windows
metadata:
  hermes:
    tags:
    - delegation
    - subagent
    - implementation
    - workflow
    - parallel
    - scaffold
    related_skills:
    - requesting-code-review
    - test-driven-development
    - context-budget-discipline
    - gates-taxonomy
    category: software-development
---

# Subagent-Driven Development (Scaffold)

## When to Use
- When you have a clear implementation plan that can be broken into independent tasks.
- When you want to leverage parallel execution via subagents for faster iteration.
- When you require a two-stage review process (spec compliance then code quality) to ensure high quality.
- When tasks are well-defined and can be executed by a fresh subagent without shared context.

## When Not to Use
- For tasks that require tight coupling or shared state between subtasks.
- When the task is too small to justify the overhead of spawning a subagent.
- When you need real-time interaction or user feedback during the task execution.
- When the task involves sequential dependencies that cannot be parallelized.

## Overview
Execute implementation plans by dispatching fresh subagents per task with a systematic two-stage review process.

**Core pattern:** 
1. **Spec Review Stage**: A spec reviewer subagent checks the task description against the overall plan and requirements.
2. **Implementation Stage**: An implementer subagent writes the code to satisfy the task.
3. **Quality Review Stage**: A quality reviewer subagent checks the implementation for code quality, adherence to standards, and spec compliance.

This pattern ensures that each task is independently verified for correctness and quality before moving on.

## Workflow
1. **Task Definition**: Break the implementation plan into granular tasks (see Task Granularity Guidance below).
2. **Spec Review**: For each task, spawn a subagent (spec reviewer) to validate the task description and produce a spec compliance signal.
3. **Implementation**: If spec review passes, spawn an implementer subagent to write the code for the task.
4. **Quality Review**: After implementation, spawn a quality reviewer subagent to check the code for quality and correctness.
5. **Integration**: Only after both reviews pass, consider the task complete and move to the next.

## Task Granularity Guidance
- Tasks should be small enough to be completed by a subagent in a short time (e.g., 5-30 minutes of work).
- Each task should have a clear, testable outcome.
- Avoid tasks that are too broad (e.g., "implement feature X") and instead break them down (e.g., "create database model for Y", "write API endpoint for Z").
- Tasks should be independent; if they share state, consider combining them or using a different pattern.

## Two-Stage Review Details
### Stage 1: Spec Compliance
- **Role**: Spec Reviewer
- **Goal**: Verify that the task description is clear, achievable, and aligned with the overall plan.
- **Output**: A clear signal (pass/fail) and feedback if the task needs refinement.

### Stage 2: Code Quality
- **Role**: Quality Reviewer
- **Goal**: Check the implementation for:
  - Adherence to coding standards
  - Proper error handling
  - Unit test coverage (if applicable)
  - Spec compliance (double-check)
  - No obvious bugs
- **Output**: A clear signal (pass/fail) and feedback for improvements.

## Red Flags
- **Spec Reviewer keeps failing**: The task description is too vague or misaligned. Refine the task.
- **Quality Reviewer keeps failing**: The implementer is not meeting standards. Consider pair programming or breaking the task further.
- **Spec and Quality Reviewers pass but integration fails**: There might be hidden dependencies between tasks. Re-evaluate task boundaries.
- **Subagents are timing out**: Tasks might be too complex. Break them down.

## References
- [Harness Adapters](../../references/harness-adapters.md): Host-specific tool names, dispatch, and isolation for Antigravity and opencode.

## Notes
- This skill is designed to be loaded on-demand for specific implementation cycles.
- It is not intended to be always-on; load it when you are about to execute a plan using subagent-driven development.

