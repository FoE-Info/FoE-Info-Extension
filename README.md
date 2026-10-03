# FoE-Info Extension

A passive Chrome Manifest V3 companion for Forge of Empires. Start with the
[application guide](docs/application.md), [architecture](docs/architecture.md),
[security architecture](docs/security-architecture.md), and
[runtime debugging](docs/debugging.md).

## Development

Install Node.js 26.8.2+, npm 9+, Git, and uv/uvx for font tooling, then run:

```bash
npm run setup
npm run build:dev
npm run verify
```

Load `build/FoE-Info-DEV` in `chrome://extensions`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, checks, and contribution policy,
and the [documentation index](docs/index.md) for application and release guides.

## Security and license

Report vulnerabilities privately through GitHub's Security tab; see
[SECURITY.md](SECURITY.md). Licensed under the
[GNU Affero General Public License v3.0 or later](LICENSE.md).
