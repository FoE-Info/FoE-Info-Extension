# src/js — Application Code

Supplements `.agents/instructions/source.md`.

## Layout

- `index.js`, `options.js`, `popup.js`, `devtools.js` are the four Webpack entry points (one per surface).
- `msg/*Service.js` — one file per game-server response type (`GreatBuildingsService`, `OtherPlayerService`, `GuildBattlegroundService`, etc.), parsing DevTools network traffic and rendering the corresponding panel section. New response handling belongs in a new or existing `*Service.js`, not inline in `index.js`.
- `fn/` — shared helpers: `storage.js` (chrome.storage wrapper), `post.js` (Discord webhook posting), `AddElement.js`, `collapse.js`, `constants.js`, `copy.js`, `globals.js`, `helper.js`.
- `vars/` — shared mutable state (currently just `showOptions.js`).

## Known-shape gotchas (check before assuming these work)

- `fn/storage.js`'s `getStorage`/`setStorage`/`removeStorage` must `return` the underlying promise — callers depend on awaiting them. If you touch this file, verify the `return` is actually there.
- `vars/showOptions.js`'s `set()` must update the same object identity that's exported/imported elsewhere, not just an internal copy — named exports captured at import time won't see later mutations of a re-assigned internal object.
- `postToDiscord()` in `fn/post.js` depends on a `getKey()` helper — confirm it's actually defined (not just referenced) before assuming this path works.
- jQuery is provided globally via `webpack.ProvidePlugin` (`$`/`jQuery`) — don't add an explicit `import $ from 'jquery'` on top of that, it's already global in every entry.
- Assignment-vs-comparison bugs (`if ((x.name = 'foo'))`) have crept into a few `msg/*Service.js` conditionals — when editing conditionals in this codebase, double check `===` was intended.
- Prefer `chrome.declarativeNetRequest` for any new request/header manipulation — see `.agents/instructions/chrome.md` for why `webRequest` blocking doesn't work here.
