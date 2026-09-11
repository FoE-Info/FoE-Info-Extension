/**
 * cityStatsTooltips.js
 *
 * Initializes Bootstrap Tooltips and Popovers for City Stats age goods breakdown
 * and live city stats cards.
 * Decoupled from StartupService monolith.
 */

let Tooltip = null;
let Popover = null;

try {
  const bs = require('bootstrap');
  Tooltip = bs.Tooltip;
  Popover = bs.Popover;
} catch {
  // ESM or testing environment fallback
}

const AGES = [
  'sad',
  'sash',
  'sat',
  'sajm',
  'sav',
  'saab',
  'sam',
  'vf',
  'of',
  'af',
  'fe',
  'te',
  'ce',
  'pme',
  'me',
  'pe',
  'ina',
  'ca',
  'lma',
  'hma',
  'ema',
  'ia',
  'ba',
];

function showTooltips({
  customDoc = typeof document !== 'undefined' ? document : null,
  customTooltip = null,
  customPopover = null,
} = {}) {
  const doc = customDoc;
  if (!doc) return;

  const TooltipClass =
    customTooltip ||
    (typeof window !== 'undefined' && window.bootstrap ?
      window.bootstrap.Tooltip
    : null) ||
    Tooltip;

  const PopoverClass =
    customPopover ||
    (typeof window !== 'undefined' && window.bootstrap ?
      window.bootstrap.Popover
    : null) ||
    Popover;

  if (TooltipClass) {
    const options = {
      html: true,
      delay: { show: 100, hide: 500 },
      container: 'body',
    };

    for (let i = 0; i < AGES.length; i++) {
      const tip = doc.getElementById ? doc.getElementById(AGES[i]) : null;
      if (tip) {
        if (typeof TooltipClass.getInstance === 'function') {
          const existing = TooltipClass.getInstance(tip);
          if (existing && typeof existing.dispose === 'function') {
            existing.dispose();
          }
        }
        new TooltipClass(tip, options);
      }
    }
  }

  if (PopoverClass) {
    const options = {
      trigger: 'hover focus',
      html: true,
      delay: { show: 200, hide: 500 },
    };

    const popoverTriggerList =
      doc.querySelectorAll ?
        doc.querySelectorAll('[data-bs-toggle="popover"]:not(#user)')
      : [];
    if (popoverTriggerList) {
      for (const popoverTriggerEl of popoverTriggerList) {
        if (typeof PopoverClass.getOrCreateInstance === 'function') {
          PopoverClass.getOrCreateInstance(popoverTriggerEl, options);
        } else {
          new PopoverClass(popoverTriggerEl, options);
        }
      }
    }
  }
}

module.exports = {
  AGES,
  showTooltips,
};
module.exports.default = module.exports;
