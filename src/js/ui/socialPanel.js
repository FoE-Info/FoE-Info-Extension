/**
 * socialPanel.js
 *
 * Unified Social panel controller:
 * - Friends, Guild, and Neighbourhood social list row generation
 * - Shield countdown timers and city protections
 * - Social lists panel DOM rendering, collapse, and resize
 * - Visited city card binding (bindVisitedCityRender)
 * - Reactive store subscription (bindSocialLists)
 */

const { createLogger } = require('../utils/logger.js');
const { formatShieldCountdown } = require('../utils/formatters.js');
const { escapeHTML } = require('../utils/escape.js');
const {
  socialState,
  visitedCityState,
} = require('../state/SocialDomainState.js');
const { renderCityStats } = require('./renderCityStats.js');

const logger = createLogger('SocialPanel');

function safeRequire(loader) {
  try {
    return loader();
  } catch {
    return null;
  }
}

const element = safeRequire(() => require('./AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.js'));
const copy = safeRequire(() => require('../fn/copy.js'));

let showOptionsPkg = null;
try {
  showOptionsPkg = require('../vars/showOptions.js');
} catch {}

let statePkg = null;
try {
  statePkg = require('../vars/state.js');
} catch {}

let globalsPkg = null;
try {
  globalsPkg = require('../fn/globals.js');
} catch {}

let translateContainer = null;
try {
  translateContainer = require('../fn/i18n.js').translateContainer;
} catch {}

// ============================================================================
// 1. SOCIAL LIST HTML GENERATION
// ============================================================================

function getFriendsHTML(
  list,
  { CityProtections = [], nowMs = Date.now() } = {},
) {
  let htmlFriends = '';
  if (!Array.isArray(list)) return htmlFriends;

  list.forEach((entry) => {
    let html = '';
    if (Object.hasOwn(entry, 'is_self') && entry.__class__ !== 'ClanMember') {
      // Self non-guild-member, skip
    } else if (entry.is_friend === false && entry.accepted === false) {
      // Pending friend request
    } else if (Object.hasOwn(entry, 'canSabotage')) {
      html += `<tr><td>${escapeHTML(entry.name)}</td><td>Plunder</td></tr>`;
    } else if (Object.hasOwn(entry, 'is_neighbor')) {
      if (Array.isArray(CityProtections) && CityProtections.length) {
        let match = false;
        CityProtections.forEach((city) => {
          if (city.playerId === entry.player_id && city.expireTime > 0) {
            match = true;
            const diffText = formatShieldCountdown(city.expireTime, nowMs);
            html += `<tr><td>${escapeHTML(entry.name)}</td><td><span data-i18n="shield">Shield</span>: ${diffText}</td></tr>`;
          }
        });
        if (!match) html += `<tr><td>${escapeHTML(entry.name)}</td></tr>`;
      } else {
        html += `<tr><td>${escapeHTML(entry.name)}</td></tr>`;
      }
    } else if (!Object.hasOwn(entry, 'is_active')) {
      html += `<tr><td>${escapeHTML(entry.name)}</td><td>INACTIVE</td></tr>`;
    } else if (
      Object.hasOwn(entry, 'is_friend') ||
      Object.hasOwn(entry, 'is_guild_member')
    ) {
      html += `<tr><td>${escapeHTML(entry.name)}</td></tr>`;
    }
    htmlFriends += html;
  });
  return htmlFriends;
}

// ============================================================================
// 2. SOCIAL LISTS PANEL DOM RENDERING
// ============================================================================

