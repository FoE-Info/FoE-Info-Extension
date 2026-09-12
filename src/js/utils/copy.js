/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
let debug = null;
try {
  debug = require('../state/state.js').debug;
} catch {}

let i18n = null;
try {
  i18n = require('./i18n.js');
} catch {}

let copyLiveRegion = null;

function translateCopy(key, fallbackKey) {
  const translate = typeof i18n?.t === 'function' ? i18n.t : null;
  if (!translate) return '';
  const value = translate(key);
  if (value && value !== key) return value;
  return translate(fallbackKey);
}

function getCopyLiveRegion() {
  if (typeof document === 'undefined' || !document.body) return null;
  if (copyLiveRegion && copyLiveRegion.isConnected) return copyLiveRegion;
  const existing =
    typeof document.getElementById === 'function' ?
      document.getElementById('foeCopyStatus')
    : null;
  if (existing) {
    copyLiveRegion = existing;
    return existing;
  }
  if (typeof document.createElement !== 'function') return null;
  const region = document.createElement('div');
  region.id = 'foeCopyStatus';
  region.className = 'visually-hidden';
  if (typeof region.setAttribute === 'function') {
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
  }
  document.body.appendChild(region);
  copyLiveRegion = region;
  return region;
}

function announceCopy(message) {
  if (!message) return;
  const region = getCopyLiveRegion();
  if (!region) return;
  // Clear before setting so repeated identical messages are re-announced.
  region.textContent = '';
  region.textContent = message;
}

function execCopyCommand() {
  const ok = document.execCommand('copy');
  announceCopy(translateCopy(ok === false ? 'copy_failed' : 'copied', 'copy'));
  return ok;
}

function fClipboardCopy() {
  copyToClipboard('div#clipboardText');
}

function DonorCopy() {
  copyToClipboard('#donorText');
}

function DonorCopy2() {
  copyToClipboard('div#donorTextCollapse');
}

function fInvestedCopy() {
  copyToClipboard('div#investedText');
}

function fGBInfoCopy() {
  copyToClipboard('div#gbInfoCollapse');
}

function DonationCopy() {
  var copytext =
    typeof document !== 'undefined' ?
      document.getElementById('copyText')
    : null;
  if (!copytext) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.selectNode(copytext);
  selection.addRange(range);
  execCopyCommand();
}

function fCityStatsCopy() {
  if (typeof document === 'undefined') return;
  var labelEl = document.getElementById('citystatsLabel');
  var textEl = document.getElementById('citystatsText');
  if (!labelEl && !textEl) return;
  var cityStatsHTML =
    (labelEl ? labelEl.innerHTML + '<br>' : '') +
    (textEl ? textEl.innerHTML : '');
  if (!debug) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  debug.innerHTML = cityStatsHTML;
  range.selectNode(debug);
  selection.addRange(range);
  execCopyCommand();
  debug.innerHTML = '';
}

function fFriendsCopy() {
  var copytext =
    typeof document !== 'undefined' ?
      document.getElementById('friendsText2')
    : null;
  if (!copytext) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.selectNode(copytext);
  selection.addRange(range);
  execCopyCommand();
}

function fGuildCopy() {
  var copytext =
    typeof document !== 'undefined' ?
      document.getElementById('guildText2')
    : null;
  if (!copytext) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.selectNode(copytext);
  selection.addRange(range);
  execCopyCommand();
}

function fHoodCopy() {
  var copytext =
    typeof document !== 'undefined' ?
      document.getElementById('hoodText2')
    : null;
  if (!copytext) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.selectNode(copytext);
  selection.addRange(range);
  execCopyCommand();
}

function BattlegroundCopy() {
  let node = document.querySelector('#gbg-table');
  if (node) copyNode(node);
}

function ExpeditionCopy(targetId = 'geContributionText') {
  if (typeof document === 'undefined') return;
  var copytext =
    (targetId ? document.getElementById(targetId) : null) ||
    document.getElementById('geContributionText') ||
    document.getElementById('geChampionshipText') ||
    document.getElementById('expeditionText');
  if (!copytext) return;
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  range.selectNode(copytext);
  selection.addRange(range);
  execCopyCommand();
}

async function TreasuryCopy() {
  const table = document.getElementById('treasurytable');
  if (!table) return;

  let currentEra = '';
  const lines = [];

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const eraHeader = row.querySelector(
      '.goods-era-header, .special-goods-header',
    );
    if (eraHeader) {
      currentEra = eraHeader.textContent.trim();
      return;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length === 2) {
      const itemName = cells[0].textContent.trim();
      const rawAmount = cells[1].textContent.trim();

      if (itemName) {
        lines.push(`${currentEra}\t${itemName}\t${rawAmount}`);
      }
    }
  });

  const tsvText = lines.join('\n');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvText);
    } else {
      const temp = document.createElement('textarea');
      document.body.appendChild(temp);
      temp.value = tsvText;
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    announceCopy(translateCopy('copied', 'copy'));
  } catch (err) {
    announceCopy(translateCopy('copy_failed', 'copy'));
    console.error('TreasuryCopy clipboard write failed:', err);
  }
}

async function copyToClipboard(element) {
  const el = document.querySelector(element);
  if (!el) return;
  let html = el.innerHTML;
  addToClipboard(element, html);
  html = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(html);
    } else {
      const temp = document.createElement('textarea');
      document.body.appendChild(temp);
      temp.value = html;
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    announceCopy(translateCopy('copied', 'copy'));
  } catch (err) {
    announceCopy(translateCopy('copy_failed', 'copy'));
    console.error('Clipboard write failed:', err);
  }
}

function addToClipboard(element, html) {
  var clipboard = document.getElementById('clipboard');

  if (clipboard == null) {
    clipboard = document.createElement('div');
    var content = document.getElementById('content');
    content.appendChild(clipboard);
  }

  if (typeof clipboard.insertAdjacentHTML === 'function') {
    clipboard.insertAdjacentHTML('beforeend', '<br>' + html);
  } else {
    clipboard.innerHTML = (clipboard.innerHTML || '') + '<br>' + html;
  }
}

function copyNode(node) {
  if (!node) return;
  let range = document.createRange();
  range.selectNodeContents(node);
  let select = window.getSelection();
  select.removeAllRanges();
  select.addRange(range);
  execCopyCommand();
}

module.exports = {
  fClipboardCopy,
  DonorCopy,
  DonorCopy2,
  fInvestedCopy,
  fGBInfoCopy,
  DonationCopy,
  fCityStatsCopy,
  fFriendsCopy,
  fGuildCopy,
  fHoodCopy,
  BattlegroundCopy,
  ExpeditionCopy,
  TreasuryCopy,
};
module.exports.default = module.exports;
