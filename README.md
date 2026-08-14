# FoE Info

FoE Info is a Chrome Manifest V3 companion extension for Forge of Empires. It
adds a DevTools panel that reads game API responses, derives player and guild
information, and presents configurable tools alongside the game.

## Requirements

- Node.js 24 or newer
- npm 12 (the repository declares `npm@12.0.2`)
- [uv](https://docs.astral.sh/uv/) for optional Python-based repository tooling
- A Chromium-based browser for loading and testing the unpacked extension

## Development setup

1. Clone the repository and open it in your IDE.
2. Run `npm run setup` from the repository root.
3. Optionally install the
   [Prettier VS Code extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).
4. Run `npm run dev` to start the development watcher.
5. Load `build/FoE-Info-DEV` as an unpacked extension.

Use `npm` for project dependencies and scripts, `npx` for Node.js command-line
tools, and `uv`/`uvx` for Python command-line tools. No `.env` file is required
for the extension build.

## Common commands

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `npm run setup`     | Install dependencies and verify npm, uv, uvx, and Prettier |
| `npm run dev`       | Build the development extension and watch for changes      |
| `npm run build:dev` | Produce a one-time development build                       |
| `npm run build`     | Produce the minified Web Store build and ZIP archive       |
| `npm run check`     | Check formatting with the pinned Prettier version          |
| `npm run format`    | Apply project formatting                                   |
| `npm run outdated`  | Check for newer dependency versions                        |
| `npm run analyze`   | Build production assets and generate a bundle report       |

The project does not currently have an automated test suite. Before submitting
a change, run `npm run check`, `npm run build:dev`, and `npm run build`, then
exercise the affected behavior in the unpacked extension. Production builds may
emit Webpack performance warnings for the main and options entry points; these
are size advisories rather than build failures.

## Architecture

Webpack produces four browser entry points:

- `src/js/devtools.js` registers the FoE Info DevTools panel.
- `src/js/index.js` powers the panel, observes completed DevTools network
  requests, parses Forge of Empires API and metadata responses, and dispatches
  them to modules under `src/js/msg/`.
- `src/js/options.js` reads and writes preferences, export targets, and webhook
  configuration through `browser.storage.local`.
- `src/js/popup.js` opens the extension options page from the toolbar popup.

Shared DOM, storage, formatting, and request helpers live under `src/js/fn/`.
Feature state and defaults live under `src/js/vars/`. Webpack injects build-time
flags such as `DEV`, `WEBSTORE`, and `EXT_NAME`; there is no background service
worker.

The extension requests access to Forge of Empires game endpoints, InnoGames
metadata, Google/Googleusercontent endpoints, and Discord webhook endpoints.
Treat intercepted game responses, player information, stored webhook URLs, and
exported data as sensitive. Keep new permissions and remote destinations as
narrow as possible, and never commit real webhook URLs or captured player data.

## Install the unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `build/FoE-Info-DEV`.

After rebuilding, use the extension card's reload button in
`chrome://extensions`, then reload the game page and reopen DevTools if needed.

## Using and debugging FoE Info

1. Open a Forge of Empires world, such as
   `https://en0.forgeofempires.com`.
2. Open DevTools with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>.
3. Find **FoE-Info-DEV** in the DevTools panel overflow menu.
4. Start or reload the game so the panel can observe network responses.

Right-click inside the FoE Info panel and select **Inspect** to open its own
console. Clicking the FoE Info logo enables the extension's additional debug
output.

## Repository tooling

The repository includes a local Graphify knowledge graph for code navigation.
After changing source code, run `npm run graphify:update`; use
`npm run graphify:status` to check hooks and graph integrity. Initial Graphify
installation is available through `npm run graphify:setup`.

## Security

See [SECURITY.md](SECURITY.md) for supported versions and responsible disclosure
instructions. Do not publish suspected vulnerabilities, credentials, webhook
URLs, or player data in a public issue.

## License

FoE Info is licensed under the
[GNU Affero General Public License v3 or later](LICENSE.md).
