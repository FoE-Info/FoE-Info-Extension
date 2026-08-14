# Webpack Entry Architecture

> 7 nodes

## Key Concepts

- **Webpack Entry Point Architecture** (8 connections) — `README.md`
- **src/js/devtools.js** (2 connections) — `README.md`
- **src/js/options.js** (2 connections) — `README.md`
- **src/js/fn/ (shared DOM/storage/formatting helpers)** (1 connections) — `README.md`
- **src/js/vars/ (feature state and defaults)** (1 connections) — `README.md`
- **devtools.html (DevTools Page Entry)** (1 connections) — `src/chrome/devtools.html`
- **Webpack Build-Time Flags (DEV, WEBSTORE, EXT_NAME)** (1 connections) — `README.md`

## Relationships

- [Entry Page ↔ Script Wiring](Entry_Page_%E2%86%94_Script_Wiring.md) (2 shared connections)
- [Options Page Preference Groups](Options_Page_Preference_Groups.md) (1 shared connections)
- [Security Policy & Data Handling](Security_Policy_%26_Data_Handling.md) (1 shared connections)

## Source Files

- `README.md`
- `src/chrome/devtools.html`

## Audit Trail

- EXTRACTED: 8 (80%)
- INFERRED: 2 (20%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*