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

export function ClipboardCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("clipboardTextTable")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function DonorCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("donorText")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
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
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("donorTextCollapse2")
	//var copytext1 = document.getElementById("donorText1")
	var numrows = copytext.rows.length;
	//console.debug(numrows);
	var row1 = copytext.rows[0];
	var row2 = copytext.rows[numrows-1];
	range.setStartBefore(row1);
	range.setEndAfter(row2);  
	// range.selectNode(copytext);
	// range.selectNodeContents(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}


export function DonationCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("copyText")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function fCityStatsCopy() {
	var cityStatsHTML = '';
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	
	var copytext = document.getElementById("citystatsLabel")
	cityStatsHTML = copytext.innerHTML + '<br>';
	copytext = document.getElementById("citystatsText")
	cityStatsHTML += copytext.innerHTML;
	// console.debug(cityStatsHTML);
	clipboard.innerHTML = cityStatsHTML;
	range.selectNode(clipboard);
	selection.addRange(range);
	document.execCommand("copy");
	clipboard.innerHTML = '';
}

export function fFriendsCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("friendsText2")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function fGuildCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("guildText2")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function fHoodCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("hoodText2")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function BattlegroundCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("battlegroundText")
	// var numrows = copytext.rows.length;
	// range.setStartBefore(copytext.rows[0]);
	// range.setEndAfter(copytext.rows[numrows-1]);  
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function ExpeditionCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("expeditionText")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

export function TreasuryCopy() {
	var selection = window.getSelection();
	selection.removeAllRanges();
	var range = document.createRange();
	var copytext = document.getElementById("treasuryText")
	range.selectNode(copytext);
	selection.addRange(range);
	document.execCommand("copy");
}

function copyToClipboard(element) {
	var $temp = $("<textarea>");
	$("body").append($temp);
	var html = $(element).html();
	html = html.replace(/<br>/g, "\n"); // or \r\n
	console.debug(html);
	$temp.val(html).select();
	document.execCommand("copy");
	$temp.remove();
  }
  
