/** Social RPC service for friends/guild/hood lists and visited players. */
let globals;
let helper;
let visitedStatsPkg;
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

let formatShieldCountdown = () => '';
try {
  ({ formatShieldCountdown } = require('../utils/formatters.js'));
} catch {}

try {
  storage = require('../fn/storage.js');
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

let defaultGbRegistry = null;
try {
  defaultGbRegistry = require('../state/GreatBuildingRegistry.js');
} catch {}

let GbDonationService = null;
try {
  GbDonationService = require('./GbDonationService.js');
} catch {}

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../state/viewState.js'));
} catch {}

let clearVisitPlayer = () => {};
let updateIgnoreListUI = () => {};
let renderGuildPanel = () => {};

let showOptions = {};
try {
  showOptions = require('../vars/showOptions.js').showOptions || {};
} catch {}

let setPlayerName = () => {};
let updatePlayerNameCache = () => {};
let PlayerName = '';
let MyInfo = null;
let PlayerID = 0;
let gbSelected = null;

try {
  const state = require('../vars/state.js');
  if (state) {
    if (state.setPlayerName) setPlayerName = state.setPlayerName;
    if (state.updatePlayerNameCache)
      updatePlayerNameCache = state.updatePlayerNameCache;
    if (state.PlayerName !== undefined) PlayerName = state.PlayerName;
    if (state.PlayerID !== undefined) PlayerID = state.PlayerID;
    if (state.MyInfo) MyInfo = state.MyInfo;
    if (state.GBselected !== undefined) gbSelected = state.GBselected;
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

function otherPlayerServiceUpdateActions(msg) {
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
  }
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

function register(dispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return this;

  const targetOtherPlayerService =
    options.otherPlayerService || otherPlayerService;
  const targetUpdateActions =
    options.otherPlayerServiceUpdateActions || otherPlayerServiceUpdateActions;
  const targetSetCurrentView = options.setCurrentView || setCurrentView;
  const targetGbRegistry =
    options.gbRegistry || options.GreatBuildingRegistry || defaultGbRegistry;
  const targetGbSelected = options.GBselected || gbSelected;
  const targetShowOptions = options.showOptions || showOptions;
  const targetClearVisit = options.clearVisitPlayer || clearVisitPlayer;
  const targetUpdateIgnoreList =
    options.updateIgnoreListUI || updateIgnoreListUI;
  const targetRenderGuildPanel = options.renderGuildPanel || renderGuildPanel;

  // Other Players & Social
  dispatcher.register('OtherPlayerService', 'getEventsList', (msg, req, ctx) =>
    targetOtherPlayerService(msg, req, ctx),
  );

  dispatcher.register('OtherPlayerService', 'visitPlayer', (msg, context) => {
    if (typeof targetSetCurrentView === 'function') {
      targetSetCurrentView('OTHER_PLAYER');
    }
    const gbs = msg?.responseData?.city_map?.entities || [];
    const pid =
      msg?.responseData?.other_player?.player_id ||
      (Array.isArray(context?.requestData) ? context.requestData[0] : null);
    if (targetGbRegistry?.registerGreatBuildings) {
      targetGbRegistry.registerGreatBuildings(gbs, pid);
    }
    if (targetShowOptions?.showVisit) {
      if (typeof targetClearVisit === 'function') targetClearVisit();
      targetOtherPlayerService(msg);
    }
  });

  dispatcher.register(
    'OtherPlayerService',
    'updatePlayerActions',
    (msg, opts) => targetUpdateActions(msg, opts),
  );

  for (const method of [
    'getSocialList',
    'getFriendsList',
    'getClanMemberList',
    'getNeighborList',
    'getNeighbourList',
  ]) {
    dispatcher.register('OtherPlayerService', method, (msg) => {
      targetUpdateActions(msg?.responseData);
    });
  }

  dispatcher.register('OtherPlayerService', 'getOtherPlayerOverview', (msg) => {
    targetUpdateActions(msg?.responseData);
  });

  const guildHandler = (msg) => {
    const data = msg?.responseData || msg;
    if (typeof document !== 'undefined' && document.getElementById) {
      const guildOverviewEl = document.getElementById('guildOverview');
      if (guildOverviewEl) {
        if (guildOverviewEl.classList?.contains('d-none')) {
          guildOverviewEl.classList.remove('d-none');
        }
        if (guildOverviewEl.style) {
          guildOverviewEl.style.display = '';
        }
      }
    }
    if (typeof targetRenderGuildPanel === 'function' && data) {
      targetRenderGuildPanel(data);
    }
    if (typeof targetUpdateActions === 'function' && data) {
      targetUpdateActions(data, { autoExpandGuild: true });
    }
  };

  dispatcher.register('ClanMemberService', 'getMemberList', guildHandler);
  dispatcher.register('ClanService', 'getMembers', guildHandler);
  dispatcher.register('ClanService', 'getOverview', guildHandler);
  dispatcher.register('ClanService', 'getOwnClanData', guildHandler);
  dispatcher.register('ClanService', 'getClanData', guildHandler);

  dispatcher.register(
    'GreatBuildingsService',
    'getOtherPlayerOverview',
    (msg) => {
      if (
        Array.isArray(msg?.responseData) &&
        targetGbRegistry?.registerGreatBuilding
      ) {
        for (const item of msg.responseData) {
          const pId = item.player?.player_id || item.player_id;
          targetGbRegistry.registerGreatBuilding(item, pId);
        }
      }
      targetUpdateActions(msg?.responseData);
    },
  );

  dispatcher.register('IgnorePlayerService', 'getIgnoreList', (msg) => {
    if (typeof targetUpdateIgnoreList === 'function') {
      targetUpdateIgnoreList(msg);
    }
  });

  dispatcher.register(
    'OtherPlayerService',
    'getOtherPlayerCityMapEntity',
    (msg) => {
      const selected = msg?.responseData;
      if (selected) {
        const pId = selected.player_id || selected.player?.player_id || 0;
        const pName =
          (options.playerNameCache && options.playerNameCache[pId]) ||
          (options.getPlayerName ? options.getPlayerName(pId) : '') ||
          selected.player_name ||
          selected.player?.name ||
          '';
        const targetSetPlayerName = options.setPlayerName || setPlayerName;
        if (pId && typeof targetSetPlayerName === 'function') {
          targetSetPlayerName(pName, pId);
        }

        const gb =
          targetGbRegistry?.registerGreatBuilding ?
            targetGbRegistry.registerGreatBuilding(selected, pId)
          : null;
        const target = options.GBselected || targetGbSelected;
        if (target) {
          if (GbDonationService?.syncGbSelected) {
            GbDonationService.syncGbSelected(target, gb || selected);
          }
          if (pId) target.player = pId;
          if (pName) target.player_name = pName;
        }
      }
    },
  );

  logger?.debug('OtherPlayerService registered RPC handlers');
  return this;
}

const otherPlayerServiceExport = otherPlayerService;
otherPlayerServiceExport.register = register;

module.exports = {
  otherPlayerService,
  OtherPlayerService: otherPlayerServiceExport,
  otherPlayerServiceUpdateActions,
  formatShieldCountdown,
  friends,
  guildMembers,
  hoodlist,
  register,
};
module.exports.default = otherPlayerService;
