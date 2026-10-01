// Explicit composition for tests that exercise service-to-panel behavior.
import city from '../../src/js/msg/CityMapService.js';
import conversation from '../../src/js/msg/ConversationService.js';
import battleground from '../../src/js/msg/GuildBattlegroundService.js';
import expedition from '../../src/js/msg/GuildExpeditionService.js';
import raids from '../../src/js/msg/GuildRaidsService.js';
import inventory from '../../src/js/msg/InventoryService.js';
import startup from '../../src/js/msg/StartupService.js';
import { setCurrentView } from '../../src/js/ui/cardVisibility.js';
import { renderTargetMessage } from '../../src/js/ui/renderGbgTargets.js';
import serviceDom from '../../src/js/ui/serviceDomBridge.js';

const callbacks = { ...serviceDom, setCurrentView, renderTargetMessage };
for (const service of [
  city,
  raids,
  expedition,
  conversation,
  inventory,
  startup,
  battleground,
]) {
  service.configurePresentation(callbacks);
}

// Webpack supplies the development flag in browser builds.
globalThis.DEV = true;
