# src/css — Stylesheets

## Structure

- `main.scss` and `options.scss` are the two Webpack entry stylesheets (`app`/`options` bundles). `custom.scss` holds the extension's own rules; `_variables.scss` holds Bootstrap variable overrides — Bootstrap and jQuery are the styling/DOM stack (no other CSS framework).
- Use `_variables.scss` tokens (or Bootstrap's own variables) for colors instead of hardcoding hex values — `custom.scss` has drifted into a lot of hardcoded colors that bypass the existing tokens; don't add more.
- Custom properties (`--color-text-primary`, `--color-background`, etc.) referenced in `custom.scss` must actually be defined somewhere (e.g. `:root`) — check before adding a new `var(--...)` reference, since at least one existing reference silently falls back to `transparent` because nothing defines it.

## Validity

- Double-check property names and values compile — invalid CSS (e.g. non-existent properties, invalid keyword values) is silently dropped by the parser with no build error, so nothing will warn you.
- Don't add to the large commented-out block in `custom.scss`; if you're replacing dead styles, delete them rather than commenting out more.
