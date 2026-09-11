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

import { Alert, Popover, Tooltip } from 'bootstrap';
import dayjs from 'dayjs';
import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import * as helper from '../fn/helper.js';
import * as post_webstore from '../fn/post.js';
import { extractRateFromTitle } from '../fn/rateParser.js';
import { targets, targetsTopic } from '../vars/state.js';
import { setCurrentPercent } from './GreatBuildingsService.js';

let targetsTimer = null;

export function conversationService(msg) {
  // console.debug(msg);
  var messages = null;
  // if(msg.responseData.category.type == 'guild'){
  if (msg.requestMethod == 'getOverviewForCategory')
    messages = msg.responseData.category.teasers;
  else messages = msg.responseData.teasers;
  // console.debug(targetsTopic);
  // if(!targetsTopic) targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';
  messages.forEach(function (message) {
    // console.debug(message.title ,targetsTopic,message.title.toLowerCase().includes(targetsTopic.toLowerCase()));
    // if(message.title == targetsTopic){
    if (
      targetsTopic &&
      message.title.toLowerCase().includes(targetsTopic.toLowerCase())
    ) {
      var targetsGBG = document.createElement('div');
      var targetsHTML;
      if (document.getElementById('targetsGBG')) {
        targetsGBG = document.getElementById('targetsGBG');
      } else {
        targetsGBG.id = 'targetsGBG';
        targets.appendChild(targetsGBG);
      }
      // console.debug(message.lastMessage.text);

      var timerId = Math.random().toString(36).substr(2, 5);
      targetsHTML = `<div id="alert-${timerId}" class="alert alert-info alert-dismissible show" role="alert">`;
      targetsHTML += element.close();
      if (helper.checkGBG())
        targetsHTML += element.post(
          'targetPostID',
          'primary',
          'right',
          collapse.collapseTarget,
        );

      const safeText = helper
        .escapeHTML(message.lastMessage.text)
        .replace(/(?:\r\n|\r|\n)/g, '<br>');
      const safeSender = helper.escapeHTML(message.lastMessage.sender.name);
      const safeDate = helper.escapeHTML(message.lastMessage.date);

      targetsGBG.innerHTML =
        targetsHTML +
        `<p id="targetLabel" href="#targetText" aria-expanded="true" data-bs-toggle="collapse">
      ${element.icon('targeticon', 'targetText', collapse.collapseTarget)}
                <strong>GBG Targets</strong> ${safeDate}</p><p id="targetText" class="collapse ${
                  collapse.collapseTarget ? '' : 'show'
                }">${safeText}<br><span class="text-muted">by ${safeSender}. alert @ ${dayjs().format(
                  'HH:mm:ss',
                )}</span></p></div>`;
      if (targetsTimer) clearTimeout(targetsTimer);
      targetsTimer = setTimeout(function () {
        if (targetsGBG) targetsGBG.innerHTML = '';
        targetsTimer = null;
      }, 600000);
      document
        .getElementById('targetLabel')
        ?.addEventListener('click', collapse.fCollapseTarget);
      if (helper.checkGBG())
        document
          .getElementById('targetPostID')
          ?.addEventListener('click', post_webstore.postTargetsToDiscord);

      // create alarms for sectors when they open
      // const target = Alert.getOrCreateInstance(`target-list`);
      // target.show();
    }
  });

  setCurrentPercent(0); // reset to custom %
}

export function getConversation(msg) {
  // console.debug(msg);
  if (msg.hasOwnProperty('responseData') && msg.hasOwnProperty('adminIds')) {
  }

  // if title includes donation %, setCurrentPercent for dontation helper
  getPercent(msg.responseData.title);
}

function getPercent(title) {
  try {
    if (!title || title === '') return;
    const rate = extractRateFromTitle(title);
    setCurrentPercent(rate);
  } catch (error) {
    console.log(error);
  }
}

export { extractRateFromTitle };
