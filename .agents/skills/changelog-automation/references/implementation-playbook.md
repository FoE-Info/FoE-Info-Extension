# FoE-Info Changelog and Release Playbook

This repository already owns `CHANGELOG.md`, release validation, and extension packaging. Do not install or substitute `semantic-release`, `standard-version`, `commitizen`, or `git-cliff` unless the user explicitly approves a release-system migration.

## Source of truth

- `CHANGELOG.md` records user-visible changes.
- `package.json` owns the package version and release scripts.
- Extension manifests own browser-visible version metadata.
- `npm run release:check` verifies version and release consistency.
- `npm run package:extension` builds the distributable extension artifact.

Inspect the current scripts and manifests before editing; names and paths in this reference do not authorize a version bump.

## Changelog workflow

1. Read the current top of `CHANGELOG.md` and preserve its existing section style.
2. Derive entries from verified behavior changes, not commit-message wording alone.
3. Group user-visible entries under the repository's current categories.
4. Omit internal churn unless it changes compatibility, security, reliability, or contributor workflow.
5. Name breaking changes and required user action explicitly.
6. Keep issue/PR identifiers exact when they are available; do not invent links.

## Release workflow

Only when the user has requested a release:

1. Determine the intended version from the requested release scope and existing repository policy.
2. Update every repository-owned version surface together.
3. Run `npm run release:check` before packaging.
4. Run the full verification gate.
5. Build with `npm run package:extension`.
6. Inspect the produced artifact name and contents before reporting success.
7. Do not tag, publish, upload, commit, or push without explicit authorization.

## Verification

For changelog-only work, run formatting and `git diff --check` plus the repository verification command required by the completion rule. For a release, require:

```sh
npm run release:check
npm run verify
npm run package:extension
```

Report the actual artifact path and command results. A generated changelog is not evidence that the extension package is releasable.
