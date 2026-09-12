/**
 * cityRoutes.js
 *
 * Legacy bridge route table for city map entities, startup payloads,
 * production, and bonuses. Resource, trade, treasury, and advancement
 * handlers are owned by their modern src/js/msg services.
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

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../../ui/cardVisibility.js'));
} catch {}

function extractGridId(msg) {
  const candidates = [
    msg?.responseData?.gridId,
    msg?.responseData?.[0]?.gridId,
    msg?.requestData?.[0]?.gridId,
    msg?.gridId,
  ];
  return candidates.find((val) => typeof val === 'string' && val) || null;
}

function registerCityRoutes(ctx) {
  const { dispatcher, handlers, gbRegistry, gbSelected } = ctx;
  const {
    startupService,
    processMetadataEntry,
    processMetadataData,
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
    setCurrentView('OWN_CITY');
    if (Array.isArray(msg?.responseData)) {
      const myId = handlers?.MyInfo?.id || 0;
      const myName = handlers?.MyInfo?.name || '';
      registerCityEntities(msg.responseData, myId, myName);
    }
  });

  // City Map grid switch: ground-truth signal for own city, settlements & QI.
  dispatcher.register('CityMapService', 'getCityMap', (msg) => {
    const gridId = extractGridId(msg);
    if (gridId === 'cultural_outpost') {
      setCurrentView('SETTLEMENT');
    } else if (gridId === 'guild_raids') {
      setCurrentView('QI');
    } else if (gridId === 'city' || gridId === 'main') {
      setCurrentView('OWN_CITY');
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
  });
}

module.exports = {
  registerCityRoutes,
};
module.exports.default = registerCityRoutes;
