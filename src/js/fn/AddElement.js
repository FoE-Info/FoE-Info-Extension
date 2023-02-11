import icons from "bootstrap-icons/bootstrap-icons.svg";
import * as storage from "./storage.js";

function fCollapseIcon(id, _href, key, collapse) {
  if (document.getElementById(`${id}`) != null)
    document.getElementById(
      `${id}`
    ).outerHTML = fAddCollapseIcon(id, _href, collapse);
  storage.set(key, collapse);
  console.debug(key, collapse);
}

function fAddCollapseIcon(id, _href, collapse) {
  return `<svg class="bi header-icon" id="${id}" href="#${_href}" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${
    collapse ? "plus" : "dash"
  }-circle"/></svg>`;
}

function fCopyButton(id, colour, pos, collapse) {
  console.debug(collapse);
  // console.debug(
  //   `<button type="button" class="badge rounded-pill bg-${colour} float-end ${pos}-button" id="${id}" style="display: ${
  //     collapse ? "none" : "block"
  //   }"><span data-i18n="copy">Copy</span></button>`
  // );
  // return `<button type="button" class="badge rounded-pill bg-${colour} float-end ${pos}-button" id="${id}" style="display: ${
  //   collapse ? "none" : "block"
  // }"><span data-i18n="copy">Copy</span></button>`;
  return `<svg class="bi ${pos}-icon float-end" id="${id}" style="display: ${collapse ? "none" : "block"} fill="currentColor" width="24" height="20"><use xlink:href="${icons}#clipboard"/></svg>`;
}

function fPostButton(id, colour, pos, collapse) {
  return `<button type="button" class="badge rounded-pill bg-${colour} float-end ${pos}-button" id="${id}" style="display: ${
    collapse ? "none" : "block"
  }"><span data-i18n="post">Post</span></button>`;
}

function fCloseButton() {
  return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
}

function fClearIcon(id, _href, collapse) {
  return `<svg class="bi right-icon float-end" id="${id}" style="display: ${collapse ? "none" : "block"} href="#${_href}" fill="currentColor" width="16" height="20"><use xlink:href="${icons}#eraser-fill"/></svg>`;
}

export {
  fCollapseIcon as updateIcon,
  fAddCollapseIcon as icon,
  fCopyButton as copy,
  fPostButton as post,
  fCloseButton as close,
  fClearIcon as clear,
};
