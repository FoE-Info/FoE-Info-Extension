# Bootstrap 5.3 Color Modes & Game Theming Guide

Reference for implementing Bootstrap 5.3 color modes (`data-bs-theme="dark"`) and CSS custom properties in FoE-Info.

---

## 1. Native Color Mode Architecture

Bootstrap 5.3 introduced first-class color mode support powered by CSS custom properties and the `data-bs-theme` attribute:

```html
<!-- Whole panel dark theme -->
<html lang="en" data-bs-theme="dark">

<!-- Or scoped to an individual card component -->
<div class="card" data-bs-theme="dark">
  ...
</div>
```

---

## 2. Core Bootstrap 5.3 CSS Variables

Instead of hardcoding colors, use Bootstrap's standard design tokens:

| Token | Dark Mode Default | Usage in FoE-Info |
| :--- | :--- | :--- |
| `--bs-body-bg` | `#212529` | Extension panel background |
| `--bs-body-color` | `#dee2e6` | Primary body text |
| `--bs-secondary-color` | `#adb5bd` | Muted labels, era titles |
| `--bs-tertiary-bg` | `#2b3035` | Card backgrounds & stat chips |
| `--bs-border-color` | `#495057` | Card dividers, table borders |
| `--bs-primary` | `#0d6efd` | Active links, player names |
| `--bs-success` | `#198754` | Positive boost stats, copy button |
| `--bs-warning` | `#ffc107` | Forge Points, Arc / CF bonuses |
| `--bs-danger` | `#dc3545` | City shield badges, enemy stats |

---

## 3. FoE Game-Themed Custom Tokens (`src/css/_variables.scss`)

To harmonize Bootstrap 5.3 with the Forge of Empires medieval/fantasy aesthetic:

```scss
[data-bs-theme="dark"] {
  // Deep slate background matching game UI canvas
  --bs-body-bg: #15181c;
  --bs-body-color: #e2e8f0;

  // Amber / Gold accents for Forge Points and Great Buildings
  --foe-gold: #d4af37;
  --foe-gold-glow: rgba(212, 175, 55, 0.25);

  // Cards with subtle borders
  --bs-card-bg: #1e2227;
  --bs-border-color: rgba(255, 255, 255, 0.1);
}
```

---

## 4. Contrast & WCAG 2.2 AA Compliance
- **Text on Dark**: Standard text must have at least 4.5:1 contrast against `--bs-body-bg`.
- **Badges**: Use `bg-opacity-25` with explicit text colors (e.g. `badge bg-success bg-opacity-25 text-success border border-success border-opacity-25`) to ensure high contrast in both themes.
