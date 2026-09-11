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
import browser from 'webextension-polyfill';
import {
  calculateProvinceAttrition,
  formatCampsText,
  formatSectorName,
  formatTargetToken,
  getAttritionReduction,
} from '../calc/GbgCalculator.js';
import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import { setBuildingCostSize, toolOptions } from '../fn/globals.js';
import * as helper from '../fn/helper.js';
import * as post_webstore from '../fn/post.js';
import * as storage from '../fn/storage.js';
import {
  buildBuildingCostsTableHTML,
  buildingCostCopy,
  buildLeaderboardHTML,
  copyToClipboard,
  renderBuildingCostCard,
  renderTargetGeneratorCard,
  targetCopy,
} from '../ui/gbgProvinceView.js';
import { formatDateTime } from '../utils/date.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import {
  battlegroundDIV,
  BattlegroundPerformance,
  BGtime,
  BuildingDefs,
  content,
  donationDIV,
  EpocTime,
  GameOrigin,
  GBGdata,
  gbgLeaderboardDIV,
  GuildMembers,
  output,
  setBGtime,
  targets,
  targetText,
  url,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
} from '../vars/state.js';

const logger = createLogger('GBG');

var map = [];
var signals = [];
var battlegroundParticipants = [];
var mapName = '';
var ProvinceDefs = [];

var currentParticipantId = 0;

export function getPlayerLeaderboard(msg) {
  BattlegroundPerformance.length = 0;
  GBGdata.length = 0;
  // GuildMembers = BattlegroundPerformance;		// save old values
  msg.responseData.forEach((entry) => {
    // console.debug(entry);
    var wonNegotiations = 0;
    var wonBattles = 0;
    var attrition = 0;
    if (entry.negotiationsWon) wonNegotiations = entry.negotiationsWon;
    if (entry.battlesWon) wonBattles = entry.battlesWon;
    if (entry.attrition) attrition = entry.attrition;
    GBGdata.push({
      name: entry.player.name,
      total: wonNegotiations * 2 + wonBattles,
    });
    BattlegroundPerformance.push({
      name: entry.player.name,
      wonNegotiations: wonNegotiations,
      wonBattles: wonBattles,
      attrition: attrition,
    });
  });
  // console.debug('BattlegroundPerformance',BattlegroundPerformance,GBGdata);

  console.debug('2', showOptions.showBattleground);

  if (showOptions.showBattleground) {
    browser.storage.local
      .get([GameOrigin, GameOrigin + 'BGtime'])
      .then((items) => {
        console.debug('items', items);
        if (items[GameOrigin] && Array.isArray(items[GameOrigin])) {
          GuildMembers.length = 0;
          GuildMembers.push(...items[GameOrigin]);
        }
        // console.debug('GuildMembers',GuildMembers);
        storage.set(GameOrigin + 'BGtime', EpocTime);
        if (items[GameOrigin + 'BGtime'])
          setBGtime(formatDateTime(items[GameOrigin + 'BGtime']));
        else setBGtime('not set');

        BattlegroundPerformance.forEach((entry) => {
          // console.debug('entry',entry);
          if (GuildMembers.find((id) => id.name == entry.name) == null)
            GuildMembers.push({
              name: entry.name,
              wonNegotiations: 0,
              wonBattles: 0,
            }); // if member not listed, add new member
        });
        console.debug('save GBG', GameOrigin, BattlegroundPerformance);
        storage.set(GameOrigin, BattlegroundPerformance);
        helper.fshowBattleground();
      });
    if (donationDIV) helper.translateContainer(donationDIV);
  }
}

