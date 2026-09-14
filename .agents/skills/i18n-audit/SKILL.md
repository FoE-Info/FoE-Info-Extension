---
name: i18n-audit
description: 'Audit and synchronize 7-language translation dictionaries.'
---

# i18n Translation Key Parity Audit

This skill guides the agent in maintaining 100% translation dictionary key parity across all supported language files in `src/i18n/`.

---

## Supported Locales

- `en.json` (Canonical reference dictionary)
- `de.json` (German)
- `es.json` (Spanish)
- `fr.json` (French)
- `it.json` (Italian)
- `el.json` (Greek - Modern)
- `gr.json` (Greek - Regional fallback)

---

## Instructions

### 1. Check Parity

Run the parity check script to identify missing or extraneous keys across all language files:

```bash
npm run i18n:check
# or: node scripts/audit-i18n.mjs
```

### 2. Backfill Missing Keys

If any locale is missing translation keys that exist in `en.json`, backfill them automatically:

```bash
npm run i18n:fix
# or: node scripts/audit-i18n.mjs --fix
```

### 3. Adding New UI Strings

Whenever a new feature adds text to `panel.html` or dynamic JavaScript components:

1. Add the key and English text to `src/i18n/en.json`.
2. Run `npm run i18n:fix` to distribute the key to all other locales.
3. Consult `localization-expert` subagent to provide accurate native translations for German, French, Spanish, Italian, and Greek.
4. Format the JSON files:
   ```bash
   npm run format
   ```
5. Verify key parity:
   ```bash
   npm run i18n:check
   ```
## 5. Record Usage in the Skill Work Log

A skill that only accumulates notes never changes behaviour. Record each real
run and fold the lesson back into this file:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> \
  --outcome pass|fail|partial \
  --lesson '<imperative rule + why>'
```

`--outcome` is `pass`, `fail`, or `partial`, and every `--signal` is a command
that can actually fail. Patch the workflow above with the lesson in the same
change — the worklog is the audit trail, `SKILL.md` is what the next run reads.
See [Skill Work Log & Memory](references/skill-memory.md) for the full loop.