function renderSocialListsPanel({
  friends = [],
  guildMembers = [],
  hoodlist = [],
  options = {},
  showOptions = {},
  toolOptions = { friendsSize: 300 },
  CityProtections = [],
  container = null,
  doc = null,
  deps = {},
} = {}) {
  const currentDoc = doc || (typeof document !== 'undefined' ? document : {});
  const currentContainer =
    container ||
    (currentDoc.getElementById ?
      currentDoc.getElementById('friendsDiv')
    : null);

  const setFriendsSize =
    deps.setFriendsSize ||
    safeRequire(() => require('../fn/globals.js')?.setFriendsSize) ||
    (() => {});
  const depElement = deps.element !== undefined ? deps.element : element;
  const depCollapse = deps.collapse !== undefined ? deps.collapse : collapse;
  const depCopy = deps.copy !== undefined ? deps.copy : copy;

  if (!currentDoc || !depElement || !depCollapse || !depCopy) {
    logger.debug('Skipping social panel render: missing DOM or dependencies');
    return;
  }

  if (
    !showOptions.showGuild &&
    !showOptions.showHood &&
    !showOptions.showFriends
  ) {
    return;
  }

  if (options.autoExpandGuild && depCollapse) {
    showOptions.showGuild = true;
    depCollapse.collapseLists = false;
    depCollapse.collapseGuild = false;
  }

  let friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="listTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#listsText" aria-expanded="${!depCollapse.collapseLists}" aria-controls="listsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${depElement.icon('listsicon', 'listsText', depCollapse.collapseLists)}
				<strong><span data-i18n="lists">Lists</span>:</strong></p>
				${depElement.close()}
				<div id="listsText" class="collapse ${depCollapse.collapseLists ? '' : 'show'} resize-both">`;

  if (showOptions.showFriends) {
    friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="friendsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#friendsText" aria-expanded="${!depCollapse.collapseFriends}" aria-controls="friendsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${depElement?.icon ? depElement.icon('friendsicon', 'friendsText', depCollapse.collapseFriends) : ''}
              <strong><span data-i18n="friends">Friends</span></strong>
            </p>
            <span id="friendsCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              depCollapse.collapseFriends ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="friendsText" class="resize-both collapse ${
            depCollapse.collapseFriends ? '' : 'show'
          }"><table id="friendsText2"><caption class="visually-hidden"><span data-i18n="friends">Friends</span></caption><thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead><tbody>`;
    friendsHTML += getFriendsHTML(friends, { CityProtections });
    friendsHTML += `</tbody></table></div></div>`;
  }

  if (showOptions.showGuild) {
    friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="guildTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#guildText" aria-expanded="${!depCollapse.collapseGuild}" aria-controls="guildText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${depElement?.icon ? depElement.icon('guildicon', 'guildText', depCollapse.collapseGuild) : ''}
              <strong><span data-i18n="guild">Guild</span></strong>
            </p>
            <span id="guildCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              depCollapse.collapseGuild ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="guildText" class="resize-both collapse ${
            depCollapse.collapseGuild ? '' : 'show'
          }"><table id="guildText2"><caption class="visually-hidden"><span data-i18n="guild">Guild</span></caption><thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead><tbody>`;
    friendsHTML += getFriendsHTML(guildMembers, { CityProtections });
    friendsHTML += `</tbody></table></div></div>`;
  }

  if (showOptions.showHood) {
    friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert">
          <div class="d-flex flex-row justify-content-between align-items-center mb-0">
            <p id="hoodTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#hoodText" aria-expanded="${!depCollapse.collapseHood}" aria-controls="hoodText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
              ${depElement?.icon ? depElement.icon('hoodicon', 'hoodText', depCollapse.collapseHood) : ''}
              <strong><span data-i18n="hood">Hood</span></strong>
            </p>
            <span id="hoodCopyID" role="button" tabindex="0" class="badge rounded-pill bg-success cursor-pointer me-1" style="display: ${
              depCollapse.collapseHood ? 'none' : 'inline-block'
            }" data-i18n="copy">Copy</span>
          </div>
          <div id="hoodText" class="resize-both collapse ${
            depCollapse.collapseHood ? '' : 'show'
          }"><table id="hoodText2"><caption class="visually-hidden"><span data-i18n="hood">Hood List</span></caption><thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead><tbody>`;
    friendsHTML += getFriendsHTML(hoodlist, { CityProtections });
    friendsHTML += `</tbody></table></div></div>`;
  }
  friendsHTML += `</div></div>`;

  if (currentContainer) {
    if (options.autoExpandGuild) {
      currentContainer.style.display = '';
      if (currentContainer.classList?.contains('d-none')) {
        currentContainer.classList.remove('d-none');
      }
    }
    currentContainer.innerHTML = friendsHTML;

    const friendsDiv =
      currentDoc.getElementById ?
        currentDoc.getElementById('friendsText')
      : null;
    if (
      friendsDiv &&
      toolOptions?.friendsSize &&
      friendsDiv.offsetHeight > toolOptions.friendsSize
    ) {
      friendsDiv.style.height = toolOptions.friendsSize + 'px';
    }

    if (showOptions.showFriends) {
      currentDoc
        .getElementById?.('friendsCopyID')
        ?.addEventListener('click', depCopy?.fFriendsCopy);
      currentDoc
        .getElementById?.('friendsicon')
        ?.addEventListener('click', depCollapse?.fCollapseFriends);
    }
    if (showOptions.showGuild) {
      currentDoc
        .getElementById?.('guildCopyID')
        ?.addEventListener('click', depCopy?.fGuildCopy);
      currentDoc
        .getElementById?.('guildicon')
        ?.addEventListener('click', depCollapse?.fCollapseGuild);
    }
    if (showOptions.showHood) {
      currentDoc
        .getElementById?.('hoodCopyID')
        ?.addEventListener('click', depCopy?.fHoodCopy);
      currentDoc
        .getElementById?.('hoodicon')
        ?.addEventListener('click', depCollapse?.fCollapseHood);
    }
    currentDoc
      .getElementById?.('listsicon')
      ?.addEventListener('click', depCollapse?.fCollapseLists);
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

// ============================================================================
// 3. REACTIVE STORE BINDINGS
// ============================================================================

function bindSocialLists(
  state = socialState,
  {
    renderer = renderSocialListsPanel,
    showOptions = showOptionsPkg?.showOptions,
    CityProtections = statePkg?.CityProtections,
    toolOptions = globalsPkg?.toolOptions,
    setFriendsSize = globalsPkg?.setFriendsSize,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'lists' && channel !== 'all') return;
    const friends = snapshot.getFriends?.() || [];
    const guildMembers = snapshot.getGuildMembers?.() || [];
    const hoodlist = snapshot.getHoodlist?.() || [];
    const options = snapshot.getOptions?.() || {};
    renderer({
      friends,
      guildMembers,
      hoodlist,
      options,
      showOptions:
        typeof showOptions === 'function' ? showOptions() : showOptions,
      CityProtections,
      toolOptions,
      deps: { setFriendsSize },
    });
  });
}

function bindVisitedCityRender(
  state = visitedCityState,
  { renderCity = renderCityStats, translate = translateContainer } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'visit' && channel !== 'all') return;
    const payload = snapshot.getVisit();
    if (!payload || typeof renderCity !== 'function') return;
    renderCity(
      payload.containerId,
      payload.stats,
      payload.context,
      payload.options,
    );
    if (typeof translate !== 'function') return;
    const container =
      typeof document !== 'undefined' ?
        document.getElementById(payload.containerId)
      : null;
    if (!container) return;
    try {
      translate(container);
    } catch {}
  });
}

module.exports = {
  getFriendsHTML,
  renderSocialListsPanel,
  bindSocialLists,
  bindVisitedCityRender,
  formatShieldCountdown,
};
module.exports.default = module.exports;
module.exports.renderSocialListsPanel = renderSocialListsPanel;
