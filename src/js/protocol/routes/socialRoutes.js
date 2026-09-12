/**
 * socialRoutes.js
 *
 * Legacy bridge route table for other players, clan members, social lists,
 * ignore lists, and conversations.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('SocialRoutes');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const GbDonationService = require('../../msg/GbDonationService.js');

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../../ui/cardVisibility.js'));
} catch {}

function registerSocialRoutes(ctx) {
  const { dispatcher, handlers, gbRegistry, gbSelected, showOptions } = ctx;
  const {
    otherPlayerService,
    otherPlayerServiceUpdateActions,
    clearVisitPlayer,
    updateIgnoreListUI,
    conversationService,
    getConversation,
  } = handlers;

  // Other Players & Social
  if (otherPlayerService) {
    dispatcher.register(
      'OtherPlayerService',
      'getEventsList',
      otherPlayerService,
    );
    dispatcher.register('OtherPlayerService', 'visitPlayer', (msg, context) => {
      setCurrentView('OTHER_PLAYER');
      const gbs = msg?.responseData?.city_map?.entities || [];
      const pid =
        msg?.responseData?.other_player?.player_id ||
        (Array.isArray(context?.requestData) ? context.requestData[0] : null);
      gbRegistry.registerGreatBuildings(gbs, pid);
      if (showOptions.showVisit) {
        if (typeof clearVisitPlayer === 'function') clearVisitPlayer();
        otherPlayerService(msg);
      }
    });
  }
  if (otherPlayerServiceUpdateActions) {
    dispatcher.register(
      'OtherPlayerService',
      'updatePlayerActions',
      otherPlayerServiceUpdateActions,
    );
    for (const method of [
      'getSocialList',
      'getFriendsList',
      'getClanMemberList',
      'getNeighborList',
      'getNeighbourList',
    ]) {
      dispatcher.register('OtherPlayerService', method, (msg) => {
        otherPlayerServiceUpdateActions(msg.responseData);
      });
    }
    dispatcher.register(
      'OtherPlayerService',
      'getOtherPlayerOverview',
      (msg) => {
        otherPlayerServiceUpdateActions(msg.responseData);
      },
    );
    const renderGuildHandler =
      handlers.renderGuildPanel ||
      (() => {
        try {
          return require('../../ui/renderGuildPanel.js').renderGuildPanel;
        } catch {
          return null;
        }
      })();

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
      if (typeof renderGuildHandler === 'function' && data) {
        renderGuildHandler(data);
      }
      if (typeof otherPlayerServiceUpdateActions === 'function' && data) {
        otherPlayerServiceUpdateActions(data, { autoExpandGuild: true });
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
        if (Array.isArray(msg?.responseData)) {
          for (const item of msg.responseData) {
            const pId = item.player?.player_id || item.player_id;
            gbRegistry.registerGreatBuilding(item, pId);
          }
        }
        otherPlayerServiceUpdateActions(msg.responseData);
      },
    );
  }
  if (updateIgnoreListUI) {
    dispatcher.register('IgnorePlayerService', 'getIgnoreList', (msg) => {
      updateIgnoreListUI(msg);
    });
  }
  dispatcher.register(
    'OtherPlayerService',
    'getOtherPlayerCityMapEntity',
    (msg) => {
      const selected = msg?.responseData;
      if (selected) {
        const pId = selected.player_id || selected.player?.player_id || 0;
        const pName =
          (handlers.playerNameCache && handlers.playerNameCache[pId]) ||
          (handlers.getPlayerName ? handlers.getPlayerName(pId) : '') ||
          selected.player_name ||
          selected.player?.name ||
          '';
        if (pId && handlers.setPlayerName) {
          handlers.setPlayerName(pName, pId);
        }

        const gb = gbRegistry.registerGreatBuilding(selected, pId);
        const target = handlers.GBselected || gbSelected;
        if (target) {
          GbDonationService.syncGbSelected(target, gb || selected);
          if (pId) target.player = pId;
          if (pName) target.player_name = pName;
        }
      }
    },
  );

  // Conversations
  if (conversationService) {
    dispatcher.register(
      'ConversationService',
      'getTeasers',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getCategory',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getOverviewForCategory',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getOverview',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getNewMessage',
      handlers.getNewMessage || conversationService,
    );
  }
  if (getConversation) {
    dispatcher.register(
      'ConversationService',
      'getConversation',
      getConversation,
    );
  }

  logger.debug('Social routes registered', {
    otherPlayer: !!otherPlayerService,
    conversations: !!conversationService,
  });
}

module.exports = {
  registerSocialRoutes,
};
module.exports.default = registerSocialRoutes;
