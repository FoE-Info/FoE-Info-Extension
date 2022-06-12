import icons from 'bootstrap-icons/bootstrap-icons.svg';
import * as storage from './storage.js';

function fCollapseIcon(id, _href, collapse) {
	if (document.getElementById(`${id}`) != null)
		document.getElementById(`${id}`).outerHTML = `<svg class="bi header-icon" id="${id}" href="#${_href}" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse ? 'plus' : 'dash'}-circle"/></svg>`;
	storage.set(`${collapse}`, collapse);
}

function fAddCollapseIcon(id, _href, collapse) {
	return `<svg class="bi header-icon" id="${id}" href="#${_href}" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse ? 'plus' : 'dash'}-circle"/></svg>`;
}

function fCopyButton(id, colour, pos,collapse){
	console.debug(collapse);
	return `<button type="button" class="badge rounded-pill bg-${colour} float-end ${pos}-button" id="${id}" style="display: ${collapse ? 'none' : 'block'}"><span data-i18n="copy">Copy</span></button>`;
}

function fPostButton(id, colour, pos,collapse){
	return `<button type="button" class="badge rounded-pill bg-${colour} float-end ${pos}-button" id="${id}" style="display: ${collapse ? 'none' : 'block'}"><span data-i18n="post">Post</span></button>`;
}

function fCloseButton(){
	return '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
}

export{
	fCollapseIcon as updateIcon,
	fAddCollapseIcon as icon,
	fCopyButton as copy,
	fPostButton as post,
	fCloseButton as close
}