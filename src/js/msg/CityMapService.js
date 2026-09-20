/**
 * CityMapService.js
 *
 * Domain service for Forge of Empires City Map RPC payloads.
 * Handles CityMapService.getEntities, CityMapService.getCityMap,
 * CityMapService.updateEntity, and CityMapService.reset.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityMapService');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const GbDonationService = require('./GbDonationService.js');
const defaultGbRegistry = require('../state/GreatBuildingRegistry.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../ui/cardVisibility.js'));
} catch {}

let guildBattlegroundState = null;
try {
  ({ guildBattlegroundState } = require('../state/GuildBattlegroundState.js'));
} catch {}

let defaultState = {};
try {
  defaultState = require('../vars/state.js');
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

function registerCityEntities(
  entities,
  myId = 0,
  myName = '',
  registry = defaultGbRegistry,
) {
  if (!Array.isArray(entities) || !registry) return;
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
      registry.registerGreatBuilding(entity, 0);
      if (myId) {
        registry.registerGreatBuilding(entity, myId);
      }
    }
  }
}

class CityMapService {
  constructor() {
    this.extractGridId = extractGridId;
    this.registerCityEntities = registerCityEntities;
    this.handleGetEntities = this.handleGetEntities.bind(this);
    this.handleGetCityMap = this.handleGetCityMap.bind(this);
    this.handleUpdateEntity = this.handleUpdateEntity.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.register = this.register.bind(this);
  }

  handleGetEntities(msg, options = {}) {
    setCurrentView('OWN_CITY');
    if (Array.isArray(msg?.responseData)) {
      const myId = options.MyInfo?.id || defaultState?.MyInfo?.id || 0;
      const myName = options.MyInfo?.name || defaultState?.MyInfo?.name || '';
      const registry =
        options.gbRegistry ||
        options.GreatBuildingRegistry ||
        defaultGbRegistry;
      registerCityEntities(msg.responseData, myId, myName, registry);
    }
    return { success: true };
  }

  handleGetCityMap(msg) {
    const gridId = extractGridId(msg);
    if (gridId === 'cultural_outpost') {
      setCurrentView('SETTLEMENT');
    } else if (gridId === 'guild_raids') {
      setCurrentView('QI');
    } else if (gridId === 'city' || gridId === 'main') {
      setCurrentView('OWN_CITY');
      guildBattlegroundState?.setTargetMessageActive?.(false);
    }
    return { success: true, gridId };
  }

  handleUpdateEntity(msg, options = {}) {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = options.MyInfo?.id || defaultState?.MyInfo?.id || 0;
    const myName = options.MyInfo?.name || defaultState?.MyInfo?.name || '';
    const registry =
      options.gbRegistry || options.GreatBuildingRegistry || defaultGbRegistry;
    registerCityEntities(list, myId, myName, registry);

    const target =
      options.GBselected || options.gbSelected || defaultState?.GBselected;
    const setPlayer = options.setPlayerName || defaultState?.setPlayerName;
    const showDonation =
      options.showGreatBuldingDonation ||
      (() => {
        try {
          const gbService = require('./GreatBuildingsService.js');
          return gbService.showGreatBuldingDonation;
        } catch {
          return null;
        }
      })();

    for (const item of list) {
      if (
        item &&
        item.type === 'greatbuilding' &&
        target &&
        (item.id === target.id || item.cityentity_id === target.cityentity_id)
      ) {
        GbDonationService.syncGbSelected(target, item);
        if (myId && item.player_id === myId) {
          if (typeof setPlayer === 'function') {
            setPlayer(myName, myId);
          }
        }
        if (typeof showDonation === 'function') {
          showDonation();
        }
      }
    }
    return { success: true, count: list.length };
  }

  handleReset(msg, options = {}) {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = options.MyInfo?.id || defaultState?.MyInfo?.id || 0;
    const myName = options.MyInfo?.name || defaultState?.MyInfo?.name || '';
    const registry =
      options.gbRegistry || options.GreatBuildingRegistry || defaultGbRegistry;
    registerCityEntities(list, myId, myName, registry);

    const target =
      options.GBselected || options.gbSelected || defaultState?.GBselected;
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
    return { success: true, count: list.length };
  }

  register(dispatcher = messageDispatcher, options = {}) {
    if (!dispatcher || typeof dispatcher.register !== 'function') return this;

    dispatcher.register('CityMapService', 'getEntities', (msg) =>
      this.handleGetEntities(msg, options),
    );

    dispatcher.register('CityMapService', 'getCityMap', (msg) =>
      this.handleGetCityMap(msg),
    );

    dispatcher.register('CityMapService', 'updateEntity', (msg) =>
      this.handleUpdateEntity(msg, options),
    );

    dispatcher.register('CityMapService', 'reset', (msg) =>
      this.handleReset(msg, options),
    );

    const targetStartupService =
      options.startupService ||
      (() => {
        try {
          const mod = require('./StartupService.js');
          return mod.startupService;
        } catch {
          return null;
        }
      })();

    dispatcher.register(
      'StartupService',
      'getData',
      (msg, reqData, context) => {
        if (Array.isArray(msg?.responseData?.city_map?.entities)) {
          const myId =
            msg?.responseData?.user_data?.player_id ||
            options.MyInfo?.id ||
            defaultState?.MyInfo?.id ||
            0;
          const myName =
            msg?.responseData?.user_data?.user_name ||
            options.MyInfo?.name ||
            defaultState?.MyInfo?.name ||
            '';
          const registry =
            options.gbRegistry ||
            options.GreatBuildingRegistry ||
            defaultGbRegistry;
          registerCityEntities(
            msg.responseData.city_map.entities,
            myId,
            myName,
            registry,
          );
        }
        if (typeof options.onStartupMsg === 'function') {
          options.onStartupMsg(msg);
        }
        if (typeof targetStartupService === 'function') {
          return targetStartupService(msg, reqData, context);
        }
      },
    );

    dispatcher.register(
      'StartupService',
      'getOverview',
      (msg, reqData, context) => {
        if (typeof targetStartupService === 'function') {
          return targetStartupService(msg, reqData, context);
        }
      },
    );

    dispatcher.register('BonusService', 'getLimitedBonuses', (msg) => {
      const handler =
        options.getLimitedBonuses ||
        (() => {
          try {
            const bonusMod = require('./BonusService.js');
            return bonusMod.getLimitedBonuses;
          } catch {
            return null;
          }
        })();
      if (typeof handler === 'function') {
        return handler(msg);
      }
    });

    logger?.debug('CityMapService registered RPC handlers');
    return this;
  }
}

const cityMapService = new CityMapService();

module.exports = {
  CityMapService,
  cityMapService,
  extractGridId,
  registerCityEntities,
  register: (dispatcher, options) =>
    cityMapService.register(dispatcher, options),
};
module.exports.default = cityMapService;
