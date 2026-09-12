/**
 * buildingRoutes.js
 *
 * Legacy bridge route table for Great Buildings, donations, and blueprint
 * rewards. Registers handlers onto the shared MessageDispatcher.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('BuildingRoutes');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const GbDonationService = require('../../msg/GbDonationService.js');

function extractRankingData(msg, context) {
  if (Array.isArray(msg?.requestData)) return msg.requestData;
  if (Array.isArray(context)) return context;
  if (Array.isArray(context?.requestData)) return context.requestData;
  if (Array.isArray(context?.request?.requestData)) {
    return context.request.requestData;
  }
  if (context?.request?.postData) {
    let post = context.request.postData;
    if (typeof post === 'string') {
      try {
        post = JSON.parse(post);
      } catch {}
    }
    if (Array.isArray(post)) return post;
    if (Array.isArray(post?.requestData)) return post.requestData;
  }
  return [];
}

function registerBuildingRoutes(ctx) {
  const { dispatcher, handlers, gbRegistry, gbSelected, showOptions } = ctx;
  const {
    getConstruction,
    contributeForgePoints,
    getConstructionRanking,
    getContributions,
    handleNewReward,
    getAvailablePackageForgePoints,
  } = handlers;

  if (getConstruction) {
    dispatcher.register(
      'GreatBuildingsService',
      'getConstruction',
      (msg, context) => {
        const reqData = extractRankingData(msg, context);
        return getConstruction(msg, reqData, context);
      },
    );
  }
  if (contributeForgePoints) {
    dispatcher.register(
      'GreatBuildingsService',
      'contributeForgePoints',
      (msg, context) => {
        const reqData = extractRankingData(msg, context);
        return contributeForgePoints(msg, reqData, context);
      },
    );
  }

  dispatcher.register(
    'GreatBuildingsService',
    'getConstructionRanking',
    (msg, context) => {
      const reqData = extractRankingData(msg, context);
      if (getConstructionRanking) {
        return getConstructionRanking(msg, reqData, context);
      }
      const rankingParams = GbDonationService.extractRankingParams(
        msg,
        reqData,
        context,
      );
      const target = handlers.GBselected || gbSelected;
      if (target) {
        const myId = handlers.MyInfo?.id || 0;
        const myName = handlers.MyInfo?.name || '';
        const isForeign =
          rankingParams?.playerId !== undefined &&
          rankingParams.playerId !== null &&
          rankingParams.playerId !== 0 &&
          rankingParams.playerId !== myId;
        const pId = isForeign ? rankingParams.playerId : 0;
        const eId = rankingParams?.entityId || target.id || target.entity_id;
        let cached = gbRegistry.getGreatBuilding(pId, eId);
        if (!cached && pId === 0 && myId) {
          cached = gbRegistry.getGreatBuilding(myId, eId);
        }
        if (!cached && eId) {
          cached = gbRegistry.getGreatBuilding(null, eId);
        }
        if (cached) {
          GbDonationService.syncGbSelected(target, cached);
          if (rankingParams?.level !== undefined) {
            target.level = rankingParams.level;
          }
          const pName = cached.player_name || (pId === 0 ? myName : '') || '';
          const finalPid = cached.player || (pId === 0 ? myId : pId) || 0;
          if (finalPid) target.player = finalPid;
          if (pName) target.player_name = pName;
          if (handlers.setPlayerName && (pName || finalPid)) {
            handlers.setPlayerName(pName, finalPid);
          }
        } else if (eId && eId !== target.id) {
          target.id = eId;
          target.entity_id = eId;
          if (rankingParams?.level !== undefined) {
            target.level = rankingParams.level;
          }
          if (pId === 0) {
            target.player = myId;
            target.player_name = myName;
            if (handlers.setPlayerName) handlers.setPlayerName(myName, myId);
          }
        }
      }
    },
  );
  if (getContributions) {
    dispatcher.register('GreatBuildingsService', 'getContributions', (msg) =>
      getContributions(msg),
    );
  }
  if (getAvailablePackageForgePoints) {
    dispatcher.register(
      'GreatBuildingsService',
      'getAvailablePackageForgePoints',
      (msg, context) => getAvailablePackageForgePoints(msg, context),
    );
  }
  const rewardHandler = handleNewReward || GbDonationService.handleNewReward;
  if (rewardHandler) {
    dispatcher.register('BlueprintService', 'newReward', (msg) => {
      const targetContainer =
        handlers.cityrewards ||
        (typeof document !== 'undefined' ?
          document.getElementById('cityrewards') ||
          document.getElementById('rewards')
        : null);
      return rewardHandler(msg, showOptions, targetContainer);
    });
  }

  logger.debug('Building routes registered', {
    construction: !!getConstruction,
    contributions: !!getContributions,
    packageFp: !!getAvailablePackageForgePoints,
  });
}

module.exports = {
  registerBuildingRoutes,
};
module.exports.default = registerBuildingRoutes;
