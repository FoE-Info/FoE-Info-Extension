# FoE-Info Extension Coding Conventions

- **DevTools Network Stream Parsing**:
  - Always guard network payload items against `null` / `undefined` before accessing properties (`if (!msg) continue;`).
  - When parsing `StaticDataService.getMetadata` responses, filter target URLs to `.json` files to avoid JSON parse errors on binary gettext (`.mo`) localization files.
  - Safe fallback for `console.debug`: use `msg.name || msg.identifier || msg.__class__` when logging metadata.
