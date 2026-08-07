# Security Policy

## Supported Versions

We actively issue security updates and bug fixes for the current release branch.

| Version             | Supported          |
| :------------------ | :----------------- |
| `0.0.831` (Current) | :white_check_mark: |
| Older Versions      | :x:                |

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in FoE-Info Extension, please follow these steps:

1. **Public Issues**: For general non-sensitive bug reports, open a public [GitHub Issue](https://github.com/FoE-Info/FoE-Info-Extension/issues/new).
2. **Confidential Disclosure**: For sensitive vulnerabilities or security concerns (e.g. secret exposure, data leak vulnerabilities), please send an email directly to:
   - `foegameinfo@gmail.com`

Please include:

- A description of the issue and potential impact.
- Steps to reproduce or proof-of-concept code.
- Your contact information for follow-up communications.

We will acknowledge receipt of security reports within 48 hours and work toward resolving confirmed issues promptly.

---

## Security Practices

- **Zero Hardcoded Credentials**: No API keys, secret tokens, or webhook credentials are built into extension source files.
- **Chrome Extension Scope**: The extension operates under least-privilege extension manifest permissions and inspects only Forge of Empires network communication within the DevTools context.