export function getLeaderboard(msg) {
  const leaderboard = msg.responseData;
  const isCollapsed = Boolean(collapse?.collapseGBGLeaderboard);
  const iconHtml =
    element && typeof element.icon === 'function' ?
      element.icon('gbgLeaderboardIcon', 'gbgLeaderboardCollapse', isCollapsed)
    : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="gbgLeaderboardIcon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="gbgLeaderboardCollapse" data-bs-target="#gbgLeaderboardCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;
  const closeBtn =
    element && typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const copyBtn =
    element && typeof element.copy === 'function' ?
      element.copy('gbgLeaderboardCopyID', 'info', 'right', isCollapsed)
    : `<span id="gbgLeaderboardCopyID" role="button" tabindex="0" class="badge rounded-pill bg-info float-end right-button" style="display: ${isCollapsed ? 'none' : 'block'}" data-i18n="copy">Copy</span>`;

  const leaderboardHTML = buildLeaderboardHTML(leaderboard);
  const targetEl =
    (typeof document !== 'undefined' &&
      document.getElementById('gbgLeaderboard')) ||
    gbgLeaderboardDIV ||
    output;

  if (targetEl) {
    const tableMarkup =
      leaderboardHTML.startsWith('<table') ? leaderboardHTML : (
        `<table class="goods-table w-100">${leaderboardHTML}</table>`
      );

    targetEl.innerHTML = `<div id="gbgLeaderboardCard" class="alert alert-info alert-dismissible show collapsed" role="alert">
      ${closeBtn}
      <p id="gbgLeaderboardTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#gbgLeaderboardCollapse" aria-expanded="${!isCollapsed}" aria-controls="gbgLeaderboardCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <strong>GBG Leaderboard:</strong>
      </p>
      ${copyBtn}
      <div id="gbgLeaderboardCollapse" class="alert-info overflow resize collapse ${isCollapsed ? '' : 'show'}">
        <div id="leaderboardText" class="mt-1">${tableMarkup}</div>
      </div>
    </div>`;

    const labelEl = document.getElementById('gbgLeaderboardTextLabel');
    if (labelEl) {
      labelEl.addEventListener('click', (e) => {
        if (e.target?.closest?.('#gbgLeaderboardIcon')) return;
        if (typeof collapse?.fCollapseGBGLeaderboard === 'function') {
          collapse.fCollapseGBGLeaderboard();
        }
      });
    }

    const iconEl = document.getElementById('gbgLeaderboardIcon');
    if (iconEl && typeof collapse?.fCollapseGBGLeaderboard === 'function') {
      iconEl.addEventListener('click', (e) => {
        e?.stopPropagation?.();
        collapse.fCollapseGBGLeaderboard();
      });
    }

    const copyEl = document.getElementById('gbgLeaderboardCopyID');
    if (copyEl) {
      copyEl.addEventListener('click', () => {
        if (typeof copyToClipboard === 'function') {
          copyToClipboard('#leaderboardText');
        }
      });
    }

    if (helper && typeof helper.translateContainer === 'function') {
      helper.translateContainer(targetEl);
    }
  }
}

