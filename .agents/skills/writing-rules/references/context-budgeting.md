# Context Budgeting & Rule Sizing

Managing rule sizes to protect the model context window.

---

## 1. Character Limits & Thresholds

- **Official Hard Limit**: Every individual rule file is capped at **12,000 characters** max (as defined in `https://antigravity.google/docs/rules-workflows/`).
- **Workspace Budget**: Keep consolidated project rules (`AGENTS.md`) under **18,000 bytes** to prevent excessive prompt overhead.

---

## 2. Preventing Token Bloat

1. **Avoid Overusing `always_on`**:
   - Only place universal, non-negotiable architectural invariants in `always_on`.
   - File-specific guidelines (e.g. testing rules, CSS rules, BigNumber math) belong in `glob` rules.
2. **Be Imperative & Concise**:
   - State constraints, forbidden patterns, and good vs bad examples clearly.
   - Avoid long prose, historical justifications, or repeating general programming knowledge the model already possesses.
3. **Use Code Snippets over Long Explanations**:
   - A short `// GOOD` vs `// BAD` code block conveys requirements faster and with fewer tokens than paragraphs of text.
