/** Panel element factory producing close/copy/collapse-icon markup. */
let storage = {};
try {
  storage = require('../utils/storage.js');
} catch {}

function fSyncTriggerState(targetId, collapse) {
  if (
    !targetId ||
    typeof document === 'undefined' ||
    typeof document.querySelectorAll !== 'function'
  ) {
    return;
  }
  const safeTarget = String(targetId).replace(/["\\]/g, '\\$&');
  const triggers = document.querySelectorAll(
    `[data-bs-target="#${safeTarget}"]`,
  );
  if (!triggers || typeof triggers.forEach !== 'function') return;
  triggers.forEach((trigger) => {
    if (trigger && typeof trigger.setAttribute === 'function') {
      trigger.setAttribute('aria-expanded', String(!collapse));
    }
  });
}

function fCollapseIcon(id, _href, collapse) {
  if (
    typeof document !== 'undefined' &&
    document.getElementById(`${id}`) != null
  ) {
    const el = document.getElementById(`${id}`);
    if (typeof el.setAttribute === 'function') {
      el.textContent = collapse ? '[+]' : '[-]';
      el.setAttribute('aria-expanded', String(!collapse));
    } else {
      el.outerHTML = fAddCollapseIcon(id, _href, collapse);
    }
  }
  fSyncTriggerState(_href, collapse);
  if (storage && typeof storage.set === 'function') {
    storage.set(`${id}`, collapse);
  }
}

function fAddCollapseIcon(id, _href, collapse) {
  return `<span class="header-icon collapse-toggle fw-bold font-monospace" id="${id}" role="button" tabindex="-1" aria-hidden="true" aria-expanded="${!collapse}" aria-controls="${_href}" data-bs-target="#${_href}" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>`;
}

function fCopyButton(id, colour, pos, collapse) {
  return `<span id="${id}" role="button" tabindex="0" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? 'none' : 'block'
  }" data-i18n="copy">Copy</span>`;
}

function fCopyIcon(id, colour, pos, collapse) {
  return `<span class="bi ${pos}-icon float-end material-symbols-outlined" id="${id}" role="button" tabindex="0" aria-label="Copy" data-i18n-aria-label="copy" style="display: ${
    collapse ? 'none' : 'block'
  }">content_copy</span>`;
}

function fPostButton(id, colour, pos, collapse) {
  return `<span id="${id}" role="button" tabindex="0" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? 'none' : 'block'
  }" data-i18n="post">Post</span>`;
}

function fCloseButton() {
  return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" data-i18n-aria-label="close"></button>';
}

const isCustomButton = (target) =>
  Boolean(
    target &&
    typeof target.getAttribute === 'function' &&
    target.getAttribute('role') === 'button' &&
    target.tagName !== 'BUTTON' &&
    target.getAttribute('data-foe-native-keys') !== 'true',
  );

if (typeof document !== 'undefined' && !document._foeA11yBound) {
  document._foeA11yBound = true;
  document.addEventListener('keydown', (e) => {
    if (!isCustomButton(e.target)) return;
    if (e.key === 'Enter') {
      if (e.repeat) return;
      e.preventDefault();
      e.target.click();
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // Space must not scroll while held; activation happens on keyup.
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e) => {
    if ((e.key === ' ' || e.key === 'Spacebar') && isCustomButton(e.target)) {
      e.preventDefault();
      e.target.click();
    }
  });
}

module.exports = {
  updateIcon: fCollapseIcon,
  icon: fAddCollapseIcon,
  copy: fCopyButton,
  fCopyIcon,
  post: fPostButton,
  close: fCloseButton,
  isCustomButton,
};
module.exports.default = module.exports;