export function getState(msg) {
  // console.debug('getState:', msg);
  if (msg.responseData.stateId == 'subscribed') {
    console.debug('msg:', msg);
    storage.remove(GameOrigin + 'BGtime');
    storage.remove(GameOrigin);
    BattlegroundPerformance.length = 0;
    GBGdata.length = 0;
    var totalFights = 0;
    var totalNegs = 0;
    var battlegroundHTML = `<div id="battlegroundResultCard" class="alert alert-info alert-dismissible show collapsed" role="alert">
        ${element.close()}
        <p id="battlegroundResultTextLabel" class="cursor-pointer" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#battlegroundTextCollapse" aria-expanded="${!collapse.collapseBattleground}" aria-controls="battlegroundTextCollapse" style="cursor: pointer; user-select: none;">
      ${element.icon('battlegroundicon', 'battlegroundTextCollapse', collapse.collapseBattleground)}
        <strong>Battleground Result:</strong></p>`;
    // if (url.sheetGuildURL)
    //   battlegroundHTML += element.post(
    //     "battlegroundPostID",
    //     "info",
    //     "mid",
    //     collapse.collapseBattleground
    //   );
    battlegroundHTML += element.copy(
      'battlegroundCopyID',
      'info',
      'right',
      collapse.collapseBattleground,
    );
    battlegroundHTML += `<div id="battlegroundTextCollapse" class="table-responsive resize-both collapse ${
      collapse.collapseBattleground ? '' : 'show'
    }"><div class="overflow-y" id="battlegroundText"><table id="gbg-table" class="gbg-table w-100"><thead><tr><th class="text-center">Rank</th><th class="text-start">Member</th><th class="text-center">Negs</th><th class="text-center">Fights</th><th class="text-center">Attrition</th></tr></thead><tbody>`;
    msg.responseData.playerLeaderboardEntries.forEach((entry) => {
      var wonNegotiations = 0;
      var wonBattles = 0;
      var attrition = 0;
      if (entry.negotiationsWon) wonNegotiations = entry.negotiationsWon;
      if (entry.battlesWon) wonBattles = entry.battlesWon;
      if (entry.attrition) attrition = entry.attrition;
      BattlegroundPerformance.push([
        entry.rank,
        entry.player.name,
        wonNegotiations,
        wonBattles,
        attrition,
      ]);
      const safePlayerName = helper.escapeHTML(entry.player.name);
      battlegroundHTML += `<tr><td class="text-center">${entry.rank}</td><td class="text-start">${safePlayerName}</td><td class="text-center">${wonNegotiations}</td><td class="text-center">${wonBattles}</td><td class="text-center">${attrition}</td></tr>`;
      // console.debug(entry.rank,entry.name,wonNegotiations,wonBattles);
      totalFights += wonBattles;
      totalNegs += wonNegotiations;
    });
    battlegroundHTML += `</tbody><tfoot><tr><th></th><th class="text-start">Guild Total</th><th class="text-center">${totalNegs}</th><th class="text-center">${totalFights}</th><th></th></tr></tfoot>`;

    const targetEl =
      (typeof document !== 'undefined' &&
        document.getElementById('battleground')) ||
      battlegroundDIV ||
      donationDIV;
    if (targetEl) {
      targetEl.innerHTML = battlegroundHTML + `</table></div></div></div>`;
    }
    const postEl = document.getElementById('battlegroundPostID');
    if (postEl && url.sheetGuildURL) {
      postEl.addEventListener('click', post_webstore.postGBGtoSS);
    } else {
      const copyEl = document.getElementById('battlegroundCopyID');
      if (copyEl) copyEl.addEventListener('click', copy.BattlegroundCopy);
    }
    const labelEl = document.getElementById('battlegroundResultTextLabel');
    if (labelEl) {
      labelEl.addEventListener('click', (e) => {
        if (
          e?.target &&
          typeof e.target.closest === 'function' &&
          e.target.closest('#battlegroundicon')
        ) {
          return;
        }
        collapse.fCollapseBattleground();
      });
    }
    const iconEl = document.getElementById('battlegroundicon');
    if (iconEl && iconEl !== labelEl) {
      iconEl.addEventListener('click', () => {
        collapse.fCollapseBattleground();
      });
    }
    msg.responseData.playerLeaderboardEntries.forEach((entry) => {
      // console.debug(entry);
      var wonNegotiations = 0;
      var wonBattles = 0;
      if (entry.wonNegotiations) wonNegotiations = entry.wonNegotiations;
      if (entry.wonBattles) wonBattles = entry.wonBattles;
      // GBGdata[i] = {'name':entry.player.name,
      // 'wonNegotiations': wonNegotiations,
      // 'wonBattles': wonBattles,
      // 'total':wonNegotiations*2+wonBattles};
      GBGdata.push({
        name: entry.player.name,
        total: wonNegotiations * 2 + wonBattles,
      });
    });
    // console.debug('GBGdata',GBGdata);
  }
}

