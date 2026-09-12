// FoE-Info API - demo SS
// https://script.google.com/macros/s/AKfycbw6QTefSBnuMF40Q8MpLcmCV8aB9dPNJnJzyjFBiZvBJaIlcE24JLkj/exec

// import $ from "jquery";
// import 'bootstrap';
// import Discord  from 'discord.js';
let Alert;
try {
  const bs = require('bootstrap');
  Alert = bs.Alert;
} catch {}
let alerts = null;
let EpocTime = 0;
let GameOrigin = '';
let GBGdata = [];
let MyInfo = { name: '' };
let url = {};
let element = null;
try {
  element = require('./AddElement');
} catch {}
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const state = require('../vars/state.js');
    alerts = state.alerts;
    EpocTime = state.EpocTime;
    GameOrigin = state.GameOrigin;
    GBGdata = state.GBGdata;
    MyInfo = state.MyInfo;
    url = state.url;
  } catch {}
}
let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('Post');
} catch {}

// Example POST method implementation:
async function postData(targetUrl = '', data = {}) {
  const response = await fetch(targetUrl, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    redirect: 'follow',
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function postToDiscord(text) {
  var webHookUrl = url?.discordTargetURL;
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured in options.');
    return;
  }

  if (typeof window !== 'undefined' && window.getSelection) {
    var selection = window.getSelection();
    if (selection && selection.removeAllRanges) selection.removeAllRanges();
  }

  var oReq = new XMLHttpRequest();
  var params = {
    username: MyInfo?.name || 'FoE-Info',
    avatar_url: '',
    content: text,
  };

  oReq.open('POST', webHookUrl, true);
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.onreadystatechange = function () {
    logger?.debug('Discord post status:', oReq.readyState, oReq.responseText);
  };
  oReq.send(JSON.stringify(params));
}

function sanitizeDiscordText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function postTargetList(unlocked, locked) {
  const parts = [];
  const cleanUnlocked = sanitizeDiscordText(unlocked);
  const cleanLocked = sanitizeDiscordText(locked);
  if (cleanUnlocked) parts.push(cleanUnlocked);
  if (cleanLocked) parts.push(cleanLocked);
  const text = parts.join('\n');
  if (text) {
    postToDiscord(text);
  }
}

function postTargetsToDiscord() {
  const targetTextEl =
    typeof document !== 'undefined' ?
      document.getElementById('targetText')
    : null;
  if (!targetTextEl) return;

  const webHookUrl = url?.discordTargetURL;
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured in options.');
    return;
  }

  const clone =
    typeof targetTextEl.cloneNode === 'function' ?
      targetTextEl.cloneNode(true)
    : targetTextEl;
  const muted =
    typeof clone.querySelectorAll === 'function' ?
      clone.querySelectorAll('.text-muted, span')
    : [];
  if (Array.isArray(muted) || (muted && typeof muted.forEach === 'function')) {
    muted.forEach((el) => {
      if (typeof el.remove === 'function') el.remove();
    });
  }

  const cleanText = sanitizeDiscordText(
    clone.innerHTML || clone.innerText || '',
  );
  if (!cleanText) return;

  const content = cleanText + '\n----------';
  postToDiscord(content);
}

function postTargetGenToDiscord() {
  const targetGenTextEl =
    typeof document !== 'undefined' ?
      document.getElementById('targetGenText')
    : null;
  if (!targetGenTextEl) return;

  const webHookUrl = url?.discordTargetURL;
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured in options.');
    return;
  }

  const cleanText = sanitizeDiscordText(
    targetGenTextEl.innerHTML || targetGenTextEl.innerText || '',
  );
  if (!cleanText) return;

  const content = cleanText + '\n----------';
  postToDiscord(content);
}

function postGBGtoSS() {
  // console.debug(data[0]);
  var googleSheetAPI = url.sheetGuildURL;
  var copytext = document.getElementById('battlegroundText');

  var reqData = {
    sheet: 'GBG',
    epoc: EpocTime,
    GBGdata: GBGdata,
  };

  var oReq = new XMLHttpRequest();
  oReq.open('POST', googleSheetAPI, true);
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.setRequestHeader('Access-Control-Allow-Origin', '*');
  oReq.onreadystatechange = function () {
    if (oReq.readyState == XMLHttpRequest.DONE) {
      // alert(oReq.responseText);
      console.debug(GameOrigin, oReq.responseText);
    }
  };
  oReq.send(JSON.stringify(reqData));
  // oReq.send(reqData.toString);
  // console.debug(reqData,JSON.stringify(reqData));
}

function postAlerttoDsicord() {
  var copytext = document.getElementById('alertText').textContent;
  postToDiscord(copytext);
}

function logToDiscord(text) {
  var webHookUrl = url.discordLogURL || url.discordTargetURL;
  if (!webHookUrl) {
    console.warn('Discord Log Webhook URL is not configured.');
    return;
  }

  var selection = window.getSelection();
  selection.removeAllRanges();

  var oReq = new XMLHttpRequest();
  var params = {
    username: MyInfo.name,
    avatar_url: '',
    content: text,
  };
  // console.debug(params);
  //register method called after data has been sent method is executed
  // oReq.addEventListener("load", reqListener);
  oReq.open('POST', webHookUrl, true);
  // oReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  oReq.setRequestHeader('Content-type', 'application/json');
  // oReq.send(JSON.stringify(myJSONStr));
  oReq.send(JSON.stringify(params));
}

function postPlayerToSS(visitData) {
  // console.debug(visitData);
  var googleSheetAPI = url.sheetGuildURL;

  alerts.innerHTML = `<div class="alert alert-danger alert-dismissible show " role="alert">
		${element.close()}
		<p id="alertText"><strong>Posting Guild Stats to SS ... </strong><br>${visitData[0].Name}</p></div>`;

  var reqData = {
    sheet: 'Guild',
    playerData: visitData,
    user: MyInfo.name,
  };

  var oReq = new XMLHttpRequest();
  oReq.open('POST', googleSheetAPI, true);
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.setRequestHeader('Access-Control-Allow-Origin', '*');
  oReq.onreadystatechange = function () {
    if (oReq.readyState == XMLHttpRequest.DONE) {
      // alert(oReq.responseText);
      console.debug(oReq.responseText);
      try {
        alerts.innerHTML = `<div class="alert alert-danger alert-dismissible show " role="alert">
				${element.close()}
				<p id="alertText"><strong>Guild Stats: </strong><br>${JSON.parse(oReq.responseText).result}
				</p></div>`;
      } catch {
        alerts.innerHTML = oReq.responseText;
      }
      setTimeout(function () {
        const alert = Alert.getOrCreateInstance(`#alertText`);
        alert.close();
        alert.dispose();
        alerts.innerHTML = '';
      }, 60000);
    }
  };
  oReq.send(JSON.stringify(reqData));
  // oReq.send(reqData.toString);
  console.debug(reqData, JSON.stringify(reqData));
}

function setPostContext(context = {}) {
  if (context.url !== undefined) url = context.url;
  if (context.MyInfo !== undefined) MyInfo = context.MyInfo;
}

module.exports = {
  postData,
  postToDiscord,
  sanitizeDiscordText,
  postTargetList,
  postTargetsToDiscord,
  postTargetGenToDiscord,
  postGBGtoSS,
  postAlerttoDsicord,
  logToDiscord,
  postPlayerToSS,
  setPostContext,
};
module.exports.default = module.exports;
