// FoE-Info API - demo SS
// https://script.google.com/macros/s/AKfycbw6QTefSBnuMF40Q8MpLcmCV8aB9dPNJnJzyjFBiZvBJaIlcE24JLkj/exec

// import $ from "jquery";
// import 'bootstrap';
// import Discord  from 'discord.js';
let EpocTime = 0;
let GameOrigin = '';
let GBGdata = [];
let MyInfo = { name: '' };
let url = {};
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const state = require('../vars/state.js');
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

const {
  validateDestinationUrl: _validateDestination,
} = require('../utils/destinationValidator.js');

/**
 * Returns the URL if it passes destination validation, or null if rejected.
 * Empty strings are allowed (feature not configured).
 */
function _validatedUrl(rawUrl, serviceHint) {
  const result = _validateDestination(rawUrl, { serviceHint });
  if (result.valid) return rawUrl || null;
  logger?.warn(`Destination rejected (${serviceHint}): ${result.reason}`);
  return null;
}

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
  let webHookUrl = _validatedUrl(url?.discordTargetURL, 'discord');
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured or invalid.');
    return;
  }

  if (typeof window !== 'undefined' && window.getSelection) {
    let selection = window.getSelection();
    if (selection && selection.removeAllRanges) selection.removeAllRanges();
  }

  let oReq = new XMLHttpRequest();
  let params = {
    username: MyInfo?.name || 'FoE-Info',
    avatar_url: '',
    content: text,
  };

  oReq.open('POST', webHookUrl, true);
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.onreadystatechange = function () {
    if (oReq.readyState === 4)
      logger?.debug('Discord post completed:', oReq.status);
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

function postTargetsToDiscord() {
  const targetTextEl =
    typeof document !== 'undefined' ?
      document.getElementById('targetText')
    : null;
  if (!targetTextEl) return;

  const webHookUrl = _validatedUrl(url?.discordTargetURL, 'discord');
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured or invalid.');
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

  const webHookUrl = _validatedUrl(url?.discordTargetURL, 'discord');
  if (!webHookUrl) {
    logger?.debug('Discord Webhook URL is not configured or invalid.');
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
  let googleSheetAPI = _validatedUrl(url.sheetGuildURL, 'sheets');
  if (!googleSheetAPI) {
    logger?.warn('Google Sheet URL is not configured or invalid.');
    return;
  }

  let reqData = {
    sheet: 'GBG',
    epoc: EpocTime,
    GBGdata: GBGdata,
  };

  let oReq = new XMLHttpRequest();
  oReq.open('POST', googleSheetAPI, true);
  oReq.setRequestHeader('Content-type', 'application/json');
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

function setPostContext(context = {}) {
  if (context.url !== undefined) url = context.url;
  if (context.MyInfo !== undefined) MyInfo = context.MyInfo;
}

module.exports = {
  postData,
  postToDiscord,
  sanitizeDiscordText,
  postTargetsToDiscord,
  postTargetGenToDiscord,
  postGBGtoSS,
  setPostContext,
};
module.exports.default = module.exports;
