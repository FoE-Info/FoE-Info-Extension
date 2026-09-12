# Bootstrap 5.3 Component Patterns for DevTools Panels

Tested, accessible Bootstrap 5.3 component structures optimized for narrow Chrome DevTools panels (350–450px viewport) in FoE-Info.

---

## 1. Compact Card Anatomy (Panel & Dashboard Standard)

Chrome DevTools panel extensions require zero margin waste, robust text truncation, and clear action badges.

```html
<div id="my-feature-panel" class="foe-original-card alert alert-dismissible alert-dark show mb-2">
  <!-- Card Header -->
  <div class="d-flex align-items-center justify-content-between mb-1">
    <div class="d-flex align-items-center gap-1 text-truncate">
      <!-- Collapse Toggle -->
      <span role="button" class="foe-collapse-icon me-1 flex-shrink-0"
            data-bs-toggle="collapse" href="#myFeatureContent"
            aria-expanded="true" aria-controls="myFeatureContent"
            title="Toggle Section" data-i18n-title="toggle_section">[-]</span>

      <!-- Title & Origin -->
      <strong class="text-truncate" data-i18n="feature_title">Feature Title</strong>

      <!-- Info Popover Trigger -->
      <span class="pop d-inline-flex align-items-center flex-shrink-0 ms-1" role="button"
            data-bs-container="body" data-bs-toggle="popover" data-bs-placement="bottom" data-bs-html="true"
            data-bs-title="Information" data-bs-content="Tooltip details here">
        <span class="material-icons-outlined info-icon" style="font-size: 14px; cursor: pointer; color: #6c757d;">info</span>
      </span>
    </div>

    <!-- Action Badge / Button (plain text to match panel copy) -->
    <span role="button" tabindex="0" class="foe-copy-btn flex-shrink-0"
          data-i18n="copy" title="Copy Stats" data-i18n-title="copy_stats">Copy</span>
  </div>

  <!-- Collapsible Content Body -->
  <div id="myFeatureContent" class="collapse show">
    <div class="small" style="line-height: 1.45;">
      <!-- Content Rows -->
      <div class="d-flex justify-content-between">
        <span class="text-secondary" data-i18n="stat_label">Stat Label</span>
        <span class="fw-bold">1,234</span>
      </div>
    </div>
  </div>
</div>
```

---

## 2. DevTools-Optimized Compact Tables

When displaying multi-row tabular data (e.g. Great Building investments, army unit breakdown, treasury logs):

```html
<div class="table-responsive">
  <table class="table table-sm table-dark table-hover table-borderless align-middle mb-0 small">
    <thead class="text-secondary border-bottom border-secondary border-opacity-25">
      <tr>
        <th scope="col" class="py-1" data-i18n="rank">#</th>
        <th scope="col" class="py-1" data-i18n="player">Player</th>
        <th scope="col" class="py-1 text-end" data-i18n="fp">FP</th>
        <th scope="col" class="py-1 text-end" data-i18n="reward">Reward</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="py-1 text-secondary">P1</td>
        <td class="py-1 text-truncate" style="max-width: 140px;">PlayerName</td>
        <td class="py-1 text-end fw-bold text-success">1,900</td>
        <td class="py-1 text-end text-warning">950 FP</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Key Utility Classes**:
- `table-sm`: Reduces padding from `0.5rem` to `0.25rem`.
- `align-middle`: Centers icons and text vertically.
- `text-truncate` with inline `max-width`: Prevents long player names from blowing out column widths.
- `table-responsive`: Enables touch/mouse horizontal scrolling without clipping.

---

## 3. Inline Stat Chips & Badges

For displaying boost metrics or resource tags in tight horizontal layouts:

```html
<div class="d-flex flex-wrap gap-1 align-items-center mb-1">
  <span class="badge bg-secondary bg-opacity-25 text-light border border-secondary border-opacity-25">
    Arc: <span class="text-info fw-bold">97.9%</span>
  </span>
  <span class="badge bg-secondary bg-opacity-25 text-light border border-secondary border-opacity-25">
    CF: <span class="text-warning fw-bold">435%</span> (26 Goods)
  </span>
</div>
```

---

## 4. Accessibility Checklist for Bootstrap 5 Components
- Always pair `data-bs-toggle="collapse"` with `aria-expanded="true/false"` and `aria-controls="id"`.
- Buttons and clickable spans must have `role="button"` and `tabindex="0"`.
- Badges with meaning must include screen-reader text (`<span class="visually-hidden">...</span>`) if color alone conveys state.