export function getBattleground(msg) {
  mapName = msg.responseData.map.id.split('_')[0];
  console.debug(mapName, msg);
  if (mapName == 'volcano') ProvinceDefs = VolcanoProvinceDefs;
  else if (mapName == 'waterfall') ProvinceDefs = WaterfallProvinceDefs;

  var oldMap = map;
  currentParticipantId = msg.responseData.currentParticipantId;
  map = msg.responseData.map.provinces;
  // console.debug(oldMap,map);
  map.forEach((province, i) => {
    if (!province.id) province.id = 0;
    // if(oldMap[i] && oldMap[i].placedBuildings){
    //     province.placedBuildings = oldMap[i].placedBuildings;
    // }
    if (Array.isArray(oldMap) && oldMap.length > 0) {
      const oldProv = oldMap.find(
        (oldProvince) => oldProvince.id == province.id,
      );
      if (oldProv) {
        if (oldProv.placedBuildings)
          province.placedBuildings = oldProv.placedBuildings;
        if (oldProv.availableBuildings)
          province.availableBuildings = oldProv.availableBuildings;
      }
    }
  });
  // console.debug(map);
  // console.debug(map);

  battlegroundParticipants = msg.responseData.battlegroundParticipants || [];
  const myClan =
    Array.isArray(battlegroundParticipants) ?
      battlegroundParticipants.find(
        (clan) => clan.participantId == msg.responseData.currentParticipantId,
      )
    : null;
  signals = myClan?.signals ? [...myClan.signals] : [];
  if (Array.isArray(signals)) {
    signals.forEach((clan) => {
      if (clan.provinceId === undefined && clan.id !== undefined)
        clan.provinceId = clan.id;
      if (clan.provinceId === undefined) clan.provinceId = 0;
      if (clan.id === undefined) clan.id = clan.provinceId;
      if (clan.signal === undefined && clan.type !== undefined)
        clan.signal = clan.type;
      if (clan.type === undefined && clan.signal !== undefined)
        clan.type = clan.signal;
    });
  }
  console.debug(map, signals, battlegroundParticipants);

  // console.debug(message.lastMessage.text);

  checkProvinces();
}

export function getBuildings(msg) {
  var provinceId = 0;
  if (msg?.responseData?.provinceId) provinceId = msg.responseData.provinceId;
  const prov =
    Array.isArray(map) ?
      map.find((province) => province.id == provinceId)
    : null;
  if (prov) {
    prov.placedBuildings = msg.responseData.placedBuildings;
    prov.availableBuildings = msg.responseData.availableBuildings;
  }
  checkProvinces();
  if (showOptions.buildingCosts && msg?.responseData?.availableBuildings)
    showBuildingCost(msg.responseData);
  // console.debug('getBuildings',msg.responseData,map);
}

export function getUpdatedProvinces(msg) {
  if (!Array.isArray(map)) return;
  const updatedProvinces =
    Array.isArray(msg?.responseData) ? msg.responseData
    : Array.isArray(msg) ? msg
    : [];
  for (const updated of updatedProvinces) {
    if (!updated || updated.id === undefined) continue;
    const existing = map.find((p) => p.id == updated.id);

    const wasConquered = Boolean(
      (updated.ownerId !== undefined &&
        currentParticipantId &&
        updated.ownerId == currentParticipantId) ||
      (existing &&
        existing.ownerId !== undefined &&
        updated.ownerId !== undefined &&
        existing.ownerId !== updated.ownerId) ||
      (updated.lockedUntil &&
        (!existing?.lockedUntil || updated.lockedUntil > existing.lockedUntil)),
    );

    if (existing) {
      if (existing.placedBuildings && !updated.placedBuildings) {
        updated.placedBuildings = existing.placedBuildings;
      }
      if (existing.availableBuildings && !updated.availableBuildings) {
        updated.availableBuildings = existing.availableBuildings;
      }
      Object.assign(existing, updated);
    } else {
      map.push(updated);
    }
    if (wasConquered) {
      if (Array.isArray(signals)) {
        signals = signals.filter(
          (p) =>
            Number(p.id !== undefined ? p.id : p.provinceId) !==
            Number(updated.id),
        );
      }
    }
  }
  checkProvinces();
}

export function updateSignal(msg, payload, context) {
  const data = msg?.responseData || payload || msg?.requestData || msg;
  const candidateObj =
    typeof data === 'object' && !Array.isArray(data) ? data
    : Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' ?
      data[0]
    : null;

  let provinceId =
    candidateObj ? (candidateObj.provinceId ?? candidateObj.id)
    : Array.isArray(data) ? data[0]
    : null;
  let signalType =
    candidateObj ? (candidateObj.type ?? candidateObj.signal)
    : Array.isArray(data) ? data[1]
    : null;

  if (
    provinceId !== undefined &&
    provinceId !== null &&
    !isNaN(Number(provinceId))
  ) {
    provinceId = Number(provinceId);
  }

  logger?.debug('updateSignal data resolved:', {
    provinceId,
    signalType,
    signalsCount: signals.length,
  });

  if (provinceId === undefined || provinceId === null || isNaN(provinceId)) {
    logger?.debug('updateSignal returned early - provinceId is null/undefined');
    return;
  }

  if (!signalType || signalType === 'none' || signalType === 'clear') {
    removeSignal(msg, [provinceId], context);
  } else {
    setSignal(msg, [provinceId, signalType], context);
  }
}

