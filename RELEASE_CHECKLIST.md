# Release Checklist

Use this checklist before promoting a code-refactor build.

## Build and Validation

1. Install dependencies.

```bash
npm install
```

2. TypeScript check.

```bash
npm run typecheck
```

3. Handler regression tests.

```bash
npm run test:handlers
```

4. Build extension package.

```bash
npm run build-foe-info
```

## Functional Smoke Tests

1. Load unpacked extension from build/FoE-Info_WEBSTORE.
2. Open Forge of Empires and verify FoE-Info panel appears in DevTools.
3. Verify options page opens from popup settings icon.
4. Verify key feature surfaces:

- City/GB info rendering
- Guild Battleground views
- Reward logging UI
- Treasury and contribution views

## Permissions and Security

1. Confirm manifest host permissions match PERMISSIONS_AUDIT.md stage status.
2. Confirm webhook posting works with discord.com URLs.
3. Confirm no legacy discordapp.com references remain in src.

## Documentation

1. Confirm README reflects current build/test commands.
2. Confirm ARCHITECTURE.md and ROADMAP_PHASES.md are up to date.
3. Confirm any phase-stage changes are reflected in PERMISSIONS_AUDIT.md.

## Release Hygiene

1. Confirm clean working tree.
2. Confirm branch is pushed and up to date.
3. Tag or annotate release candidate commit if needed.
