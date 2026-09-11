import * as storage from './storage.js';

function fCollapseIcon(id, _href, collapse) {
  if (document.getElementById(`${id}`) != null)
    document.getElementById(`${id}`).outerHTML = fAddCollapseIcon(
      id,
      _href,
      collapse,
    );
  storage.set(`${collapse}`, collapse);
}

function fAddCollapseIcon(id, _href, collapse) {
  return `<span class="header-icon material-icons-outlined md-12" id="${id}" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapse}" aria-controls="${_href}" data-bs-target="#${_href}" data-bs-toggle="collapse">${collapse ? 'add' : 'remove'}_circle_outline</span>`;
}

function fCopyButton(id, colour, pos, collapse) {
  // console.debug(collapse);
  return `<span id="${id}" role="button" tabindex="0" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? 'none' : 'block'
  }" data-i18n="copy">Copy</span>`;
}

function fCopyIcon(id, colour, pos, collapse) {
  // console.debug(collapse);
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

export {
  fCollapseIcon as updateIcon,
  fAddCollapseIcon as icon,
  fCopyButton as copy,
  fPostButton as post,
  fCloseButton as close,
};
