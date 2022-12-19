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
// import $ from "jquery";
import { Tooltip, Alert, Popover } from 'bootstrap';
import dayjs from 'dayjs';
import { targets, targetsTopic } from '../index.js';
import * as collapse from '../fn/collapse.js';
import icons from 'bootstrap-icons/bootstrap-icons.svg';
import * as helper from '../fn/helper.js';
import * as post_webstore from '../fn/post.js';
import * as element from '../fn/AddElement';
import { setCurrentPercent } from './GreatBuildingsService.js';


// targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';

export function conversationService(msg) {
    // console.debug(msg);
    var messages = null;
    // if(msg.responseData.category.type == 'guild'){
    if (msg.requestMethod == "getOverviewForCategory")
        messages = msg.responseData.category.teasers;
    else
        messages = msg.responseData.teasers;
    // console.debug(targetsTopic);
    // if(!targetsTopic) targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';
    messages.forEach(function (message) {
        // console.debug(message.title ,targetsTopic,message.title.toLowerCase().includes(targetsTopic.toLowerCase()));
        // if(message.title == targetsTopic){
        if (targetsTopic && message.title.toLowerCase().includes(targetsTopic.toLowerCase())) {
            var targetsGBG = document.createElement('div');
            var targetsHTML;
            if (document.getElementById("targetsGBG")) {
                targetsGBG = document.getElementById("targetsGBG");
            }
            else {
                targetsGBG.id = "targetsGBG";
                targets.appendChild(targetsGBG);
            }
            // console.debug(message.lastMessage.text);

            var timerId = Math.random().toString(36).substr(2, 5);
            targetsHTML = `<div id="alert-${timerId}" class="alert alert-info alert-dismissible show" role="alert">`;
            targetsHTML += element.close();
            if (helper.checkGBG())
                targetsHTML += `<button type="button" class="badge rounded-pill bg-primary right-button" id="targetPostID" style="display: ${collapse.collapseTarget ? 'none' : 'block'}">Post</button>`;

            targetsGBG.innerHTML = targetsHTML + `<p id="targetLabel" href="#targetText" aria-expanded="true" data-bs-toggle="collapse">
                <svg class="bi header-icon" id="targeticon" href="#targetText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTarget ? 'plus' : 'dash'}-circle"/></svg>
                <strong>GBG Targets</strong> ${message.lastMessage.date}</p><p id="targetText" class="collapse ${collapse.collapseTarget ? '' : 'show'}">${message.lastMessage.text.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br><span class="text-muted">by ${message.lastMessage.sender.name}. alert @ ${dayjs().format("HH:mm:ss")}</span></p></div>`;
            setTimeout(function () {
                targetsGBG.innerHTML = '';
            }, 600000);
          document.getElementById("targetLabel").addEventListener("click", collapse.fCollapseTarget);
            if (helper.checkGBG())
                document.getElementById("targetPostID").addEventListener("click", post_webstore.postTargetsToDiscord);
                
                // create alarms for sectors when they open
                // const target = Alert.getOrCreateInstance(`target-list`);
                // target.show();

        }
    });

    setCurrentPercent(0);    // reset to custom %
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
        console.debug('title', title);
        if (!title || title == '') return;
        else if (title.includes('%')) {
            var text = title.split('%')[0];
            if (parseInt(text) > 0) {
                setCurrentPercent(parseInt(text));
                return;
            }
            if (text.includes(' ')) {
                text = text.split(' ')[1];
                if (parseInt(text) > 0) {
                    setCurrentPercent(parseInt(text));
                    return;
                }
                else {
                    console.debug('in else 1');
                    const arrtitletext = title.split(' ');
                    arrtitletext.forEach(getIntValue);
                }
                }
        }
        else if (title.includes('1.85'))
            setCurrentPercent(185);
        else if (title.includes('1.8'))
            setCurrentPercent(180);
        else if (title.includes('1.91'))
            setCurrentPercent(191);
        else if (title.includes('1.92'))
            setCurrentPercent(192);
        else if (title.includes('1.93'))
            setCurrentPercent(193);
        else if (title.includes('1.94'))
            setCurrentPercent(194);
        else if (title.includes('1.95'))
            setCurrentPercent(195);
        else if (title.includes('1.96'))
            setCurrentPercent(196);
        else if (title.includes('1.97'))
            setCurrentPercent(197);
        else if (title.includes('1.98'))
            setCurrentPercent(198);
        else if (title.includes('1.99'))
            setCurrentPercent(199);
        else if (title.includes('2.0'))
            setCurrentPercent(200);
        else if (title.includes('2.00'))
            setCurrentPercent(200);
        else if (title.includes('190%'))
            setCurrentPercent(190);
        else if (title.includes('191%'))
            setCurrentPercent(191);
        else if (title.includes('192%'))
            setCurrentPercent(192);
        else if (title.includes('193%'))
            setCurrentPercent(193);
        else if (title.includes('194%'))
            setCurrentPercent(194);
        else if (title.includes('195%'))
            setCurrentPercent(195);
        else if (title.includes('196%'))
            setCurrentPercent(196);
        else if (title.includes('197%'))
            setCurrentPercent(197);
        else if (title.includes('198%'))
            setCurrentPercent(198);
        else if (title.includes('199%'))
            setCurrentPercent(199);
        else if (title.includes('200%'))
            setCurrentPercent(200);
        else if (title.includes('1.9'))
            setCurrentPercent(190);
        else {
                console.debug('in else 2');
                setCurrentPercent(190);
                const arrtitletext = title.split(' ');
                arrtitletext.forEach(getIntValue);
            }
    } catch (error) {
        console.log(error);
    }
}

function getIntValue(item, index) {
    console.debug('getIntValue 1',item,' ',index);
    if (item.includes('Hr'))
        return;
    item = item.replace('%','')
    console.debug('getIntValue 2',item,' ',index);
    if (parseInt(item) > 0) {
        setCurrentPercent(parseInt(item));
        console.debug('setCurrentPercent getIntValue',parseInt(item),' ',index);
    }
}