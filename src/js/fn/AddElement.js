import icons from "bootstrap-icons/bootstrap-icons.svg";
import * as storage from "./storage.js";

function fCollapseIcon(id, _href, collapse) {
  if (document.getElementById(`${id}`) != null)
    document.getElementById(`${id}`).outerHTML = fAddCollapseIcon(
      id,
      _href,
      collapse
    );
  storage.set(`${collapse}`, collapse);
}

function fAddCollapseIcon(id, _href, collapse) {
  return `<span class="header-icon material-icons-outlined md-12" id="${id}" href="#${_href}" data-bs-toggle="collapse">
    ${collapse ? "add" : "remove"}_circle_outline
  </span>`;
}

function fCopyButton(id, colour, pos, collapse) {
  console.debug(collapse);
  return `<span id="${id}" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? "none" : "block"
  } data-i18n="copy">Copy</span>`;
}

function fCopyIcon(id, colour, pos, collapse) {
  console.debug(collapse);
  return `<span class="bi ${pos}-icon float-end material-symbols-outlined" id="${id}" style="display: ${
    collapse ? "none" : "block"
  }">content_copy</span>`;
}

function fPostButton(id, colour, pos, collapse) {
  return `<span id="${id}" class="badge rounded-pill bg-${colour} float-end ${pos}-button" style="display: ${
    collapse ? "none" : "block"
  } data-i18n="post">Post</span>`;
}

function fCloseButton() {
  return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
}

export {
  fCollapseIcon as updateIcon,
  fAddCollapseIcon as icon,
  fCopyButton as copy,
  fPostButton as post,
  fCloseButton as close,
};
