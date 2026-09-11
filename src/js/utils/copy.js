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
import { debug } from '../state/state.js';

export function fClipboardCopy() {
  copyToClipboard('div#clipboardText');
}

export function DonorCopy() {
  copyToClipboard('#donorText');
}

export function DonorCopy2() {
  copyToClipboard('div#donorTextCollapse');
}

export function fInvestedCopy() {
  copyToClipboard('div#investedText');
}

export function fGBInfoCopy() {
  copyToClipboard('div#gbInfoCollapse');
}

export function DonationCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('copyText');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}

export function fCityStatsCopy() {
  var cityStatsHTML = '';
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();

  var copytext = document.getElementById('citystatsLabel');
  cityStatsHTML = copytext.innerHTML + '<br>';
  copytext = document.getElementById('citystatsText');
  cityStatsHTML += copytext.innerHTML;
  debug.innerHTML = cityStatsHTML;
  range.selectNode(debug);
  selection.addRange(range);
  document.execCommand('copy');
  debug.innerHTML = '';
}

export function fFriendsCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('friendsText2');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}

export function fGuildCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('guildText2');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}

export function fHoodCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('hoodText2');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}

export function BattlegroundCopy() {
  let node = document.querySelector('#gbg-table');
  copyNode(node);
}

export function ExpeditionCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('expeditionText');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}

export async function TreasuryCopy() {
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
  } catch (err) {
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
  } catch (err) {
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

  clipboard.innerHTML += '<br>' + html;
}

function copyNode(node) {
  let range = document.createRange();
  range.selectNodeContents(node);
  let select = window.getSelection();
  select.removeAllRanges();
  select.addRange(range);
  document.execCommand('copy');
}
