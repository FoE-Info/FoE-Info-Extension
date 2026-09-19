/**
 * renderSocialListsPanel.js
 *
 * Renders the Friends, Guild, and Neighbourhood social lists in panel.html.
 * Extracted from OtherPlayerService.js to maintain modular UI/msg separation.
 */

const { createLogger } = require('../utils/logger.js');
const { escapeHTML, formatShieldCountdown } = require('../utils/formatters.js');

const logger = createLogger('SocialListsPanel');

function safeRequire(loader) {
  try {
    return loader();
  } catch {
    return null;
  }
}

/**
 * Generates HTML rows for a social list (friends, guild members, or neighbors).
 *
 * @param {Array} list Player records
 * @param {Object} [options]
 * @returns {string} Table rows HTML
 */
function getFriendsHTML(
  list,
  { CityProtections = [], nowMs = Date.now(), escape = escapeHTML } = {},
) {
  let htmlFriends = '';
  if (!Array.isArray(list)) return htmlFriends;

  list.forEach((entry) => {
    let html = '';
    const safeName = escape ? escape(entry.name) : entry.name;
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
            const diffText = formatShieldCountdown(city.expireTime, nowMs);
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

/**
 * Renders the full social lists panel (Friends, Guild, Hood).
 *
 * @param {Object} params
 */
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
  const currentDoc = doc || (typeof document !== 'undefined' ? document : null);
  const currentContainer =
    container ||
    (currentDoc && typeof currentDoc.getElementById === 'function' ?
      currentDoc.getElementById('friends')
    : null);

  const element =
    deps.element || safeRequire(() => require('../ui/AddElement.js'));
  const collapse =
    deps.collapse || safeRequire(() => require('../fn/collapse.js'));
  const copy = deps.copy || safeRequire(() => require('../fn/copy.js'));
  const setFriendsSize =
    deps.setFriendsSize ||
    safeRequire(() => require('../fn/globals.js')?.setFriendsSize) ||
    (() => {});

  if (!currentDoc || !element || !collapse || !copy) {
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

  if (options.autoExpandGuild && collapse) {
    collapse.collapseLists = false;
    collapse.collapseGuild = false;
  }

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
          }"><table id="friendsText2"><caption class="visually-hidden"><span data-i18n="friends">Friends</span></caption><thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead><tbody>`;
    friendsHTML += getFriendsHTML(friends, { CityProtections });
    friendsHTML += `</tbody></table></div></div>`;
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
          }"><table id="guildText2"><caption class="visually-hidden"><span data-i18n="guild">Guild</span></caption><thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead><tbody>`;
    friendsHTML += getFriendsHTML(guildMembers, { CityProtections });
    friendsHTML += `</tbody></table></div></div>`;
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
        ?.addEventListener('click', copy.fFriendsCopy);
      currentDoc
        .getElementById?.('friendsicon')
        ?.addEventListener('click', collapse.fCollapseFriends);
    }
    if (showOptions.showGuild) {
      currentDoc
        .getElementById?.('guildCopyID')
        ?.addEventListener('click', copy.fGuildCopy);
      currentDoc
        .getElementById?.('guildicon')
        ?.addEventListener('click', collapse.fCollapseGuild);
    }
    if (showOptions.showHood) {
      currentDoc
        .getElementById?.('hoodCopyID')
        ?.addEventListener('click', copy.fHoodCopy);
      currentDoc
        .getElementById?.('hoodicon')
        ?.addEventListener('click', collapse.fCollapseHood);
    }
    currentDoc
      .getElementById?.('listsicon')
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

module.exports = {
  renderSocialListsPanel,
  formatShieldCountdown,
  getFriendsHTML,
};
