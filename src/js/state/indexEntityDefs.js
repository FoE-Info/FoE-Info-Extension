/**
 * indexEntityDefs.js
 *
 * Entity definitions cache integration and persistence orchestrator.
 * Decoupled from monolithic src/js/index.js.
 */

import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import * as metadataService from '../msg/MetadataService.js';
import {
  renderLiveCityStats,
  lastStartupMsg as serviceLastStartupMsg,
  startupService,
} from '../msg/StartupService.js';
import * as entityDefsCache from './entityDefsCache.js';
import { CityEntityDefs } from './state.js';

let activeLastStartupMsg = null;

export function setLastStartupMsg(msg) {
  activeLastStartupMsg = msg;
}

export function getLastStartupMsg() {
  return activeLastStartupMsg || serviceLastStartupMsg;
}

export const markCityEntityDefsDirty = entityDefsCache.markCityEntityDefsDirty;
export const isCityEntityDefsDirty = entityDefsCache.isCityEntityDefsDirty;

export function flushCityEntityDefs() {
  return entityDefsCache.flushCityEntityDefs({
    storage,
    CityEntityDefs,
  });
}

export function resolveMissingCityEntities(ids) {
  return entityDefsCache.resolveMissingCityEntities(ids, {
    metadataService,
    storage,
    CityEntityDefs,
    lastStartupMsg: getLastStartupMsg(),
    startupService,
    renderLiveCityStats,
  });
}

export function resolveMissingCityEntitiesFromMap(mapEntities) {
  return entityDefsCache.resolveMissingCityEntitiesFromMap(mapEntities, {
    helper,
    metadataService,
    storage,
    CityEntityDefs,
    lastStartupMsg: getLastStartupMsg(),
    startupService,
    renderLiveCityStats,
  });
}

export function initEntityDefsLifecycle(targetWindow) {
  entityDefsCache.initEntityDefsUnloadHandler(
    typeof targetWindow !== 'undefined' ? targetWindow : null,
    {
      storage,
      CityEntityDefs,
    },
  );
}
