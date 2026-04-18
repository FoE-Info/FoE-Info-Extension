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
import $ from 'jquery';
import { debug } from '../index';

export function fClipboardCopy() {
  // var selection = window.getSelection();
  // selection.removeAllRanges();
  // var range = document.createRange();
  // var copytext = document.getElementById("clipboardText");
  // range.selectNode(copytext);
  // selection.addRange(range);
  // document.execCommand("copy");
  copyToClipboard('div#clipboardText');
}

export function DonorCopy() {
  // var selection = window.getSelection();
  // selection.removeAllRanges();
  // var range = document.createRange();
  // var copytext = document.getElementById("donorText");
  // range.selectNode(copytext);
  // selection.addRange(range);
  // document.execCommand("copy");
  copyToClipboard('#donorText');
}

export function DonorCopy2() {
  // var selection = window.getSelection();
  // selection.removeAllRanges();
  // var range = document.createRange();
  // var copytext = document.getElementById("donorTextCollapse")
  // //var copytext1 = document.getElementById("donorText1")
  // var numrows = copytext.rows.length;
  // //console.debug(numrows);
  // var row1 = copytext.rows[0];
  // var row2 = copytext.rows[numrows-1];
  // range.setStartBefore(row1);
  // range.setEndAfter(row2);
  // // range.selectNode(copytext);
  // // range.selectNodeContents(copytext);
  // selection.addRange(range);
  // document.execCommand("copy");
  copyToClipboard('div#donorTextCollapse');
}

export function fInvestedCopy() {
  copyToClipboard('div#investedText');
}

export function DonationCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  const copytext = document.getElementById('copyText')!;
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
  // copyToClipboard('div#copyText');
}

export function fCityStatsCopy() {
  let cityStatsHTML = '';
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();

  const citystatsLabel = document.getElementById('citystatsLabel')!;
  cityStatsHTML = citystatsLabel.innerHTML + '<br>';
  const citystatsText = document.getElementById('citystatsText')!;
  cityStatsHTML += citystatsText.innerHTML;
  debug.innerHTML = cityStatsHTML;
  range.selectNode(debug);
  selection.addRange(range);
  document.execCommand('copy');
  debug.innerHTML = '';
}

export function fFriendsCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNode(document.getElementById('friendsText2')!);
  selection.addRange(range);
  document.execCommand('copy');
}

export function fGuildCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNode(document.getElementById('guildText2')!);
  selection.addRange(range);
  document.execCommand('copy');
}

export function fHoodCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNode(document.getElementById('hoodText2')!);
  selection.addRange(range);
  document.execCommand('copy');
}

export function BattlegroundCopy() {
  // var selection = window.getSelection();
  // selection.removeAllRanges();
  // var range = document.createRange();
  // var copytext = document.getElementById("gbg-table");
  // // var numrows = copytext.rows.length;
  // // range.setStartBefore(copytext.rows[0]);
  // // range.setEndAfter(copytext.rows[numrows-1]);
  // range.selectNode(copytext);
  // selection.addRange(range);
  // document.execCommand("copy");
  // copyTextToClipboard('#gbg-table');
  let node = document.querySelector('#gbg-table');
  copyNode(node!);
}

export function ExpeditionCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNode(document.getElementById('expeditionText')!);
  selection.addRange(range);
  document.execCommand('copy');
}

export function TreasuryCopy() {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNode(document.getElementById('treasurytable')!);
  selection.addRange(range);
  document.execCommand('copy');
  //copyToClipboard('#treasurytable > tbody');
  // let node = document.querySelector('#treasurytable');
  // copyNode(node);
}

function copyToClipboard(element: string) {
  const $temp = $('<textarea>');
  $('body').append($temp);
  let html = $(element).html() ?? '';
  // if (!element.equals("clipboardText"))
  addToClipboard(element, html);
  html = html.replace(/<br>/g, '\n'); // or \r\n
  html = html.replace(/<\/tr>/g, '\n'); // or \r\n
  html = html.replace(/<p>/g, ''); // or \r\n
  html = html.replace(/<tr>/g, ''); // or \r\n
  html = html.replace(/<td>/g, ''); // or \r\n
  html = html.replace(/<\/td>/g, ''); // or \r\n
  html = html.replace(/<\/p>/g, '\n'); // or \r\n
  html = html.replace(/<\/?span[^>]*>/g, ''); // or \r\n
  // html = html.replace(/<\/span>/g, ""); // or \r\n
  console.debug(html);
  $temp.val(html).select();
  document.execCommand('copy');
  $temp.remove();
}

function addToClipboard(element: string, html: string) {
  let clipboard = document.getElementById('clipboard');

  if (clipboard == null) {
    clipboard = document.createElement('div');
    document.getElementById('content')!.appendChild(clipboard);
  }

  clipboard.innerHTML += '<br>' + html;
}

function copyNode(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const select = window.getSelection()!;
  select.removeAllRanges();
  select.addRange(range);
  document.execCommand('copy');
}
