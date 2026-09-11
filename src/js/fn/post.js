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
// FoE-Info API - demo SS
// https://script.google.com/macros/s/AKfycbw6QTefSBnuMF40Q8MpLcmCV8aB9dPNJnJzyjFBiZvBJaIlcE24JLkj/exec

// import $ from "jquery";
// import 'bootstrap';
// import Discord  from 'discord.js';
import { Alert, Popover, Tooltip } from 'bootstrap';
import {
  alerts,
  EpocTime,
  GameOrigin,
  GBGdata,
  MyInfo,
  url,
} from '../vars/state.js';
import * as element from './AddElement';

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

export function postToDiscord(text) {
  var webHookUrl = url.discordTargetURL;
  if (!webHookUrl) {
    console.warn('Discord Webhook URL is not configured in options.');
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

  oReq.open('POST', webHookUrl, true);
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.onreadystatechange = function () {
    console.debug(oReq.readyState, oReq.responseText);
  };
  oReq.send(JSON.stringify(params));
}

export function postTargetsToDiscord() {
  if (!document.getElementById('targetText')) return;

  var webHookUrl = url.discordTargetURL;
  if (!webHookUrl) {
    console.warn('Discord Webhook URL is not configured in options.');
    return;
  }

  var selection = window.getSelection();
  selection.removeAllRanges();

  var oReq = new XMLHttpRequest();
  var params = {
    username: MyInfo.name,
    avatar_url: '',
    // 'content': document.getElementById("targetText").innerHTML.replace(/<br\s*\/?>/ig, "\n").replace(/(<([^>]+)>)/gi, "").replace(/[\w\W]+?\n+?/,"").replace(/\n.*$/, '')
    content:
      document
        .getElementById('targetText')
        .innerHTML.replace(/<br\s*\/?>/gi, '\n')
        .replace(/(<([^>]+)>)/gi, '')
        .replace(/\n.*$/, '') + '\n----------',
  };
  oReq.open('POST', webHookUrl, true);
  // oReq.withCredentials = true;
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.onreadystatechange = function () {
    console.debug(oReq.readyState, oReq.responseText);
  };
  oReq.send(JSON.stringify(params));
  console.debug(
    oReq,
    params,
    document
      .getElementById('targetText')
      .innerHTML.replace(/<br\s*\/?>/gi, '\n')
      .replace(/(<([^>]+)>)/gi, ''),
  );
}

export function postGBGtoSS() {
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

export function postAlerttoDsicord() {
  var copytext = document.getElementById('alertText').textContent;
  postToDiscord(copytext);
}

export function logToDiscord(text) {
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

export function postPlayerToSS(visitData) {
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
