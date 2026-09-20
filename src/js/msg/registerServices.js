/**
 * registerServices.js
 *
 * Central registry connecting InnoGames JSON-RPC services to MessageDispatcher.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

// New domain services
const { hiddenRewardService } = require('./HiddenRewardService.js');
const { castleSystemService } = require('./CastleSystemService.js');
const { boostService } = require('./BoostService.js');
const { allyService } = require('./AllyService.js');
const { inventoryService } = require('./InventoryService.js');
const { outpostService } = require('./OutpostService.js');
const { autoAidService } = require('./AutoAidService.js');
const { friendsTavernService } = require('./FriendsTavernService.js');
const { treasuryService } = require('./TreasuryService.js');
const { questService } = require('./QuestService.js');
const { itemExchangeService } = require('./ItemExchangeService.js');
const { timeService } = require('./TimeService.js');
const { emissaryServiceInstance } = require('./EmissaryService.js');
const resourceService = require('./ResourceService.js');
const { guildRaidsService } = require('./GuildRaidsService.js');
const { greatBuildingsService } = require('./GreatBuildingsService.js');
const { cityProductionService } = require('./CityProductionService.js');
const { cityMapService } = require('./CityMapService.js');
const { metadataService } = require('./MetadataService.js');

const registeredDispatchers = new WeakSet();

function registerAllServices(dispatcher = messageDispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function')
    return dispatcher;

  if (registeredDispatchers.has(dispatcher)) return dispatcher;

  // Modern domain services
  if (hiddenRewardService?.register)
    hiddenRewardService.register(dispatcher, options);
  if (castleSystemService?.register)
    castleSystemService.register(dispatcher, options);
  if (boostService?.register) boostService.register(dispatcher, options);
  if (allyService?.register) allyService.register(dispatcher, options);
  if (inventoryService?.register)
    inventoryService.register(dispatcher, options);
  if (outpostService?.register) outpostService.register(dispatcher, options);
  if (autoAidService?.register) autoAidService.register(dispatcher, options);
  if (friendsTavernService?.register)
    friendsTavernService.register(dispatcher, options);
  if (treasuryService?.register) treasuryService.register(dispatcher, options);
  if (questService?.register) questService.register(dispatcher, options);
  if (itemExchangeService?.register)
    itemExchangeService.register(dispatcher, options);
  if (timeService?.register) timeService.register(dispatcher, options);
  if (emissaryServiceInstance?.register)
    emissaryServiceInstance.register(dispatcher, options);
  if (resourceService?.register) resourceService.register(dispatcher, options);
  if (guildRaidsService?.register)
    guildRaidsService.register(dispatcher, options);
  if (greatBuildingsService?.register)
    greatBuildingsService.register(dispatcher, options);
  if (cityProductionService?.register)
    cityProductionService.register(dispatcher, options);
  if (cityMapService?.register) cityMapService.register(dispatcher, options);
  if (metadataService?.register) metadataService.register(dispatcher, options);

  registeredDispatchers.add(dispatcher);
  return dispatcher;
}

// Central registration owner; repeated bootstrap calls reuse this registration.
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  registerAllServices(messageDispatcher);
}

module.exports = {
  registerAllServices,
  messageDispatcher,
};
module.exports.default = registerAllServices;
