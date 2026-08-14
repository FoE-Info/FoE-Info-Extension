# Security Policy

## Supported versions

Security fixes are provided for the current development version only. Older
builds are not supported; reproduce an issue against the latest revision before
reporting it when possible.

| Version                     | Supported |
| --------------------------- | --------- |
| Current development version | Yes       |
| Older versions              | No        |

## Reporting a vulnerability

Do not disclose suspected vulnerabilities, credentials, Discord webhook URLs,
captured Forge of Empires responses, or player data in a public issue.

Send security reports privately to `foegameinfo@gmail.com`. Include:

- the affected version or commit;
- the browser and operating system used;
- reproduction steps or a minimal proof of concept;
- the likely impact and any data that may be exposed; and
- suggested remediation, if known.

For non-sensitive bugs and general security-hardening suggestions that contain
no private data or exploitation details, use the
[public issue tracker](https://github.com/FoE-Info/FoE-Info-Extension/issues/new).

Please allow the maintainers time to investigate and prepare a fix before public
disclosure. Never test against another player's account or data without explicit
permission.

## Security boundaries

FoE Info is a browser extension that observes Forge of Empires network responses
through a DevTools panel. It stores preferences and optional export destinations
in `browser.storage.local` and can send user-configured data to Google or Discord
endpoints. Reports involving extension permissions, content security policy,
unsafe HTML rendering, intercepted game data, local storage, or outbound exports
are in scope.
