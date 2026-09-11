/**
 * cityRoutes.js
 *
 * Legacy bridge route table for city map entities, startup payloads,
 * production, resources, treasury, outposts, and bonuses.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('CityRoutes');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const GbDonationService = require('../../msg/GbDonationService.js');

function registerCityRoutes(ctx) {
  const { dispatcher, handlers, gbRegistry, gbSelected } = ctx;
  const {
    startupService,
    processMetadataEntry,
    processMetadataData,
    getResourceDefinitions,
    getPlayerResources,
    getPlayerResourceBag,
    getTreasury,
    getTreasuryBag,
    getTreasuryLogs,
    treasuryService,
    getAdvancements,
    outpostService,
    pickupProduction,
    getBonuses,
    getLimitedBonuses,
  } = handlers;

  // Metadata
  if (processMetadataEntry) {
    dispatcher.register(
      'StaticDataService',
      'getMetadata',
      processMetadataEntry,
    );
  }
  if (processMetadataData) {
    if (typeof dispatcher.registerDirectMetadata === 'function') {
      dispatcher.registerDirectMetadata(processMetadataData);
    } else if (typeof dispatcher.setDirectMetadataHandler === 'function') {
      dispatcher.setDirectMetadataHandler(processMetadataData);
    }
  }

  const registerCityEntities = (entities, myId, myName) => {
    if (!Array.isArray(entities)) return;
    for (const entity of entities) {
      if (
        entity &&
        (entity.type === 'greatbuilding' ||
          entity.cityentity_id?.includes('Landmark'))
      ) {
        if (myName && !entity.player_name) {
          entity.player_name = myName;
        }
        if (myId && !entity.player_id && !entity.player) {
          entity.player_id = myId;
          entity.player = myId;
        }
        gbRegistry.registerGreatBuilding(entity, 0);
        if (myId) {
          gbRegistry.registerGreatBuilding(entity, myId);
        }
      }
    }
  };

  // Startup & Player
  dispatcher.register('StartupService', 'getData', (msg, reqData, context) => {
    if (Array.isArray(msg?.responseData?.city_map?.entities)) {
      const myId =
        msg?.responseData?.user_data?.player_id || handlers?.MyInfo?.id || 0;
      const myName =
        msg?.responseData?.user_data?.user_name || handlers?.MyInfo?.name || '';
      registerCityEntities(msg.responseData.city_map.entities, myId, myName);
    }
    if (startupService) {
      return startupService(msg, reqData, context);
    }
  });
  if (startupService) {
    dispatcher.register('StartupService', 'getOverview', startupService);
  }

  // City Map Service (Own City GBs)
  dispatcher.register('CityMapService', 'getEntities', (msg) => {
    if (Array.isArray(msg?.responseData)) {
      const myId = handlers?.MyInfo?.id || 0;
      const myName = handlers?.MyInfo?.name || '';
      registerCityEntities(msg.responseData, myId, myName);
    }
  });
  dispatcher.register('CityMapService', 'updateEntity', (msg) => {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = handlers?.MyInfo?.id || 0;
    const myName = handlers?.MyInfo?.name || '';
    registerCityEntities(list, myId, myName);
    const target = handlers.GBselected || gbSelected;
    for (const item of list) {
      if (
        item &&
        item.type === 'greatbuilding' &&
        target &&
        (item.id === target.id || item.cityentity_id === target.cityentity_id)
      ) {
        GbDonationService.syncGbSelected(target, item);
        if (handlers.MyInfo?.id && item.player_id === handlers.MyInfo.id) {
          if (handlers.setPlayerName) {
            handlers.setPlayerName(handlers.MyInfo.name, handlers.MyInfo.id);
          }
        }
        if (typeof handlers.showGreatBuldingDonation === 'function') {
          handlers.showGreatBuldingDonation();
        }
      }
    }
  });
  dispatcher.register('CityMapService', 'reset', (msg) => {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = handlers?.MyInfo?.id || 0;
    const myName = handlers?.MyInfo?.name || '';
    registerCityEntities(list, myId, myName);
    const target = handlers.GBselected || gbSelected;
    for (const item of list) {
      if (
        item &&
        item.type === 'greatbuilding' &&
        target &&
        (item.id === target.id || item.cityentity_id === target.cityentity_id)
      ) {
        GbDonationService.syncGbSelected(target, item);
      }
    }
  });

  // Resources
  if (getResourceDefinitions) {
    dispatcher.register(
      'ResourceService',
      'getResourceDefinitions',
      getResourceDefinitions,
    );
  }
  if (getPlayerResources) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResources',
      getPlayerResources,
    );
  } else if (getPlayerResourceBag) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResources',
      getPlayerResourceBag,
    );
  }
  const resourceBagHandler = getPlayerResourceBag || getPlayerResources;
  if (resourceBagHandler) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResourceBag',
      resourceBagHandler,
    );
  }

  // Trade Service / Market Triggers for Goods Inventory
  const renderGoodsHandler =
    handlers.renderGoodsPanel ||
    (handlers.getPlayerResources ? () => handlers.getPlayerResources() : null);

  if (renderGoodsHandler) {
    for (const method of [
      'getTradeList',
      'getOpenOffers',
      'getTradeOffers',
      'getYourOffers',
    ]) {
      dispatcher.register('TradeService', method, (msg) =>
        renderGoodsHandler(msg),
      );
    }
  }

  // Guild Treasury
  const treasuryBagHandler = getTreasuryBag || treasuryService?.getTreasuryBag;
  if (treasuryBagHandler) {
    dispatcher.register('ClanService', 'getTreasuryBag', treasuryBagHandler);
    dispatcher.register(
      'ResourceService',
      'getTreasuryBag',
      treasuryBagHandler,
    );
  }
  const treasuryLogsHandler =
    getTreasuryLogs || treasuryService?.getTreasuryLogs;
  if (treasuryLogsHandler) {
    dispatcher.register('ClanService', 'getTreasuryLogs', treasuryLogsHandler);
  }
  const treasuryHandler = getTreasury || treasuryService?.getTreasury;
  if (treasuryHandler) {
    dispatcher.register('ClanService', 'getTreasury', treasuryHandler);
  }

  // Cultural Settlements & Outposts
  const advancementHandler =
    getAdvancements || outpostService?.handleAdvancements;
  if (advancementHandler) {
    dispatcher.register('AdvancementService', 'getAll', advancementHandler);
  }
  if (outpostService?.handleUnlockAdvancement) {
    dispatcher.register(
      'AdvancementService',
      'unlock',
      outpostService.handleUnlockAdvancement,
    );
  }

  // City Production
  if (pickupProduction) {
    dispatcher.register(
      'CityProductionService',
      'pickupProduction',
      pickupProduction,
    );
  }

  // Bonuses
  if (getBonuses) {
    dispatcher.register('BonusService', 'getBonuses', getBonuses);
  }
  if (getLimitedBonuses) {
    dispatcher.register('BonusService', 'getLimitedBonuses', getLimitedBonuses);
  }

  logger.debug('City routes registered', {
    startup: !!startupService,
    resources: !!(getPlayerResources || getPlayerResourceBag),
  });
}

module.exports = {
  registerCityRoutes,
};
module.exports.default = registerCityRoutes;
