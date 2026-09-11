let storage = {};
try {
  storage = require('../utils/storage.js');
} catch {}

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
  if (storage && typeof storage.set === 'function') {
    storage.set(`${id}`, collapse);
  }
}

function fAddCollapseIcon(id, _href, collapse) {
  return `<span class="header-icon collapse-toggle fw-bold font-monospace" id="${id}" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="${_href}" data-bs-target="#${_href}" data-bs-toggle="collapse">${collapse ? '[+]' : '[-]'}</span>`;
}

function fCopyButton(id, colour, pos, collapse) {
  return `<span id="${id}" role="button" tabindex="0" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? 'none' : 'block'
  }" data-i18n="copy">Copy</span>`;
}

function fCopyIcon(id, colour, pos, collapse) {
  return `<span class="bi ${pos}-icon float-end material-symbols-outlined" id="${id}" role="button" tabindex="0" aria-label="Copy" style="display: ${
    collapse ? 'none' : 'block'
  }">content_copy</span>`;
}

function fPostButton(id, colour, pos, collapse) {
  return `<span id="${id}" role="button" tabindex="0" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? 'none' : 'block'
  }" data-i18n="post">Post</span>`;
}

function fCloseButton() {
  return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      e.target &&
      e.target.getAttribute &&
      e.target.getAttribute('role') === 'button' &&
      e.target.tagName !== 'BUTTON'
    ) {
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
};
module.exports.default = module.exports;
