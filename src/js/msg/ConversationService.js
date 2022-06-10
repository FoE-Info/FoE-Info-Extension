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
import dayjs from 'dayjs';
import {targets,targetsTopic} from '../index.js';
import * as collapse from '../fn/collapse.js';
import icons from 'bootstrap-icons/bootstrap-icons.svg';
import * as helper from '../fn/helper.js';
import * as post_webstore from '../fn/post_webstore.js';
import {setCurrentPercent} from './GreatBuildingsService.js';


// targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';

export function conversationService(msg){
    // console.debug(msg);
    var messages = null;
    // if(msg.responseData.category.type == 'guild'){
        if(msg.requestMethod == "getOverviewForCategory")
            messages = msg.responseData.category.teasers;
        else
            messages = msg.responseData.teasers;
        // console.debug(targetsTopic);
        // if(!targetsTopic) targetsTopic = '🎯🎯 Battleground TARGETS 🎯🎯';
        messages.forEach(function (message) {
            // console.debug(message.title ,targetsTopic,message.title.toLowerCase().includes(targetsTopic.toLowerCase()));
            // if(message.title == targetsTopic){
            if(targetsTopic && message.title.toLowerCase().includes(targetsTopic.toLowerCase())){
                var targetsGBG = document.createElement('div');
                var targetsHTML;
                if(document.getElementById("targetsGBG")){
                    targetsGBG = document.getElementById("targetsGBG");
                }
                else{
                    targetsGBG.id="targetsGBG";
                    targets.appendChild(targetsGBG);
                }
                // console.debug(message.lastMessage.text);

                var timerId = Math.random().toString(36).substr(2, 5);
                targetsHTML = `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="alert">
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;

                if(helper.checkGBG())
                    targetsHTML += `<button type="button" class="badge rounded-pill bg-primary right-button" id="targetPostID" style="display: ${collapse.collapseTarget ? 'none' : 'block'}">Post</button>`;

                targetsGBG.innerHTML = targetsHTML + `<p id="targetLabel" href="#targetText" aria-expanded="true" data-bs-toggle="collapse">
                <svg class="bi header-icon" id="targeticon" href="#targetText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTarget ? 'plus' : 'dash'}-circle"/></svg>
                <strong>GBG Targets</strong> ${message.lastMessage.date}</p><p id="targetText" class="collapse ${collapse.collapseTarget ? '' : 'show'}">${message.lastMessage.text.replace(/(?:\r\n|\r|\n)/g, '<br>')}<br><span class="text-muted">by ${message.lastMessage.sender.name}. alert @ ${dayjs().format("HH:mm:ss")}</span></p></div>`;
                // targetsGBG.innerHTML = `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="alert">
                // <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                // <p id="alertText"><strong>GBG Targets @ ${moment().format('LT')}</strong><br>${message.lastMessage.text.replace(/(?:\r\n|\r|\n)/g, '<br>')}</p></div>`;
                // document.getElementById("targetsText").textContent = message.lastMessage.text.replace(/(?:\r\n|\r|\n)/g, '<br>');
                $(document).ready(function() {
                    // show the alert
                    setTimeout(function() {
                        $(`.alert-${timerId}`).alert('close');
                    }, 600000);
                });
                document.getElementById("targetLabel").addEventListener("click", collapse.fCollapseTarget);
                if(helper.checkGBG())
                    document.getElementById("targetPostID").addEventListener("click", post_webstore.postTargetsToDiscord);
            }
          });

          setCurrentPercent(0);    // reset to custom %
}

export function getConversation(msg){
    // console.debug(msg);
    if(msg.hasOwnProperty('responseData') && msg.hasOwnProperty('adminIds')){

    }

    // if title includes donation %, setCurrentPercent for dontation helper
    getPercent(msg.responseData.title);
}

function getPercent(title){
    try {
        if (!title || title == '') return;
        else if (title.includes('%')){
            var text = title.split('%')[0];
            if(parseInt(text) > 0){
                setCurrentPercent(parseInt(text));
                return;
            }
            if(text.includes(' ')){
                text = text.split(' ')[1];
                if(parseInt(text) > 0){
                    setCurrentPercent(parseInt(text));
                    return;
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
        else if (title.includes('1.98'))
            setCurrentPercent(198);
        else if (title.includes('1.9'))
            setCurrentPercent(190);
        else if (title.includes('200%'))
            setCurrentPercent(200);
    } catch (error) {
        console.log(error);
    }
}
