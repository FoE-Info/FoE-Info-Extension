# FoE-Info Extension

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE.md)

A Chrome extension and DevTools panel for Forge of Empires players, providing real-time calculations, Great Building donation advice, production tracking, Guild Battleground metrics, and inventory analysis.

---

## Quick Start & Build Instructions

### Prerequisites & Setup Options

#### Option A: Recommended Path (`mise`)

Using **[mise](https://mise.jdx.dev/)** is recommended as it automatically manages Node.js (v22), Python (v3.12), and `uv` / `uvx` versions as defined in `.mise.toml`:

```bash
# 1. Clone the repository
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension

# 2. Complete environment setup (provisions node, python, uv & runs npm install)
mise run setup
# Or via npm:
npm run setup

# 3. Development Build (Watch Mode)
mise run dev

# 4. Production Webstore Build
mise run build
```

#### Option B: Manual Setup (Without `mise`)

If you prefer not to use `mise`:

1. Install **[Node.js](https://nodejs.org/) (v22+)** & **npm / npx**.
2. Install **Python (v3.12+)**.
3. For Python CLI tools (like `graphify`):
   - **With `uv` / `uvx`** (recommended): Use `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`) for on-demand isolated execution (`uvx`).
   - **With `pipx`** (the direct pip-ecosystem counterpart to `uvx`):
     ```bash
     pipx install "graphifyy[gemini,mcp]==0.9.36"
     # Or run on-demand without global install:
     pipx run --spec "graphifyy[gemini,mcp]==0.9.36" graphify update .
     ```
   - **With `pip`**:
     ```bash
     pip install "graphifyy[gemini,mcp]==0.9.36"
     ```
4. Run project build, maintenance, and verification commands using standard `npm`, `npx`, and `uvx` / `pipx run`:
   ```bash
   npm run setup    # Runs npm install and provisions Python tools via pipx/pip if uv/mise are absent
   npm run dev      # Development watch build
   npm run build    # Production build
   npm run outdated # Checks dependency updates via npx npm-check-updates
   ```

### Available Task Commands

Both `mise run <task>` and `npm run <task>` can be used interchangeably:

| Task Command                                                               | Description                                                                                                     |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `mise run setup` / `npm run setup`                                         | Installs project tools via `mise` and Node packages via `npm install`.                                          |
| `mise run dev` / `npm run dev`                                             | Starts Webpack in watch mode using [`webpack.dev.js`](webpack.dev.js) (outputs to `build/FoE-Info-DEV`).        |
| `mise run build:dev` / `npm run build:dev`                                 | Runs a single non-watching development compilation.                                                             |
| `mise run build` / `npm run build`                                         | Compiles optimized production bundle via [`webpack.prod.js`](webpack.prod.js) and creates Webstore release ZIP. |
| `mise run check` / `npm run check`                                         | Validates code formatting across the repository with Prettier.                                                  |
| `mise run format` / `npm run format`                                       | Automatically formats codebase files using Prettier.                                                            |
| `mise run analyze` / `npm run analyze`                                     | Generates bundle composition analysis using Webpack Bundle Analyzer.                                            |
| `mise run outdated` / `npm run outdated`                                   | Checks for dependency updates using the pinned `npm-check-updates` tool.                                        |
| `mise run graphify-update` / `npm run graphify-update`                     | Updates the graph, then scopes report surprises and suggested questions to `src/`.                              |
| `mise run test:config` / `npm run test:config`                             | Verifies task parity, version pins, portable links, and environment safeguards.                                 |
| `mise run test:graphify-report` / `npm run test:graphify-report`           | Tests the repository's Graphify surprise policy.                                                                |
| `mise run graphify-filter-surprises` / `npm run graphify-filter-surprises` | Rebuilds report surprises and suggested questions using only `src/` nodes.                                      |

---

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the build directory:
   - Development mode: `build/FoE-Info-DEV`
   - Production mode: `build/FoE-Info_WEBSTORE`

---

## Usage

1. Open your browser and navigate to Forge of Empires (e.g. `https://en0.forgeofempires.com`).
2. Open Chrome Developer Tools (`Ctrl+Shift+I` or `F12`).
3. Click on the `>>` menu in the DevTools header and select **FoE-Info-Dev** (or **FoE-Info**).
4. Launch or reload the game page; the panel will initialize and track network payloads.

---

## Debugging

- **Panel Logs**: Right-click anywhere within the FoE-Info DevTools panel and select **Inspect** to view dedicated panel console logs.
- **Debug Mode**: Click the FoE-Info logo in the panel header to toggle verbose debug logging.

---

## Documentation

For technical architecture guides, domain message service references, helper catalogs, and AI agent workflows, see the **[Documentation Index](docs/INDEX.md)**.

- **System Architecture**: [`docs/system-architecture.md`](docs/system-architecture.md)
- **Domain Services Reference**: [`docs/domain-services.md`](docs/domain-services.md)
- **Helper Utilities Catalog**: [`docs/helper-utilities.md`](docs/helper-utilities.md)
- **Deep-Dive Knowledgebase**: [`docs/knowledgebase/`](docs/knowledgebase/)
  - **Codebase Technical Manual**: [`docs/knowledgebase/codebase-technical-manual.md`](docs/knowledgebase/codebase-technical-manual.md)
  - **Agentic Workflow & Maintenance**: [`docs/knowledgebase/agent-workflow-guide.md`](docs/knowledgebase/agent-workflow-guide.md)

---

## License

Distributed under the [GNU Affero General Public License v3.0](LICENSE.md).
