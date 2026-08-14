# src/chrome — Manifest & Templates

Supplements `.agents/instructions/source.md`.

## Manifest

- `manifest.json` / `manifest_release.json` are Manifest V3. `name`/`version` are intentionally left empty — `WebpackExtensionManifestPlugin` fills them from `package.json` at build time. Don't hardcode values there.
- CSP is `script-src 'self'` with no inline scripts/handlers — keep it that way. Any new script needs to ship as a bundled file, not an inline `<script>` or `on*` attribute.
- `host_permissions` are scoped, not `<all_urls>` — if a new feature needs a new host, add the narrowest permission that works.
- `chrome.webRequest` blocking (`extraInfoSpec: ['blocking']`) is unusable for a Web Store extension since Chrome 121 — MV3 restricts blocking `webRequest` to force-installed/enterprise installs. Any header-modification work must use `declarativeNetRequest` with a `modifyHeaders` rule instead, not the legacy blocking API.
- `web_accessible_resources` and `externally_connectable` currently expose surface (`browser-polyfill.js`, game-page messaging) with no corresponding content script or `onMessageExternal` listener consuming it. Don't add new unused permission surface "for later" — only widen it when something in `src/` actually calls it.

## HTML templates

- `panel.html` and `devtools.html` have no `<body>` element — this only works because `HtmlWebpackPlugin` falls back to injecting bundles into `<head>`. If you add a new template, include an explicit `<body>`.
- `panel.html` loads Google Fonts over the network at runtime. Prefer self-hosting any new web fonts rather than adding another external font fetch — DevTools panels should work offline.
