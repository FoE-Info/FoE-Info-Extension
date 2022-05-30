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
import $ from "jquery";

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
	copyToClipboard('div#donorText');
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

export function DonorCopy3() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("donorTextCollapse2");
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
	copyToClipboard('div#donorTextCollapse2');
}


export function DonationCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("copyText");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#copyText');
}

export function fCityStatsCopy() {
	// var cityStatsHTML = '';
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	
	// var copytext = document.getElementById("citystatsLabel");
	// cityStatsHTML = copytext.innerHTML + '<br>';
	// copytext = document.getElementById("citystatsText");
	// cityStatsHTML += copytext.innerHTML;
	// // console.debug(cityStatsHTML);
	// debug.innerHTML = cityStatsHTML;
	// range.selectNode(debug);
	// selection.addRange(range);
	// document.execCommand("copy");
	// debug.innerHTML = '';
	copyToClipboard('div#citystatsText');
}

export function fFriendsCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("friendsText2");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#friendsText2');
}

export function fGuildCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("guildText2");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#guildText2');
}

export function fHoodCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("hoodText2");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#hoodText2');
}

export function BattlegroundCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("battlegroundText");
	// // var numrows = copytext.rows.length;
	// // range.setStartBefore(copytext.rows[0]);
	// // range.setEndAfter(copytext.rows[numrows-1]);  
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#battlegroundText');
}

export function ExpeditionCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("expeditionText");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#expeditionText');
}

export function TreasuryCopy() {
	// var selection = window.getSelection();
	// selection.removeAllRanges();
	// var range = document.createRange();
	// var copytext = document.getElementById("treasuryText");
	// range.selectNode(copytext);
	// selection.addRange(range);
	// document.execCommand("copy");
	copyToClipboard('div#treasuryText');
}

function copyToClipboard(element) {
	var $temp = $("<textarea>");
	$("body").append($temp);
	var html = $(element).html();
	if (!element.equals("clipboardText"))
		addToClipboard(element, html);
	html = html.replace(/<br>/g, "\n"); // or \r\n
	console.debug(html);
	$temp.val(html).select();
	document.execCommand("copy");
	$temp.remove();
  }
  
function addToClipboard(element, html) {
	var clipboard = document.getElementById("clipboard");

	if (clipboard == null) {
		// console.debug('2');
		clipboard = document.createElement('div');
		var content = document.getElementById("content");
		content.appendChild(clipboard);
	}

	clipboard.innerHTML += '<br>' + html;
}

