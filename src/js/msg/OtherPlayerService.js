/** Social RPC service for friends/guild/hood lists and visited players. */
let element;
let collapse;
let copy;
let globals;
let helper;
let visitedStatsPkg;
let showOptionsPkg;
let castleSystemService = null;
let storage = null;

const { createLogger } = require('../utils/logger.js');
const logger = createLogger('OtherPlayerService');

let visitedCityState = null;
try {
  ({ visitedCityState } = require('../state/VisitedCityState.js'));
} catch {}

let socialState = null;
try {
  ({ socialState } = require('../state/SocialState.js'));
} catch {}

try {
  storage = require('../fn/storage.js');
} catch {}

try {
  element = require('../fn/AddElement.js');
} catch {}
try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  copy = require('../fn/copy.js');
} catch {}
try {
  globals = require('../fn/globals.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}
try {
  visitedStatsPkg = require('../fn/VisitedCityStatsCalculator.js');
} catch {}
try {
  ({ castleSystemService } = require('./CastleSystemService.js'));
} catch {}
try {
  showOptionsPkg = require('../vars/showOptions.js');
} catch {}

let resolveDate = () => null;
try {
  const dateUtils = require('../utils/date.js');
  if (typeof dateUtils?.resolveDate === 'function') {
    resolveDate = dateUtils.resolveDate;
  }
} catch {}

let setPlayerName = () => {};
let updatePlayerNameCache = () => {};
let PlayerName = '';
let MyInfo = null;
let CityProtections = [];
let PlayerID = 0;

try {
  const state = require('../vars/state.js');
  if (state) {
    if (state.setPlayerName) setPlayerName = state.setPlayerName;
    if (state.updatePlayerNameCache)
      updatePlayerNameCache = state.updatePlayerNameCache;
    if (state.PlayerName !== undefined) PlayerName = state.PlayerName;
    if (state.CityProtections) CityProtections = state.CityProtections;
    if (state.PlayerID !== undefined) PlayerID = state.PlayerID;
    if (state.MyInfo) MyInfo = state.MyInfo;
  }
} catch {
  // Graceful fallback when state.js is an ES module outside of bundler
}

let resolveMissingCityEntities = () => {};
try {
  const metaService = require('./MetadataService.js');
  if (metaService?.resolveMissingCityEntities) {
    resolveMissingCityEntities = metaService.resolveMissingCityEntities;
  }
} catch {}

const visitedCityStatsCalculator = visitedStatsPkg?.visitedCityStatsCalculator;
const showOptions = showOptionsPkg?.showOptions || {};
const setFriendsSize = globals?.setFriendsSize || (() => {});
const toolOptions = globals?.toolOptions || { friendsSize: 300 };

let friends = [];
let guildMembers = [];
let hoodlist = [];

function otherPlayerService(msg) {
  const visitContainer =
    typeof document !== 'undefined' ? document.getElementById('visit') : null;
  if (visitContainer) {
    visitContainer.innerHTML = '';
  }

  const payload = msg?.responseData || msg || {};
  const player = payload.other_player || payload.player || {};
  const mapEntities = payload.city_map?.entities || payload.entities || [];
  const playerEra = payload.other_player_era || player.era || 'SpaceAgeTitan';
  const playerName = player.name || PlayerName || 'Visited Player';

  if (player.player_id && player.name) {
    try {
      setPlayerName(player.name, player.player_id);
      updatePlayerNameCache(player.player_id, player.name);
    } catch {
      // Ignore in headless/test environments
    }
  }

  const renderVisit = () => {
    try {
      if (!visitedCityStatsCalculator || !visitedCityState) return;

      const calculatedStats =
        visitedCityStatsCalculator.calculateVisitedCityStats({
          entities: mapEntities,
          playerEra,
          castleBoostResolver: castleSystemService?.getBoostsForEntity,
        });

      const inactiveHtml = checkInactivePlunder(friends);

      visitedCityState.setVisit({
        containerId: 'visit',
        stats: calculatedStats,
        context: {
          isOwnCity: false,
          name: playerName,
          guild: player.clan?.name,
          era:
            helper?.fGVGagesname ?
              helper.fGVGagesname(playerEra) || playerEra
            : playerEra,
          score: player.score,
          clanPower: calculatedStats.clanPower,
          sohCount: calculatedStats.sohCount,
          hofCount: calculatedStats.hofCount,
          inactivePlunderHTML: inactiveHtml,
        },
        options: { exactNumbers: true },
      });
    } catch (err) {
      console.warn('Visited player stats render error:', err);
    }
  };

  renderVisit();

  // Asynchronously resolve missing entities via CDN metadata without compounding
  if (typeof resolveMissingCityEntities === 'function') {
    const missing = mapEntities
      .map((e) => e && e.cityentity_id)
      .filter((cid) => cid && (!helper || !helper.getCityEntityDef(cid)));

    if (missing.length > 0) {
      resolveMissingCityEntities(missing, () => {
        renderVisit();
      });
    }
  }
}

function otherPlayerServiceUpdateActions(msg, options = {}) {
  const payload = msg?.responseData || msg || {};
  const friendsList = payload.friends || [];
  const guildList =
    payload.guildMembers ||
    payload.clanMembers ||
    payload.clan_members ||
    payload.members ||
    payload.clan?.members ||
    (Array.isArray(payload) ? payload : []);
  const hoodList = payload.neighbours || payload.neighbors || [];

  if (
    friendsList.length ||
    guildList.length ||
    hoodList.length ||
    payload.socialbar_list?.length ||
    payload.clan_members?.length ||
    payload.members?.length ||
    Array.isArray(payload)
  ) {
    if (friendsList.length) friends = friendsList;
    if (guildList.length) guildMembers = guildList;
    if (hoodList.length) hoodlist = hoodList;

    socialState?.setLists({ friends, guildMembers, hoodlist });

    const allSocial = [
      ...(Array.isArray(payload) ? payload : []),
      ...(Array.isArray(friendsList) ? friendsList : []),
      ...(Array.isArray(guildList) ? guildList : []),
      ...(Array.isArray(hoodList) ? hoodList : []),
      ...(Array.isArray(payload.socialbar_list) ? payload.socialbar_list : []),
      ...(Array.isArray(payload.clan_members) ? payload.clan_members : []),
      ...(Array.isArray(payload.members) ? payload.members : []),
      ...(Array.isArray(payload.clan?.members) ? payload.clan.members : []),
      ...(Array.isArray(payload.other_players) ? payload.other_players : []),
      ...(Array.isArray(payload.players) ? payload.players : []),
    ];

    if (payload.other_player) allSocial.push(payload.other_player);
    if (payload.user_data) allSocial.push(payload.user_data);

    allSocial.forEach((item) => {
      const p = item?.player || item;
      const id = p?.player_id || p?.id;
      const name = p?.name || p?.player_name || p?.user_name;
      if (id && name) {
        try {
          updatePlayerNameCache(id, name);
        } catch {
          // Ignore in headless/test environments
        }
      }

      const isSelf =
        p?.is_self === true ||
        (MyInfo?.id && id === MyInfo.id) ||
        (PlayerID && id === PlayerID);
      if (isSelf && p?.score !== undefined && p?.score !== null) {
        const scoreNum = Number(p.score);
        if (Number.isFinite(scoreNum) && scoreNum > 0) {
          if (MyInfo) {
            MyInfo.score = scoreNum;
            if (id && !MyInfo.id) MyInfo.id = id;
          }
          if (globals?.MyInfo) {
            globals.MyInfo.score = scoreNum;
            if (id && !globals.MyInfo.id) globals.MyInfo.id = id;
          }
          try {
            const { setMyScore } = require('../state/state.js');
            if (typeof setMyScore === 'function') setMyScore(scoreNum);
          } catch (err) {
            logger.warn('setMyScore failed', err);
          }
          if (storage && typeof storage.set === 'function') {
            storage.set('playerScore', scoreNum);
          }
          try {
            const worldId =
              globals?.worldId ||
              globals?.world ||
              globals?.World ||
              storage?.getCurrentWorld?.();
            if (worldId && storage?.set) {
              storage.set(`world:${worldId}.playerScore`, scoreNum);
            }
          } catch (err) {
            logger.warn('world score persist failed', err);
          }
          try {
            const {
              startupRenderState,
            } = require('../state/StartupRenderState.js');
            startupRenderState.requestCityStatsRepaint();
            logger.debug('requested city stats repaint after score update');
          } catch (err) {
            logger.warn('score re-render failed', err);
          }
        }
      }
    });

    try {
      const { startupRenderState } = require('../state/StartupRenderState.js');
      startupRenderState.requestIgnoreListRefresh();
    } catch {
      // Ignore in headless/test environments
    }

    if (options.autoExpandGuild && collapse) {
      collapse.collapseLists = false;
      collapse.collapseGuild = false;
    }

    if (
      typeof document !== 'undefined' &&
      element &&
      collapse &&
      copy &&
      (showOptions.showGuild || showOptions.showHood || showOptions.showFriends)
    ) {
      let friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="listTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#listsText" aria-expanded="${!collapse.collapseLists}" aria-controls="listsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${element.icon('listsicon', 'listsText', collapse.collapseLists)}
				<strong>Lists:</strong></p>
				${element.close()}
				<div id="listsText" class="collapse ${collapse.collapseLists ? '' : 'show'} resize-both">`;

      if (showOptions.showFriends) {
        friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="friendsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#friendsText" aria-expanded="${!collapse.collapseFriends}" aria-controls="friendsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${element.icon('friendsicon', 'friendsText', collapse.collapseFriends)}
              <strong>Friends</strong>
            </p>
            <span id="friendsCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              collapse.collapseFriends ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="friendsText" class="resize-both collapse ${
            collapse.collapseFriends ? '' : 'show'
          }"><table id="friendsText2">`;
        friendsHTML += getFriendsHTML(friends);
        friendsHTML += `</table></div></div>`;
      }
      if (showOptions.showGuild) {
        friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="guildTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#guildText" aria-expanded="${!collapse.collapseGuild}" aria-controls="guildText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${element.icon('guildicon', 'guildText', collapse.collapseGuild)}
              <strong>Guild</strong>
            </p>
            <span id="guildCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              collapse.collapseGuild ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="guildText" class="resize-both collapse ${
            collapse.collapseGuild ? '' : 'show'
          }"><table id="guildText2">`;
        friendsHTML += getFriendsHTML(guildMembers);
        friendsHTML += `</table></div></div>`;
      }
      if (showOptions.showHood) {
        friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="hoodTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#hoodText" aria-expanded="${!collapse.collapseHood}" aria-controls="hoodText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${element.icon('hoodicon', 'hoodText', collapse.collapseHood)}
              <strong>Hood</strong>
            </p>
            <span id="hoodCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              collapse.collapseHood ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="hoodText" class="resize-both collapse ${
            collapse.collapseHood ? '' : 'show'
          }"><table id="hoodText2">`;
        friendsHTML += getFriendsHTML(hoodlist);
        friendsHTML += `</table></div></div>`;
      }
      friendsHTML += `</div></div>`;

      const friendsID = document.getElementById('friends');
      if (friendsID) {
        if (options.autoExpandGuild) {
          friendsID.style.display = '';
          if (friendsID.classList?.contains('d-none')) {
            friendsID.classList.remove('d-none');
          }
        }
        friendsID.innerHTML = friendsHTML;
        const friendsDiv = document.getElementById('friendsText');
        if (friendsDiv && friendsDiv.offsetHeight > toolOptions.friendsSize) {
          friendsDiv.style.height = toolOptions.friendsSize + 'px';
        }
        if (showOptions.showFriends) {
          document
            .getElementById('friendsCopyID')
            ?.addEventListener('click', copy.fFriendsCopy);
          document
            .getElementById('friendsicon')
            ?.addEventListener('click', collapse.fCollapseFriends);
        }
        if (showOptions.showGuild) {
          document
            .getElementById('guildCopyID')
            ?.addEventListener('click', copy.fGuildCopy);
          document
            .getElementById('guildicon')
            ?.addEventListener('click', collapse.fCollapseGuild);
        }
        if (showOptions.showHood) {
          document
            .getElementById('hoodCopyID')
            ?.addEventListener('click', copy.fHoodCopy);
          document
            .getElementById('hoodicon')
            ?.addEventListener('click', collapse.fCollapseHood);
        }
        document
          .getElementById('listsicon')
          ?.addEventListener('click', collapse.fCollapseLists);
        if (friendsDiv && typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.contentRect && entry.contentRect.height) {
                setFriendsSize(entry.contentRect.height);
              }
            }
          });
          resizeObserver.observe(friendsDiv);
        }
      }
    }
  }
}

