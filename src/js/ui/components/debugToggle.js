/**
 * debugToggle.js
 *
 * Debug-mode logo construction and activation wiring for the panel header.
 * Keyboard handling is local and opted out of the global role="button"
 * handler via `data-foe-native-keys` to prevent double activation.
 * Dual CJS/ESM compatible.
 */

let i18nModule = null;
try {
  i18nModule = require('../../utils/i18n.js');
} catch {}

function tr(key, fallback) {
  try {
    const value = i18nModule?.t?.(key);
    return value && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

function applyDebugA11y(el, enabled) {
  if (!el || typeof el.setAttribute !== 'function') return;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-pressed', String(Boolean(enabled)));
  el.setAttribute('aria-label', tr('debug_mode_label', 'FoE-Info debug mode'));
  el.setAttribute('data-foe-native-keys', 'true');
  el.setAttribute(
    'title',
    enabled ?
      tr('debug_enabled_title', 'FoE-Info Debug Mode (Enabled)')
    : tr('debug_disabled_title', 'FoE-Info (Click to enable debug mode)'),
  );
}

function createDebugLogo(targetDocument, enabled) {
  if (!targetDocument || typeof targetDocument.createElement !== 'function') {
    return null;
  }
  let logo;
  if (enabled) {
    logo = targetDocument.createElement('span');
    logo.className = 'material-icons-outlined';
    logo.id = 'logo';
    logo.textContent = 'bug_report';
  } else {
    logo = targetDocument.createElement('img');
    logo.src = '/icons/Icon48.png';
    logo.width = '24';
    logo.height = '24';
    logo.id = 'logo';
    logo.alt = 'FoE-Info';
  }
  logo.style = logo.style || {};
  logo.style.cursor = 'pointer';
  logo.style.verticalAlign = 'middle';
  if (enabled) logo.style.fontSize = '24px';
  applyDebugA11y(logo, enabled);
  return logo;
}

function bindDebugToggle(logo, onToggleDebug) {
  if (!logo || typeof onToggleDebug !== 'function') return;
  if (typeof logo.addEventListener !== 'function') return;
  logo.addEventListener('click', onToggleDebug);
  logo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.repeat) return;
      e.preventDefault();
      onToggleDebug(e);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // Space activates on keyup to match native button semantics.
      e.preventDefault();
    }
  });
  logo.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onToggleDebug(e);
    }
  });
}

module.exports = {
  createDebugLogo,
  bindDebugToggle,
  applyDebugA11y,
};
module.exports.default = module.exports;
