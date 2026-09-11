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

const registeredDispatchers = new WeakSet();

function registerAllServices(dispatcher = messageDispatcher) {
  if (!dispatcher || typeof dispatcher.register !== 'function')
    return dispatcher;

  if (registeredDispatchers.has(dispatcher)) return dispatcher;

  // Modern domain services
  if (hiddenRewardService?.register) hiddenRewardService.register(dispatcher);
  if (castleSystemService?.register) castleSystemService.register(dispatcher);
  if (boostService?.register) boostService.register(dispatcher);
  if (allyService?.register) allyService.register(dispatcher);
  if (inventoryService?.register) inventoryService.register(dispatcher);
  if (outpostService?.register) outpostService.register(dispatcher);
  if (autoAidService?.register) autoAidService.register(dispatcher);
  if (friendsTavernService?.register) friendsTavernService.register(dispatcher);
  if (treasuryService?.register) treasuryService.register(dispatcher);
  if (questService?.register) questService.register(dispatcher);
  if (itemExchangeService?.register) itemExchangeService.register(dispatcher);
  if (timeService?.register) timeService.register(dispatcher);
  if (emissaryServiceInstance?.register)
    emissaryServiceInstance.register(dispatcher);
  if (resourceService?.register) resourceService.register(dispatcher);

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