export function setSignal(msg, payload, context) {
  let data =
    Array.isArray(payload) && payload.length > 0 ? payload
    : Array.isArray(msg?.requestData) && msg.requestData.length > 0 ?
      msg.requestData
    : Array.isArray(msg?.responseData) && msg.responseData.length > 0 ?
      msg.responseData
    : Array.isArray(msg) && msg.length > 0 ? msg
    : [];

  if (data.length === 0 && context) {
    const reqPayloadItems =
      Array.isArray(context.requestPayload) ? context.requestPayload
      : context.requestPayload && typeof context.requestPayload === 'object' ?
        [context.requestPayload]
      : [];
    if (reqPayloadItems.length > 0) {
      const match =
        (msg?.requestId !== undefined ?
          reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqPayloadItems.find(
          (r) =>
            r &&
            (r.requestMethod === 'setSignal' ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqPayloadItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        data = match.requestData;
      }
    }

    if (data.length === 0) {
      const postText =
        context?.request?.request?.postData?.text ||
        context?.request?.postData?.text ||
        context?.postData?.text ||
        (typeof context?.postData === 'string' ? context.postData : null) ||
        (typeof context?.request?.postData === 'string' ?
          context.request.postData
        : typeof context?.request?.request?.postData === 'string' ?
          context.request.request.postData
        : null);
      if (postText) {
        try {
          const parsed =
            typeof postText === 'string' ? JSON.parse(postText) : postText;
          const reqItems = Array.isArray(parsed) ? parsed : [parsed];
          const match = reqItems.find(
            (r) =>
              r &&
              (r.requestMethod === 'setSignal' ||
                r.requestClass?.includes('GuildBattleground')),
          );
          if (
            Array.isArray(match?.requestData) &&
            match.requestData.length > 0
          ) {
            data = match.requestData;
          }
        } catch {}
      }
    }
  }

  let provinceId = data[0];
  let signalType = data[1];

  if (provinceId === undefined || provinceId === null) {
    const candidateObj =
      (payload && typeof payload === 'object' && !Array.isArray(payload) ?
        payload
      : null) ||
      ((
        msg?.responseData &&
        typeof msg.responseData === 'object' &&
        !Array.isArray(msg.responseData)
      ) ?
        msg.responseData
      : null) ||
      ((
        msg?.requestData &&
        typeof msg.requestData === 'object' &&
        !Array.isArray(msg.requestData)
      ) ?
        msg.requestData
      : null) ||
      (msg && typeof msg === 'object' && !Array.isArray(msg) ? msg : null);

    if (candidateObj) {
      provinceId = candidateObj.provinceId ?? candidateObj.id;
      signalType = candidateObj.type ?? candidateObj.signal ?? signalType;
    }
  }

  if (
    provinceId !== undefined &&
    provinceId !== null &&
    !isNaN(Number(provinceId))
  ) {
    provinceId = Number(provinceId);
  }

  logger?.debug('setSignal data resolved:', {
    data,
    provinceId,
    signalType,
    signalsCount: signals.length,
  });
  if (provinceId === undefined || provinceId === null) {
    logger?.debug('setSignal returned early - provinceId is null/undefined');
    return;
  }

  if (!Array.isArray(signals)) {
    signals = [];
  }

  if (signalType === 'ignore') {
    signals = signals.filter(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
    );
  } else if (signalType === 'focus') {
    const existing = signals.find(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) === provinceId,
    );
    if (existing) {
      existing.id = provinceId;
      existing.provinceId = provinceId;
      existing.type = signalType;
      existing.signal = signalType;
    } else {
      signals.push({
        id: provinceId,
        provinceId: provinceId,
        type: signalType,
        signal: signalType,
      });
    }
  }

  checkProvinces();
}

export function removeSignal(msg, payload, context) {
  let data =
    Array.isArray(payload) && payload.length > 0 ? payload
    : Array.isArray(msg?.requestData) && msg.requestData.length > 0 ?
      msg.requestData
    : Array.isArray(msg?.responseData) && msg.responseData.length > 0 ?
      msg.responseData
    : Array.isArray(msg) && msg.length > 0 ? msg
    : [];

  if (data.length === 0 && context) {
    const reqPayloadItems =
      Array.isArray(context.requestPayload) ? context.requestPayload
      : context.requestPayload && typeof context.requestPayload === 'object' ?
        [context.requestPayload]
      : [];
    if (reqPayloadItems.length > 0) {
      const match =
        (msg?.requestId !== undefined ?
          reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqPayloadItems.find(
          (r) =>
            r &&
            (r.requestMethod === 'removeSignal' ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqPayloadItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        data = match.requestData;
      }
    }

    if (data.length === 0) {
      const postText =
        context?.request?.request?.postData?.text ||
        context?.request?.postData?.text ||
        context?.postData?.text ||
        (typeof context?.postData === 'string' ? context.postData : null) ||
        (typeof context?.request?.postData === 'string' ?
          context.request.postData
        : typeof context?.request?.request?.postData === 'string' ?
          context.request.request.postData
        : null);
      if (postText) {
        try {
          const parsed =
            typeof postText === 'string' ? JSON.parse(postText) : postText;
          const reqItems = Array.isArray(parsed) ? parsed : [parsed];
          const match = reqItems.find(
            (r) =>
              r &&
              (r.requestMethod === 'removeSignal' ||
                r.requestClass?.includes('GuildBattleground')),
          );
          if (
            Array.isArray(match?.requestData) &&
            match.requestData.length > 0
          ) {
            data = match.requestData;
          }
        } catch {}
      }
    }
  }

  let provinceId = data[0];

  if (provinceId === undefined || provinceId === null) {
    const candidateObj =
      (payload && typeof payload === 'object' && !Array.isArray(payload) ?
        payload
      : null) ||
      ((
        msg?.responseData &&
        typeof msg.responseData === 'object' &&
        !Array.isArray(msg.responseData)
      ) ?
        msg.responseData
      : null) ||
      ((
        msg?.requestData &&
        typeof msg.requestData === 'object' &&
        !Array.isArray(msg.requestData)
      ) ?
        msg.requestData
      : null) ||
      (msg && typeof msg === 'object' && !Array.isArray(msg) ? msg : null);

    if (candidateObj) {
      provinceId = candidateObj.provinceId ?? candidateObj.id;
    }
  }

  if (
    provinceId !== undefined &&
    provinceId !== null &&
    !isNaN(Number(provinceId))
  ) {
    provinceId = Number(provinceId);
  }

  logger?.debug('removeSignal data resolved:', {
    data,
    provinceId,
    signalsCount: signals.length,
  });
  if (provinceId === undefined || provinceId === null) {
    logger?.debug('removeSignal returned early - provinceId is null/undefined');
    return;
  }

  if (!Array.isArray(signals)) {
    signals = [];
  }

  signals = signals.filter(
    (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
  );

  checkProvinces();
}

export function clearBattleground() {
  BattlegroundPerformance.length = 0;
  GuildMembers.length = 0;
  map = {};
  if (document.getElementById('costs'))
    document.getElementById('costs').innerHTML = '';
}

export function getServerMarket(origin) {
  if (!origin || typeof origin !== 'string') return 'en';
  const clean = origin.trim().toLowerCase();
  if (clean.includes('zz') || clean.includes('beta')) return 'zz';
  const hostMatch = clean.match(
    /(?:https?:\/\/)?([a-z]{2,3})\d*\.forgeofempires\.com/i,
  );
  if (hostMatch && hostMatch[1]) {
    return hostMatch[1];
  }
  const prefixMatch = clean.match(/^(?:https?:\/\/)?([a-z]{2,3})\d*/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1];
  }
  return 'en';
}

const SERVER_TIMEZONES = {
  en: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  zz: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  us: { timeZone: 'America/New_York', locale: 'en-US', hour12: true },
  de: { timeZone: 'Europe/Berlin', locale: 'de-DE', hour12: false },
  fr: { timeZone: 'Europe/Paris', locale: 'fr-FR', hour12: false },
  gr: { timeZone: 'Europe/Athens', locale: 'el-GR', hour12: false },
  fi: { timeZone: 'Europe/Helsinki', locale: 'fi-FI', hour12: false },
  ru: { timeZone: 'Europe/Moscow', locale: 'ru-RU', hour12: false },
  es: { timeZone: 'Europe/Madrid', locale: 'es-ES', hour12: false },
  it: { timeZone: 'Europe/Rome', locale: 'it-IT', hour12: false },
  nl: { timeZone: 'Europe/Amsterdam', locale: 'nl-NL', hour12: false },
  pl: { timeZone: 'Europe/Warsaw', locale: 'pl-PL', hour12: false },
  br: { timeZone: 'America/Sao_Paulo', locale: 'pt-BR', hour12: false },
};

export function timeGBG(
  date,
  origin = typeof GameOrigin !== 'undefined' ? GameOrigin : '',
  options = {},
) {
  if (!date) return '';
  if (typeof origin === 'object' && origin !== null) {
    options = origin;
    origin = typeof GameOrigin !== 'undefined' ? GameOrigin : '';
  }
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = date < 1e11 ? new Date(date * 1000) : new Date(date);
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '';

  const timeMode =
    options?.GBGtimeMode ||
    (typeof showOptions !== 'undefined' && showOptions?.GBGtimeMode) ||
    'server';

  if (timeMode === 'local') {
    let is12Hour = false;
    try {
      const { getTimeFormattingConfig } = require('../utils/date.js');
      const cfg = getTimeFormattingConfig();
      is12Hour = /\bhh\b|[Aa]/.test(
        cfg.customPattern || cfg.timeFormat || cfg.dateTimeFormat,
      );
    } catch {}
    if (is12Hour) {
      const h24 = d.getHours();
      const h12 = h24 % 12 || 12;
      const hours = String(h12).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      return `@ ${hours}:${minutes} ${ampm}`;
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `@ ${hours}:${minutes}`;
  }

  const market = getServerMarket(origin);
  const config = SERVER_TIMEZONES[market] || {
    timeZone: 'Europe/Berlin',
    locale: 'de-DE',
    hour12: false,
  };

  const formatted = d
    .toLocaleTimeString(config.locale, {
      timeZone: config.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.hour12,
    })
    .replace(/\u202f/g, ' ');

  return `@ ${formatted}`;
}

function attritionReduction(building) {
  return getAttritionReduction(building);
}

function checkProvinces() {
  var textProvinceUnlocked = '';
  var textProvinceLocked = '';
  var targetGenerator = document.createElement('div');
  var targetsHTML;
  if (document.getElementById('targetsGBG')) {
    targetGenerator = document.getElementById('targetsGBG');
  } else {
    targetGenerator.id = 'targetsGBG';
    targets.appendChild(targetGenerator);
  }
  var timerId = Math.random().toString(36).substr(2, 5);
  var targetsHTML = `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="alert">`;
  targetsHTML += element.close();
  if (
    url?.discordTargetURL &&
    ((typeof helper?.checkGBG === 'function' && helper.checkGBG()) ||
      Boolean(helper?.MyGuildPermissions & 64))
  ) {
    targetsHTML += element.post(
      'targetGenPostID',
      'primary',
      'right',
      collapse.collapseTargetGen,
    );
  }
  targetsHTML += element.copy(
    'targetCopyID',
    'primary',
    'right',
    collapse.collapseBattleground,
  );
  targetsHTML += `<p id="targetGenLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#targetGenCollapse" aria-expanded="${!collapse.collapseTargetGen}" aria-controls="targetGenCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${element.icon('targetGenicon', 'targetGenCollapse', collapse.collapseTargetGen)}
        <strong>GBG Target Generator:</strong></p>`;

  var mapSorted = Array.from(map);
  mapSorted.sort(function (a, b) {
    if (!a.lockedUntil) return 1;
    else if (!b.lockedUntil) return -1;
    else
      return (
        a.lockedUntil > b.lockedUntil ? 1
        : b.lockedUntil > a.lockedUntil ? -1
        : 0
      );
  });

  mapSorted.forEach((province) => {
    //check all signals - could be focus or ignore
    // console.debug(province);
    signals.forEach((clan) => {
      // console.debug(province,clan);
      // var signalId = clan.provinceId ? clan.provinceId : 0;

      const activeDefs =
        ProvinceDefs && ProvinceDefs.length > 0 ? ProvinceDefs
        : VolcanoProvinceDefs && VolcanoProvinceDefs.length > 0 ?
          VolcanoProvinceDefs
        : WaterfallProvinceDefs && WaterfallProvinceDefs.length > 0 ?
          WaterfallProvinceDefs
        : [];
      var thisdef = activeDefs.find(
        (def) =>
          (def.id !== undefined ? def.id : 0) ==
          (province.id !== undefined ? province.id : 0),
      );
      const clanProvId =
        clan.provinceId !== undefined ? clan.provinceId : clan.id;
      const clanSignal = clan.signal !== undefined ? clan.signal : clan.type;
      if (thisdef && province.id == clanProvId && clanSignal == 'focus') {
        if (
          province.ownerId !== undefined &&
          currentParticipantId &&
          province.ownerId == currentParticipantId
        ) {
          return;
        }
        const connectedProvinces = (thisdef.connections || [])
          .map((connId) => mapSorted.find((p) => p.id == connId))
          .filter(Boolean);

        const currentEpoc =
          typeof EpocTime === 'number' && EpocTime > 1000000000 ?
            EpocTime
          : Math.floor(Date.now() / 1000);

        const { campsReady, campsNotReady } = calculateProvinceAttrition({
          connectedProvinces,
          currentParticipantId,
          currentEpoc,
          gainAttritionChance: province.gainAttritionChance,
        });

        const sectorTag = formatSectorName(thisdef.name, mapName);
        const campsText =
          showOptions.GBGshowSC && (campsReady || campsNotReady) ?
            formatCampsText(campsReady, campsNotReady, true)
          : '';

        let timeText = '';
        if (province.lockedUntil && showOptions.GBGprovinceTime) {
          const time = new Date(province.lockedUntil * 1000);
          timeText = timeGBG(
            time,
            typeof GameOrigin !== 'undefined' ? GameOrigin : '',
            showOptions,
          );
        }

        const text = formatTargetToken({
          sectorTag,
          targetText:
            targetText && targetText.trim() ? targetText.trim() : undefined,
          campsText: campsText || undefined,
          timeText: timeText || undefined,
        });

        if (province.lockedUntil && showOptions.GBGprovinceTime) {
          if (textProvinceLocked != '') {
            textProvinceLocked += '<br>';
          }
          textProvinceLocked += text;
        } else {
          if (textProvinceUnlocked != '') textProvinceUnlocked += '<br>';
          textProvinceUnlocked += text;
        }
      }
    });
  });
  logger?.debug('renderTargetGeneratorCard summary:', {
    textProvinceUnlocked,
    textProvinceLocked,
    signalsCount: signals.length,
  });
  renderTargetGeneratorCard({
    targetGenerator,
    targetsHTML,
    textProvinceUnlocked,
    textProvinceLocked,
    collapse,
    targetCopy,
    targetPost: post_webstore.postTargetGenToDiscord,
    Tooltip,
    helper,
    url,
    post_webstore,
  });
}

function showBuildingCost(msg) {
  var costsDiv = document.createElement('div');
  if (document.getElementById('costs')) {
    costsDiv = document.getElementById('costs');
  } else {
    costsDiv.id = 'costs';
    content.appendChild(costsDiv);
  }
  const costsHTML = buildBuildingCostsTableHTML({
    map,
    ProvinceDefs,
    mapName,
    BuildingDefs,
    helper,
  });
  renderBuildingCostCard({
    costsDiv,
    costsHTML,
    collapse,
    buildingCostCopy,
    toolOptions,
    setBuildingCostSize,
    helper,
    element,
    ResizeObserverClass:
      typeof ResizeObserver !== 'undefined' ? ResizeObserver : null,
  });
}
