# FoE-Info Extension

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE.md)

A Chrome extension and DevTools panel for Forge of Empires players, providing real-time calculations, Great Building donation advice, production tracking, Guild Battleground metrics, and inventory analysis.

---

## Quick Start & Build Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- `npm` (v9+)

### Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension

# 2. Install dependencies
npm install

# 3. Development Build (Watch Mode)
npm run dev

# 4. Production Webstore Build
npm run build
```

### Available NPM Scripts

| Command                   | Description                                                                                                                                                               |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`             | Starts Webpack in watch mode using [`webpack.dev.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/webpack.dev.js) (outputs to `build/FoE-Info-DEV`).        |
| `npm run build:dev`       | Runs a single non-watching development compilation.                                                                                                                       |
| `npm run build`           | Compiles optimized production bundle via [`webpack.prod.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/webpack.prod.js) and creates Webstore release ZIP. |
| `npm run check`           | Validates code formatting across the repository with Prettier.                                                                                                            |
| `npm run format`          | Automatically formats codebase files using Prettier.                                                                                                                      |
| `npm run analyze`         | Generates a visual bundle size report at `build/bundle-report.html`.                                                                                                      |
| `npm run outdated`        | Checks for dependency updates using `npm-check-updates` (`ncu`).                                                                                                          |
| `npm run graphify-update` | Updates the codebase AST knowledge graph in `graphify-out/`.                                                                                                              |

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
