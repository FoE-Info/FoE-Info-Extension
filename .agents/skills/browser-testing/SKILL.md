---
name: browser-testing
description: 'Test game telemetry and extension panel in the browser.'
---

# Browser Testing & Observation Skill

This skill teaches the agent how to observe Forge of Empires game telemetry and test the FoE-Info extension panel live in the user's attached browser session.

---

## Non-Interference Invariants

1. **Zero autonomous browser control**: Never close tabs, navigate away from the game, or steal window focus.
2. **Background context**: Always interact with browser sessions in the background context.
3. **Dual-mode scope**:
   - **Game tabs (`*forgeofempires.com*`)**: Read-only passive observation. Never click, type, or navigate.
   - **Extension panel (`chrome-extension://*`)**: Active inspection and interaction allowed.

---

## 1. Health Check & Discovery

Verify the attached browser session and enumerate tabs before interacting.

---

## 2. Binding to Targets

Bind sessions to specific target tabs using URL matching:

- Forge of Empires game tab (read-only telemetry): `*forgeofempires.com*`
- FoE-Info DevTools extension panel: `chrome-extension://*/panel.html`

---

## 3. Observing Game Telemetry (Read-Only)

Monitor InnoGames JSON-RPC messages and engine console output passively from the game tab. Never click, type, or navigate there.

---

## 4. Testing & Inspecting the FoE-Info Panel

Perform active inspection, DOM state extraction, and JavaScript evaluation on the extension panel only:

- Extract full DOM state of panel.html
- Query rendered text or extract structured content
- Evaluate JavaScript in panel context (e.g. count nav links)
- Tail panel console errors

---

## 5. Pre-Merge Verification Checklist

Before claiming any extension UI feature or RPC handler is verified live:

1. Build development bundle: `npm run build:dev`
2. Confirm the attached browser session is connected.
3. Verify panel console yields zero unhandled exceptions.
4. Verify DOM rendering confirms expected cards and elements render.

---

## Modern Web Guidance (Project Overlay)

Apply the FoE-Info modern web conventions: [project conventions](../../rules/modern-web-conventions.md).
Primary reference categories: `accessibility/`, `performance/`.
Uphold:

- Assert live regions/roles and table semantics
- Check for detached observers
- Measure render timing after scheduler changes
