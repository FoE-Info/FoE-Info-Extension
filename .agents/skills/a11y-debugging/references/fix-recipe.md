## Recipe (fix mode)

1. **Baseline.** Audit with `name: "before"` and `format: "compact"`.
2. **Plan + apply.** For each violation:
   - `Source:` line present → open that file at that line. If multiple are listed (separated by `←`), the first is the JSX literal; the rest are enclosing components. Use `Symbol` to disambiguate.
   - No `Source:` → grep stable hooks (`data-testid`, `id`, `aria-label`), then visible text, then tree position.
   - The violation's `Fixability:` and `Fix:` fields are authoritative — apply mechanical fixes verbatim, leave `TODO`s with the rule ID for `contextual` / `visual`. Never invent content.
   - Group same-file edits into one operation.
   - Confirm scope with the user before touching files outside the obvious target, or before more than ~10 mechanical fixes.
3. **Verify.** Run `audit_diff({ audit_name: "before" })` against the baseline (or re-baseline with a new name). Confirm `-fixed` covers your targets and `+new` is empty.

`Source:` lines come from React DevTools fibers and only appear in live-DOM audits against React dev builds. Static audits won't have them — fall back to selectors.

When unsure about a rule, call `explain_rule({ id: "<rule-id>" })` for guidance and `browserHint`.

## When to bail (fix mode)

- A violation has no `Fix:` directive — leave a `TODO`, don't guess.
- Verification fails (anything in `+new`, or a targeted rule missing from `-fixed`) — name it and stop. Do not iterate silently.

## Output (fix mode)

Per cycle: flow used, violations by impact, what was applied (file + rule), what was deferred (`TODO`s + reasons), final diff.
