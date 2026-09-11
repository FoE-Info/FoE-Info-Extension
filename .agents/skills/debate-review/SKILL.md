---
name: debate-review
description: "Two-model adversarial debate on plans, PRs, and designs."
---

# Debate Review & Adversarial Stress-Testing

This skill runs an adversarial debate loop using [`adversarial-debater`](../../agents/adversarial-debater.md) to challenge decisions, stress-test implementation plans, refute false positives in code reviews, and expose blind spots before code merges.

---

## 1. When to Use

- **Pre-Implementation**: Stress-testing an architecture proposal or complex implementation plan before writing code.
- **Pre-Merge Review**: Challenging findings from [`code-reviewer`](../../agents/code-reviewer.md) to eliminate false positives and catch unexamined failure modes.
- **Architectural Trade-offs**: Evaluating competing options (Option A vs Option B) with an uncompromising devil's advocate.

---

## 2. Protocol 1: Adversarial Code Review (Two-Pass Review)

Use this workflow to review significant pull requests or complex feature diffs:

```text
┌─────────────────┐      ┌────────────────────────┐      ┌─────────────────────────┐
│  Stage 1: Gate  │ ───> │   Stage 2: Adversarial │ ───> │   Stage 3: Synthesis    │
│  code-reviewer  │      │   adversarial-debater  │      │   Lead / Orchestrator   │
└─────────────────┘      └────────────────────────┘      └─────────────────────────┘
```

### Stage 1: Initial Invariant Gate
Dispatch [`code-reviewer`](../../agents/code-reviewer.md) to audit the diff against the current eight-gate checklist in that role (including verification and debuggability).

### Stage 2: Adversarial Challenge
Invoke [`adversarial-debater`](../../agents/adversarial-debater.md) with:
1. The git diff (`git diff <base>...<head>`).
2. The findings produced in Stage 1.
3. Instructions to:
   - **Triage Stage 1 findings**: `refute` factually incorrect or already-guarded claims; `downgrade` over-inflated non-blocking concerns; `confirm` true material bugs.
   - **Gap sweep**: Probe unexamined trust boundaries, race conditions, memory leaks, or unhandled RPC failure states.

### Stage 3: Orchestrator Ruling
The Lead / Orchestrator reviews the debate output, discards refuted items, and fixes confirmed bugs or gap findings before merging.

---

## 3. Protocol 2: Plan & Architecture Stress-Testing

Before implementing a complex multi-stage feature:
1. Dispatch [`adversarial-debater`](../../agents/adversarial-debater.md) with the draft plan or RFC document.
2. The debater evaluates:
   - **Over-Engineering**: Can this be implemented in 50 lines instead of 200?
   - **Failure Modes**: What happens on cold cache, network drops, or corrupt InnoGames RPC packets?
   - **Alternative Architectures**: Is there a simpler, more maintainable pattern?
3. Incorporate debater counter-arguments into the final implementation plan.

---

## 4. References & Schemas

- [`references/review-debate.md`](references/review-debate.md): Prompt template for debate review pass.
- [`references/review-main.md`](references/review-main.md): Prompt template for primary reviewer pass.
- [`references/review-rebuttal.md`](references/review-rebuttal.md): Rebuttal and synthesis prompt structure.
- [`references/schema.md`](references/schema.md): Formal JSON findings and debate verdict schema.