/**
 * Formats a city-protection expiry as a compact shield countdown.
 * InnoGames RPC payloads express `expireTime` as a Unix timestamp in seconds;
 * `resolveDate` also tolerates millisecond values defensively.
 *
 * @param {number} expireTime Unix timestamp in seconds (or milliseconds)
 * @param {number} [nowMs] Current time in milliseconds (test seam)
 * @returns {string} Compact countdown, or '' when unparseable
 */
function formatShieldCountdown(expireTime, nowMs = Date.now()) {
  const expiry = resolveDate(expireTime);
  if (!expiry) return '';

  const diff = Math.abs((expiry.getTime() - nowMs) / 1000);
  let diffText = '';
  const days = Math.floor(diff / 86400);
  if (days) diffText += `${days} ${days > 1 ? 'Days' : 'Day'} `;
  const hours = Math.floor(diff / 3600) % 24;
  diffText += `${hours}:`;
  const minutes = Math.floor(diff / 60) % 60;
  if (!days) diffText += `${minutes}:`;
  const seconds = Math.floor(diff) % 60;
  if (!days && !hours) diffText += `${seconds}`;
  return diffText;
}

function getFriendsHTML(list) {
  let htmlFriends = '';
  if (!Array.isArray(list)) return htmlFriends;

  list.forEach((entry) => {
    let html = '';
    const safeName = helper ? helper.escapeHTML(entry.name) : entry.name;
    if (Object.hasOwn(entry, 'is_self') && entry.__class__ !== 'ClanMember') {
      // Self non-guild-member, skip
    } else if (entry.is_friend === false && entry.accepted === false) {
      // Pending friend request
    } else if (Object.hasOwn(entry, 'canSabotage')) {
      html += `<tr><td>${safeName}</td><td>Plunder</td></tr>`;
    } else if (Object.hasOwn(entry, 'is_neighbor')) {
      if (Array.isArray(CityProtections) && CityProtections.length) {
        let match = false;
        CityProtections.forEach((city) => {
          if (city.playerId === entry.player_id && city.expireTime > 0) {
            match = true;
            const diffText = formatShieldCountdown(city.expireTime);
            html += `<tr><td>${safeName}</td><td><span data-i18n="shield">Shield</span>: ${diffText}</td></tr>`;
          }
        });
        if (!match) html += `<tr><td>${safeName}</td></tr>`;
      } else {
        html += `<tr><td>${safeName}</td></tr>`;
      }
    } else if (!Object.hasOwn(entry, 'is_active')) {
      html += `<tr><td>${safeName}</td><td>INACTIVE</td></tr>`;
    } else if (
      Object.hasOwn(entry, 'is_friend') ||
      Object.hasOwn(entry, 'is_guild_member')
    ) {
      html += `<tr><td>${safeName}</td></tr>`;
    }
    htmlFriends += html;
  });
  return htmlFriends;
}

function checkInactivePlunder(friendsList = []) {
  let html = '';
  if (Array.isArray(friendsList)) {
    friendsList.forEach((entry) => {
      if (PlayerID === entry.player_id && entry.is_active !== true)
        html += `<span class='red'>*** <span data-i18n="inactive">INACTIVE</span> ***</span><br>`;
      if (PlayerID === entry.player_id && entry.canSabotage === true)
        html += `<span class='red'>*** <span data-i18n="plunder">PLUNDER</span> ***</span><br>`;
    });
  }
  return html;
}

module.exports = {
  otherPlayerService,
  otherPlayerServiceUpdateActions,
  formatShieldCountdown,
  friends,
  guildMembers,
  hoodlist,
};
module.exports.default = otherPlayerService;
