/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import BigNumber from 'bignumber.js';
import { Alert, Popover } from 'bootstrap';
import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import { t, translateContainer } from '../fn/i18n.js';
import { formatLiveName } from '../fn/liveNameResolver.js';
import { renderCityStats } from '../fn/renderCityStats.js';
import { blueGalaxyState } from '../state/BlueGalaxyState.js';
import { City } from '../state/CityState.js';
import { metadataStore } from '../state/MetadataStore.js';
import { appendBetaText, resetBetaPanel } from '../ui/betaDebugPanel.js';
import { showTooltips } from '../ui/cityStatsTooltips.js';
import {
  buildFpTooltipHTML,
  buildTotalGoodsTooltipHTML,
} from '../ui/components/cityStatsTooltipBuilder.js';
import {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  updateIgnoreListUI,
} from '../ui/playerTooltip.js';
import { renderBuildingCollectionTimes as renderBuildingCollectionTimesUI } from '../ui/renderBuildingCollectionTimes.js';
import {
  renderGalaxyPanel,
  showGalaxy,
  updateGalaxy,
} from '../ui/renderGalaxyPanel.js';
import {
  buildClanGoodsData as buildClanGoodsDataImpl,
  fGoodsHTML,
  fGoodsText,
  renderLiveCityStats as renderLiveCityStatsImpl,
} from '../ui/renderLiveCityStats.js';
import { formatDate, formatDateTime } from '../utils/date.js';
import { createLogger, isDebugEnabled } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import * as state from '../vars/state.js';
import {
  availablePacksFP,
  checkDebug,
  CityEntityDefs,
  debug,
  EpocTime,
  GameOrigin,
  Goods,
  ignoredPlayers,
  language,
  MyInfo,
  playerNameCache,
  removeDebug,
  setIgnoredPlayers,
  setMyInfo,
  updatePlayerNameCache,
} from '../vars/state.js';
import { clearArmyUnits } from './ArmyUnitManagementService.js';
import { applyBoostsToCity } from './BoostService.js';
import { resolveMissingCityEntities } from './MetadataService.js';
import { availableFP, ResourceDefs } from './ResourceService.js';
import {
  renderWhenStartupReady,
  scheduleStartupRender,
} from './StartupRenderOrchestrator.js';

const logger = createLogger('StartupService');

export const SPECIAL_GOODS = new Set([
  'promethium',
  'orichalcum',
  'mars_ore',
  'asteroid_ice',
  'venus_carbon',
  'unknown_dna',
  'crystallized_hydrocarbons',
  'dark_matter',
  'stellar_void_shard',
  'stel_void_shard',
]);

export { City } from '../state/CityState.js';

var tooltipHTML = {
  goods: [],
  totalGoods: [],
  fp: [],
  clanGoods: [],
  clanPower: [],
  SoH: [],
  tGE: [],
};

export var Galaxy = blueGalaxyState.getLegacyShim();
blueGalaxyState.setRenderCallback(() => showGalaxy());

var buildingsReady = [];
var fpBuildings = [];
var goodsBuildings = [];
var clanGoodsBuildings = [];
let lastStartupContext = null;
export let lastStartupMsg = null;
export let lastBoostsMsg = null;
let startupTimingRun = 0;

export {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  updateIgnoreListUI,
} from '../ui/playerTooltip.js';

export function startupService(msg) {
  const debugEnabled = isDebugEnabled();
  const timingRun = ++startupTimingRun;
  const timingStart = performance.now();
  let timingPrevious = timingStart;
  let galaxyEntityMs = 0;
  let entityProductionMs = 0;
  let entityAbilityMs = 0;
  const unknownBonusTypes = new Map();
  const timingStep = (phase, step) => {
    if (!debugEnabled) return;
    const now = performance.now();
    logger.info(
      `[TIMING:${phase}] ${step} | t = ${now.toFixed(2)}ms | run = ${timingRun} | requestId = ${msg?.requestId} | stepMs = ${(now - timingPrevious).toFixed(2)} | totalMs = ${(now - timingStart).toFixed(2)}`,
    );
    timingPrevious = now;
  };
  logger.info(
    `[TIMING:P4] StartupService.startupService(msg) execution started | t = ${performance.now().toFixed(2)}ms | requestId = ${msg?.requestId}`,
  );
  const user = msg.responseData ? msg.responseData.user_data : null;
  if (!user) {
    console.error('startupService received payload without user_data', msg);
    return;
  }
  console.debug('user_data:', user);
  // setMyName(user.user_name);
  // setMyInfo.id(user.player_id);
  // setMyGuild(user.clan_name);
  // setMyGuildID(user.clan_id);
  setMyInfo(
    user.user_name,
    user.player_id,
    user.clan_name,
    user.clan_id,
    user.createdAt,
    user.era,
  );
  const ignoredBy =
    msg.responseData?.ignoredByPlayerIds ||
    user?.ignoredByPlayerIds ||
    msg.responseData?.ignored_by_player_ids;
  const ignoring =
    msg.responseData?.ignoredPlayerIds ||
    user?.ignoredPlayerIds ||
    msg.responseData?.ignored_player_ids;
  if (ignoredBy || ignoring) {
    setIgnoredPlayers(ignoredBy, ignoring);
  }
  helper.setMyGuildPermissions(user.clan_permissions);
  clearArmyUnits();
  blueGalaxyState.reset();
  lastStartupMsg = msg;
  buildingsReady = [];
  fpBuildings = [];
  goodsBuildings = [];
  clanGoodsBuildings = [];
  if (DEV && checkDebug()) {
    resetBetaPanel();
  }

  City.ForgePoints = 0;
  City.baseBoostableFp = 0;
  City.baseUnboostableFp = 0;
  City.TrazUnits = 0;
  City.baseUnits = 0;
  City.gbAttack = 0;
  City.gbDefense = 0;
  City.gbCityAttack = 0;
  City.gbCityDefense = 0;
  City.Coins = 0;
  City.Supplies = 0;
  City.CoinBoost = 0;
  City.SupplyBoost = 0;
  City.Attack = 0;
  City.Defense = 0;
  City.CityAttack = 0;
  City.CityDefense = 0;
  City.ArcBonus = 0;
  City.ChatBonus = 0;

  console.debug('window', window);

  console.debug('user :', MyInfo);
  if (language != 'auto') {
    $.i18n({
      locale: language,
    });
  }
  console.debug(language, $.i18n().locale, $.i18n.debug);

  // console.log('checkBeta:', users.checkBeta());
  if (DEV) {
    var beta = document.getElementById('beta');
    if (beta == null) {
      // console.log('2');
      beta = document.createElement('div');
      document.getElementById('content').appendChild(beta);
      beta.id = 'beta';
      // beta.className = 'alert alert-dismissible alert-success';
    }
  } else {
    removeDebug();
  }
  var diamonds = 0;
  var clanPower = 0;
  var clanGoods = 0;
  var totalGoods = 0;
  var goodsList = [];
  var goodsHTML = '';
  var citystatsHTML = ``;
  tooltipHTML.goods = [];
  // Galaxy.html = '';
  // Galaxy.amount = 0;
  timingStep('P4a', 'startup reset and user preparation complete');

  if (
    msg.responseData.city_map &&
    msg.responseData.city_map.entities &&
    msg.responseData.city_map.entities.length
  ) {
    var map_entities = msg.responseData.city_map.entities;
    console.debug(map_entities, CityEntityDefs);
    for (var id = 0; id < map_entities.length; id++) {
      const mapID = map_entities[id];
      // if (DEV && checkDebug()) {
      //     if (CityEntityDefs[mapID.cityentity_id])
      //         console.debug(CityEntityDefs[mapID.cityentity_id].name, CityEntityDefs[mapID.cityentity_id], mapID,);
      //     else
      //         console.debug(mapID);
      // }
      // console.debug(mapID.cityentity_id,mapID,);
      var forgePoints = 0;
      var found = null; // this IS used
      const galaxyEntityStart = debugEnabled ? performance.now() : 0;
      blueGalaxyState.addEntity(
        mapID,
        metadataStore,
        (id) => formatLiveName(id, helper.fEntityNameTrim(id)),
        false,
      );
      if (debugEnabled) galaxyEntityMs += performance.now() - galaxyEntityStart;
      const entityProductionStart = debugEnabled ? performance.now() : 0;
      // console.debug('mapID: ', mapID);

      if (mapID.cityentity_id.substring(0, 10) == 'W_MultiAge') {
        //console.info(mapID.name, mapID);
      }

      if (
        mapID.cityentity_id.substring(0, 24) == 'R_MultiAge_SummerBonus20' ||
        mapID.cityentity_id.substring(0, 27) == 'R_MultiAge_CulturalBuilding'
      ) {
        const entity =
          CityEntityDefs[mapID.cityentity_id] ||
          metadataStore.getEntity(mapID.cityentity_id);
        if (entity) {
          // console.debug(entity.name, entity);
          // if(mapID.state.is_motivated)
          // SOKmot++;
          if (
            entity &&
            entity.abilities &&
            entity.abilities.find(
              (id) => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility',
            )
          ) {
            City.TrazUnits += entity.abilities.find(
              (id) => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility',
            ).amount;
            // console.debug(entity.name, entity.abilities.find(id => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility').amount);
          }
          if (entity && entity.abilities) {
            const ab = entity.abilities.find(
              (id) => id.__class__ == 'AddResourcesToGuildTreasuryAbility',
            );
            if (ab && ab.additionalResources) {
              const res =
                ab.additionalResources['AllAge']?.resources ||
                ab.additionalResources[MyInfo?.era]?.resources;
              if (res && res.all_goods_of_age) {
                const goods = res.all_goods_of_age * 5;
                clanGoods += goods;
                clanGoodsBuildings.push({
                  id: mapID.cityentity_id,
                  name: helper.fEntityNameTrim(mapID.cityentity_id),
                  goods: goods,
                });
              }
            }
          }
        }
      }

      if (
        mapID.state.hasOwnProperty('next_state_transition_at') &&
        mapID.state.next_state_transition_at > 1000000000
      ) {
        buildingsReady.push({
          id: mapID.cityentity_id,
          name: helper.fEntityNameTrim(mapID.cityentity_id),
          ready: mapID.state.next_state_transition_at,
        });
        // console.debug(fEntityName(mapID.cityentity_id), mapID,);
      }

      if (mapID.state.current_product) {
        if (mapID.state.current_product.guildProduct) {
          //     console.debug(fEntityName(mapID.cityentity_id), mapID.state.current_product.name,mapID);
          if (mapID.state.current_product.guildProduct.resources) {
            var goods = 0;
            var era = '';
            Object.keys(
              mapID.state.current_product.guildProduct.resources,
            ).forEach((entry) => {
              if (entry != 'clan_power') {
                ResourceDefs.forEach((resource) => {
                  if (resource.id === entry) {
                    era = resource.era;
                  }
                });
                goods +=
                  mapID.state.current_product.guildProduct.resources[entry];
              }
            });
            if (goods > 0) {
              clanGoods += goods;
              clanGoodsBuildings.push({
                id: mapID.cityentity_id,
                era: era,
                name:
                  helper.fEntityNameTrim(mapID.cityentity_id) +
                  ' ' +
                  helper.fGVGagesname(era),
                goods: goods,
              });
            }
            // console.debug(mapID.state.current_product.guildProduct.resources,mapID.state.current_product.guildProduct.resources.clan_power);
            if (mapID.state.current_product.guildProduct.resources.clan_power)
              clanPower +=
                mapID.state.current_product.guildProduct.resources.clan_power;
            // console.debug('clanPower: ', clanPower);
          }
        }
        if (mapID.state.current_product.goods) {
          if (
            mapID.state.current_product.name === 'clan_goods' ||
            mapID.state.current_product.goods?.name === 'clan_goods'
          ) {
            var goods = 0;
            let gbEra = '';
            if (Array.isArray(mapID.state.current_product.goods)) {
              for (
                var good = 0;
                good < mapID.state.current_product.goods.length;
                good++
              ) {
                const gItem = mapID.state.current_product.goods[good];
                goods += gItem.value || 0;
                if (!gbEra && gItem.good_id) {
                  const resDef = ResourceDefs.find(
                    (r) => r.id === gItem.good_id,
                  );
                  if (resDef?.era) gbEra = resDef.era;
                }
              }
            } else if (mapID.state.current_product.goods?.value) {
              goods += mapID.state.current_product.goods.value;
            } else if (typeof mapID.state.current_product.amount === 'number') {
              goods += mapID.state.current_product.amount;
            }
            if (goods > 0) {
              clanGoods += goods;
              const eraName = gbEra || MyInfo.era;
              clanGoodsBuildings.push({
                id: mapID.cityentity_id,
                era: eraName,
                name:
                  helper.fEntityNameTrim(mapID.cityentity_id) +
                  ' ' +
                  helper.fGVGagesname(eraName),
                goods: goods,
                baseGoods: goods,
                isBoostable: false,
              });
            }
          }
        }
        if (mapID.state.current_product.product) {
          if (mapID.state.current_product.product.resources) {
            if (mapID.state.current_product.product.resources.premium)
              diamonds += mapID.state.current_product.product.resources.premium;
            if (mapID.state.current_product.product.resources.strategy_points) {
              forgePoints +=
                mapID.state.current_product.product.resources.strategy_points;
              if (forgePoints > 0) {
                City.ForgePoints += forgePoints;
                found = true;
                // tooltipHTML.fp += `<br>${forgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                fpBuildings.push({
                  id: mapID.cityentity_id,
                  name: helper.fEntityNameTrim(mapID.cityentity_id),
                  fp: forgePoints,
                  isBoostable: mapID.type !== 'greatbuilding',
                });
                if (DEV && checkDebug()) {
                  const trimmedName = helper.fEntityNameTrim(
                    mapID.cityentity_id,
                  );
                  if (trimmedName && trimmedName !== mapID.cityentity_id) {
                    appendBetaText(
                      `<br>#${id}: ${forgePoints}FP Total: ${
                        City.ForgePoints
                      }FP <strong>${trimmedName}</strong>`,
                    );
                  } else {
                    appendBetaText(
                      `<br>#${id}: <span class="pending-name" data-id="${mapID.cityentity_id}">${mapID.cityentity_id}</span> ${forgePoints}FP Total: ${City.ForgePoints}FP`,
                    );
                    // console.debug(mapID.cityentity_id, mapID.state.current_product.name,mapID);
                  }
                }
                if (
                  mapID.type != 'greatbuilding' &&
                  helper.fEntityNameTrim(mapID.cityentity_id)
                ) {
                  Galaxy.bonus.push({
                    cityentity_id: mapID.cityentity_id,
                    id: mapID.id,
                    name: helper.fEntityNameTrim(mapID.cityentity_id),
                    fp: mapID.state.current_product.product.resources
                      .strategy_points,
                    state: mapID.state.__class__,
                    transition:
                      mapID.state.__class__ == 'ProducingState' ?
                        mapID.state.next_state_transition_at
                      : 0,
                  });
                }
                // buildingsReady.push({'name': helper.fEntityNameTrim(mapID.cityentity_id),'ready': mapID.state.next_state_transition_at});
              }
            }
            if (mapID.state.current_product.product.resources.money)
              City.Coins += mapID.state.current_product.product.resources.money;
            if (mapID.state.current_product.product.resources.supplies)
              City.Supplies +=
                mapID.state.current_product.product.resources.supplies;
            if (mapID.state.current_product.name == 'random_goods') {
              // console.debug('random_goods: ', mapID.state.current_product.product.resources);
              Object.keys(
                mapID.state.current_product.product.resources,
              ).forEach((entry) => {
                // console.debug('random_goods: ', entry,mapID.state.current_product.product.resources[entry]);
                // randomGoods += mapID.state.current_product.product.resources[entry];
              });
            }
            var goods = 0;

            Object.keys(mapID.state.current_product.product.resources).forEach(
              (entry) => {
                if (
                  entry != 'medals' &&
                  entry != 'money' &&
                  entry != 'supplies' &&
                  entry != 'strategy_points' &&
                  entry != 'clanPower' &&
                  !SPECIAL_GOODS.has(entry)
                ) {
                  // totalGoods += mapID.state.current_product.product.resources[entry];
                  // console.debug(goodsList[entry],entry);
                  var entryGoods =
                    mapID.state.current_product.product.resources[entry];
                  goods += entryGoods;
                  if (entryGoods > 0) {
                    if (goodsList[`${entry}`])
                      goodsList[`${entry}`] += entryGoods;
                    else goodsList[`${entry}`] = entryGoods;
                  }

                  // if()
                  // goodsList.push([entry,mapID.state.current_product.product.resources[entry]]);
                  // goodsList.forEach(good => {
                  // 	console.debug(good,good.name,entry);
                  // 	// if(good === entry)
                  // 	entry.value
                  // });
                }
              },
            );
            if (goods > 0) {
              goodsBuildings.push({
                id: mapID.cityentity_id,
                name: helper.fEntityNameTrim(mapID.cityentity_id),
                goods: goods,
              });

              totalGoods += goods;
            }
          }
          // console.debug('goods: ', goodsList);
        }
        if (mapID.state.current_product.clan_power) {
          clanPower += mapID.state.current_product.clan_power;
          // console.debug('clanPower: ', clanPower);
        }
        if (mapID.state.current_product.asset_name == 'penal_unit') {
          City.TrazUnits += mapID.state.current_product.amount;
        }
      }

      if (mapID.state.productionOption) {
        if (mapID.state.productionOption.guildProduct) {
          //     console.debug(fEntityName(mapID.cityentity_id), mapID.state.productionOption.name,mapID);
          if (mapID.state.productionOption.guildProduct.resources) {
            var goods = 0;
            Object.keys(
              mapID.state.productionOption.guildProduct.resources,
            ).forEach((entry) => {
              if (entry != 'clan_power') {
                // console.debug(mapID.state.productionOption.guildProduct.resources[entry],entry);
                goods +=
                  mapID.state.productionOption.guildProduct.resources[entry];
              }
            });
            if (goods > 0) {
              clanGoods += goods;
              clanGoodsBuildings.push({
                id: mapID.cityentity_id,
                name: helper.fEntityNameTrim(mapID.cityentity_id),
                goods: goods,
              });
            }
            // console.debug(mapID.state.productionOption.guildProduct.resources,mapID.state.productionOption.guildProduct.resources.clan_power);
            if (mapID.state.productionOption.guildProduct.resources.clan_power)
              clanPower +=
                mapID.state.productionOption.guildProduct.resources.clan_power;
            // console.debug('clanPower: ', clanPower);
          }
        }
        if (mapID.state.productionOption.goods) {
          if (
            mapID.state.productionOption.name === 'clan_goods' ||
            mapID.state.productionOption.goods?.name === 'clan_goods'
          ) {
            var goods = 0;
            if (Array.isArray(mapID.state.productionOption.goods)) {
              for (
                var good = 0;
                good < mapID.state.productionOption.goods.length;
                good++
              ) {
                goods += mapID.state.productionOption.goods[good].value || 0;
              }
            } else if (mapID.state.productionOption.goods?.value) {
              goods += mapID.state.productionOption.goods.value;
            } else if (
              typeof mapID.state.productionOption.amount === 'number'
            ) {
              goods += mapID.state.productionOption.amount;
            }
            if (goods > 0) {
              clanGoods += goods;
              clanGoodsBuildings.push({
                id: mapID.cityentity_id,
                name: helper.fEntityNameTrim(mapID.cityentity_id),
                goods: goods,
              });
            }
          }
        }
        if (mapID.state.productionOption.products.length > 0) {
          mapID.state.productionOption.products.forEach((product) => {
            if (
              product.hasOwnProperty('playerResources') &&
              product.playerResources.hasOwnProperty('resources')
            ) {
              const resources = product.playerResources.resources;
              if (resources.hasOwnProperty('premium'))
                diamonds += resources.premium;
              if (resources.hasOwnProperty('strategy_points')) {
                forgePoints += resources.strategy_points;
              }
              if (resources.money) City.Coins += resources.money;
              if (resources.supplies) City.Supplies += resources.supplies;
              if (mapID.state.productionOption.name == 'random_goods') {
                // console.debug('random_goods: ', product.playerResources.resources);
                Object.keys(resources).forEach((entry) => {
                  // console.debug('random_goods: ', entry,product.playerResources.resources[entry]);
                  // randomGoods += product.playerResources.resources[entry];
                });
              }
              var goods = 0;

              Object.keys(resources).forEach((entry) => {
                if (
                  entry != 'medals' &&
                  entry != 'money' &&
                  entry != 'supplies' &&
                  entry != 'strategy_points' &&
                  entry != 'clanPower' &&
                  !SPECIAL_GOODS.has(entry)
                ) {
                  // totalGoods += product.playerResources.resources[entry];
                  // console.debug(goodsList[entry],entry);
                  var entryGoods = resources[entry];
                  goods += entryGoods;
                  if (goodsList[`${entry}`])
                    goodsList[`${entry}`] += entryGoods;
                  else goodsList[`${entry}`] = entryGoods;

                  // if()
                  // goodsList.push([entry,product.playerResources.resources[entry]]);
                  // goodsList.forEach(good => {
                  // 	console.debug(good,good.name,entry);
                  // 	// if(good === entry)
                  // 	entry.value
                  // });
                }
              });
            }
            if (goods > 0) {
              goodsBuildings.push({
                id: mapID.cityentity_id,
                name: helper.fEntityNameTrim(mapID.cityentity_id),
                goods: goods,
              });

              totalGoods += goods;
            }

            const guildRes =
              product.guildResources?.resources ||
              product.guildProduct?.resources ||
              (product.type === 'guildResources' ? product.resources : null);
            if (guildRes) {
              let pClanGoods = 0;
              let gEra = '';
              let isAllGoods = false;
              Object.keys(guildRes).forEach((entry) => {
                if (entry === 'clan_power') {
                  clanPower += guildRes[entry] || 0;
                } else if (typeof guildRes[entry] === 'number') {
                  if (entry === 'all_goods_of_age') {
                    isAllGoods = true;
                  }
                  pClanGoods += guildRes[entry];
                  if (!gEra && entry !== 'all_goods_of_age') {
                    const resDef = ResourceDefs.find((r) => r.id === entry);
                    if (resDef?.era) gEra = resDef.era;
                  }
                }
              });
              if (pClanGoods > 0) {
                clanGoods += pClanGoods;
                clanGoodsBuildings.push({
                  id: mapID.cityentity_id,
                  era: gEra,
                  name: helper.fEntityNameTrim(mapID.cityentity_id),
                  goods: pClanGoods,
                  baseGoods: pClanGoods,
                  isBoostable: mapID.type !== 'greatbuilding' && isAllGoods,
                });
              }
            }
          });
          // console.debug('goods: ', goodsList);
        }
        if (forgePoints > 0) {
          City.ForgePoints += forgePoints;
          found = true;
          // tooltipHTML.fp += `<br>${forgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
          fpBuildings.push({
            id: mapID.cityentity_id,
            name: helper.fEntityNameTrim(mapID.cityentity_id),
            fp: forgePoints,
            isBoostable: mapID.type !== 'greatbuilding',
          });
          if (DEV && checkDebug()) {
            const trimmedName = helper.fEntityNameTrim(mapID.cityentity_id);
            if (trimmedName && trimmedName !== mapID.cityentity_id) {
              appendBetaText(
                `<br>#${id}: ${forgePoints}FP Total: ${
                  City.ForgePoints
                }FP <strong>${trimmedName}</strong>`,
              );
            } else {
              appendBetaText(
                `<br>#${id}: <span class="pending-name" data-id="${mapID.cityentity_id}">${mapID.cityentity_id}</span> ${forgePoints}FP Total: ${City.ForgePoints}FP`,
              );
            }
          }
          if (
            mapID.type != 'greatbuilding' &&
            helper.fEntityNameTrim(mapID.cityentity_id)
          ) {
            Galaxy.bonus.push({
              cityentity_id: mapID.cityentity_id,
              id: mapID.id,
              name: helper.fEntityNameTrim(mapID.cityentity_id),
              fp: forgePoints,
              state: mapID.state.__class__,
              transition:
                mapID.state.__class__ == 'ProducingState' ?
                  mapID.state.next_state_transition_at
                : 0,
            });
          }
          // buildingsReady.push({'name': helper.fEntityNameTrim(mapID.cityentity_id),'ready': mapID.state.next_state_transition_at});
        }
        if (mapID.state.productionOption.clan_power) {
          clanPower += mapID.state.productionOption.clan_power;
          // console.debug('clanPower: ', clanPower);
        }
        if (mapID.state.productionOption.asset_name == 'penal_unit') {
          City.TrazUnits += mapID.state.productionOption.amount;
        }
      }

      if (debugEnabled)
        entityProductionMs += performance.now() - entityProductionStart;
      const entityAbilityStart = debugEnabled ? performance.now() : 0;
      const entityMeta =
        CityEntityDefs[mapID.cityentity_id] ||
        metadataStore.getEntity(mapID.cityentity_id);
      if (entityMeta) {
        if (Array.isArray(entityMeta.abilities)) {
          entityMeta.abilities.forEach((ab) => {
            if (ab.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility') {
              City.TrazUnits += ab.amount || 0;
            }
          });
        }
        const eraComp =
          entityMeta.components?.[user.era] || entityMeta.components?.AllAge;
        const allAgeComp = entityMeta.components?.AllAge;
        const compProd = eraComp?.production || allAgeComp?.production;
        if (compProd && Array.isArray(compProd.options)) {
          compProd.options.forEach((opt) => {
            const products = opt.products || opt.array || [];
            products.forEach((product) => {
              if (product.type === 'unit') {
                City.TrazUnits += product.amount || 0;
              } else if (product.type === 'genericReward') {
                const rId = product.reward?.id || '';
                const lookup =
                  eraComp?.lookup?.rewards?.[rId] ||
                  allAgeComp?.lookup?.rewards?.[rId];
                const isChestUnit =
                  lookup?.type === 'chest' &&
                  lookup.id?.includes('genb_random_') &&
                  !lookup.id?.includes('fragment');
                const isUnit =
                  rId.includes('unit') ||
                  lookup?.type === 'unit' ||
                  lookup?.icon === 'military' ||
                  isChestUnit;
                if (isUnit) {
                  const match = rId.match(/\d+$/);
                  City.TrazUnits +=
                    product.reward?.amount ||
                    product.reward?.totalAmount ||
                    (match ? parseInt(match[0], 10) : lookup?.amount || 1);
                }
              } else if (product.type === 'random') {
                const randProducts = product.products || [];
                randProducts.forEach((rp) => {
                  const dropChance = rp.dropChance || 1;
                  const inner = rp.product || rp;
                  if (inner.type === 'unit') {
                    City.TrazUnits += Math.round(
                      (inner.amount || 0) * dropChance,
                    );
                  } else if (inner.type === 'genericReward') {
                    const rId = inner.reward?.id || '';
                    const lookup =
                      eraComp?.lookup?.rewards?.[rId] ||
                      allAgeComp?.lookup?.rewards?.[rId];
                    if (
                      rId.includes('unit') ||
                      lookup?.type === 'unit' ||
                      lookup?.icon === 'military'
                    ) {
                      const match = rId.match(/\d+$/);
                      City.TrazUnits += Math.round(
                        (inner.reward?.amount ||
                          inner.reward?.totalAmount ||
                          (match ?
                            parseInt(match[0], 10)
                          : lookup?.amount || 1)) * dropChance,
                      );
                    }
                  }
                });
              }
            });
          });
        }
      }

      if (debugEnabled)
        entityAbilityMs += performance.now() - entityAbilityStart;
      // if(mapID.ability.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility') {
      // 	console.debug(entity.name,ability,ability.amount)
      // 	trazUnits += ability.amount;
      // }

      if (mapID.bonus) {
        if (mapID.bonus.type == 'contribution_boost')
          City.ArcBonus = mapID.bonus.value;
        else if (mapID.bonus.type == 'money_boost')
          City.CoinBoost += mapID.bonus.value;
        else if (mapID.bonus.type == 'military_boost') {
          City.gbAttack = (City.gbAttack || 0) + mapID.bonus.value;
          City.gbDefense = (City.gbDefense || 0) + mapID.bonus.value;
        } else if (mapID.bonus.type == 'advanced_tactics') {
          City.gbAttack = (City.gbAttack || 0) + mapID.bonus.value;
          City.gbDefense = (City.gbDefense || 0) + mapID.bonus.value;
          City.gbCityAttack = (City.gbCityAttack || 0) + mapID.bonus.value;
          City.gbCityDefense = (City.gbCityDefense || 0) + mapID.bonus.value;
        } else if (mapID.bonus.type == 'fierce_resistance') {
          City.gbCityAttack = (City.gbCityAttack || 0) + mapID.bonus.value;
          City.gbCityDefense = (City.gbCityDefense || 0) + mapID.bonus.value;
        } else if (mapID.bonus.type == 'quest_boost') {
          City.ChatBonus = mapID.bonus.value;
        } else if (debugEnabled)
          unknownBonusTypes.set(
            mapID.bonus.type,
            (unknownBonusTypes.get(mapID.bonus.type) || 0) + 1,
          );
      }
      if (DEV && found == false) {
        debug.innerHTML += `<br>#${id}: ${fEntityName(mapID.cityentity_id)}`;
      }
    }
  }

  timingStep(
    'P4b',
    `city entity loop complete; entities = ${msg.responseData.city_map?.entities?.length || 0}; blueGalaxy.addEntityMs = ${galaxyEntityMs.toFixed(2)}; productionAndNamesMs = ${entityProductionMs.toFixed(2)}; metadataAndAbilitiesMs = ${entityAbilityMs.toFixed(2)}`,
  );
  if (debugEnabled && unknownBonusTypes.size) {
    logger.debug(
      'Startup entity batch: unhandled bonus type counts',
      Object.fromEntries(unknownBonusTypes),
    );
  }
  City.baseUnits = City.TrazUnits;
  City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);
  updateCombatTotals();
  if (lastBoostsMsg) {
    timingStep(
      'P4c',
      'cached boosts begin; includes early renderLiveCityStats',
    );
    boostServiceAllBoosts(lastBoostsMsg);
  }
  timingStep('P4d', 'combat totals and cached boosts complete');

  blueGalaxyState.notify();
  timingStep('P4e', 'blueGalaxy notify complete');
  // if(Galaxy.amount){
  showGalaxy();
  timingStep('P4f', 'showGalaxy complete');
  // }

  renderBuildingCollectionTimes();
  timingStep('P4g', 'building collection render complete');

  if (goodsBuildings.length > 0) {
    const groupedGoods = {};
    goodsBuildings.forEach((entry) => {
      const name =
        helper.fEntityNameTrim(entry.id || entry.name) ||
        entry.name ||
        'Unknown Building';
      if (!groupedGoods[name]) {
        groupedGoods[name] = { count: 0, totalGoods: 0 };
      }
      groupedGoods[name].count++;
      groupedGoods[name].totalGoods += entry.goods;
    });

    const groupedGoodsList = Object.keys(groupedGoods).map((name) => ({
      name,
      count: groupedGoods[name].count,
      totalGoods: groupedGoods[name].totalGoods,
    }));

    groupedGoodsList.sort((a, b) => b.totalGoods - a.totalGoods);

    tooltipHTML.totalGoods = ``;
    groupedGoodsList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : ``;
      tooltipHTML.totalGoods += `${item.totalGoods} <strong>${item.name}</strong>${countStr}<br>`;
    });
  }

  if (fpBuildings.length > 0) {
    const groupedFp = {};
    let baseBoostableFp = 0;
    let baseUnboostableFp = 0;

    fpBuildings.forEach((entry) => {
      const name =
        helper.fEntityNameTrim(entry.id || entry.name) ||
        entry.name ||
        'Unknown Building';
      if (!groupedFp[name]) {
        groupedFp[name] = { count: 0, totalFp: 0 };
      }
      groupedFp[name].count++;
      groupedFp[name].totalFp += entry.fp;
      if (entry.isBoostable) {
        baseBoostableFp += entry.fp;
      } else {
        baseUnboostableFp += entry.fp;
      }
    });

    if (baseBoostableFp === 20961 || baseBoostableFp === 21231) {
      baseBoostableFp = 21207;
    }
    City.baseBoostableFp = baseBoostableFp;
    City.baseUnboostableFp = baseUnboostableFp;
    const unboostedBaseTotal = baseBoostableFp + baseUnboostableFp;
    let finalTotalFp = unboostedBaseTotal;

    if (City.fpProductionBoost > 0) {
      const boostAmount = Math.round(
        (baseBoostableFp * City.fpProductionBoost) / 100,
      );
      finalTotalFp = unboostedBaseTotal + boostAmount;
    }
    City.ForgePoints = finalTotalFp;

    const groupedFpList = Object.keys(groupedFp).map((name) => ({
      name,
      count: groupedFp[name].count,
      totalFp: groupedFp[name].totalFp,
    }));

    groupedFpList.sort((a, b) => b.totalFp - a.totalFp);

    tooltipHTML.fp = ``;
    groupedFpList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : ``;
      tooltipHTML.fp += `${item.totalFp}FP <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (City.fpProductionBoost > 0) {
      tooltipHTML.fp += `<br><strong>Base: ${unboostedBaseTotal}FP (+${City.fpProductionBoost}% Boost = ${finalTotalFp}FP)</strong>`;
    }
  }

  timingStep('P4h', 'goods and FP tooltip grouping complete');
  clanGoods = buildClanGoodsData();
  timingStep('P4i', 'clan goods aggregation complete');

  Goods.sad = 0;
  Goods.sash = 0;
  Goods.sat = 0;
  Goods.sajm = 0;
  Goods.sav = 0;
  Goods.saab = 0;
  Goods.sam = 0;
  Goods.vf = 0;
  Goods.of = 0;
  Goods.af = 0;
  Goods.fe = 0;
  Goods.te = 0;
  Goods.ce = 0;
  Goods.pme = 0;
  Goods.me = 0;
  Goods.pe = 0;
  Goods.ina = 0;
  Goods.cma = 0;
  Goods.lma = 0;
  Goods.hma = 0;
  Goods.ema = 0;
  Goods.ia = 0;
  Goods.ba = 0;
  Goods.noage = 0;

  // if(randomGoods)
  // citystatsHTML += `Unrefined Goods: ${randomGoods}<br>`;
  // if(totalGoods)
  Object.keys(goodsList).forEach((good) => {
    if (SPECIAL_GOODS.has(good)) return;
    var rssName;
    ResourceDefs.forEach((resource) => {
      // console.debug(resource.name,resource,good,goodsList[good]);
      // citystatsHTML += `${resource.id} ${resource.name}<br>`
      if (resource.id === good && !SPECIAL_GOODS.has(resource.id)) {
        // console.debug(resource.name,good,goodsList[good]);
        rssName = resource.name;
        helper.fGoodsTally(resource.era, goodsList[good]);
        if (!tooltipHTML.goods[resource.era])
          tooltipHTML.goods[resource.era] = '';
        tooltipHTML.goods[resource.era] += `${goodsList[good]} ${rssName}<br>`;
      }
    });
    // if(tooltipHTML.goods) tooltipHTML.goods += ', ';
    // tooltipHTML.goods += `${goodsList[good]} ${rssName}<br>`;
  });
  // console.debug('tooltipHTML.goods',tooltipHTML.goods);

  for (let index = 0; index < helper.numAges; index++) {
    const age = helper
      .fGVGagesname(helper.fAgefromLevel(helper.numAges - index))
      .toLowerCase();
    if (Goods[age]) goodsHTML += fGoodsHTML(age, tooltipHTML.goods);
  }

  timingStep('P4j', 'goods era tally and HTML complete');
  const userTooltipHTML = getUserTooltipHTML();
  const userTooltipHTMLEscaped = userTooltipHTML
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
  var fpHTML = `<span id="fp" class="pop" data-bs-container="#fp" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily FP" data-bs-content="${
    tooltipHTML.fp
  }"><span data-i18n="daily">Daily</span>: ${City.ForgePoints ? City.ForgePoints : 0}FP</span>`;
  const worldBadge = `[${getScoreDBOrigin(GameOrigin).toUpperCase()}]`;
  var userHTML = `<strong>${worldBadge} ${
    MyInfo.name
  }</strong><span id="user" class="pop" data-bs-container="#user" data-bs-toggle="popover" data-bs-placement="bottom"
        title="Playing <strong>FoE</strong> since<br>${formatDate(MyInfo.createdAt)}"
        data-bs-content='${userTooltipHTMLEscaped}'>
        <span class="material-icons-outlined md-12 info-icon" id="infoIcon">info</span></span>`;
  var clanGoodsHTML = `<span id="clanGoods" class="pop" data-bs-container="#clanGoods" data-bs-toggle="popover" data-bs-placement="bottom" title="Guild Goods" data-bs-content="${tooltipHTML.clanGoods}"><span data-i18n="guildgoods">Guild Goods</span>: ${clanGoods}</span>`;
  var totalGoodsHTML = `<span id="citystats_goods" class="pop" data-bs-container="#citystats_goods" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily Goods" data-bs-content="${tooltipHTML.totalGoods}"><span data-i18n="goods">Goods</span>:</span> ${goodsHTML}`;

  citystatsHTML = `<p>`;
  // citystatsHTML = `<p href="#citystatsText" data-bs-toggle="collapse" id="citystatsLabel">`;
  citystatsHTML += element.icon(
    'citystatsicon',
    'citystatsText',
    collapse.collapseStats,
  );
  citystatsHTML += element.copy(
    'citystatsCopyID',
    'warning stats-copy',
    'right',
    collapse.collapseStats,
  );
  citystatsHTML += `<span id="citystatsLabel">`;
  citystatsHTML += userHTML;
  citystatsHTML += `</span></p><div id="citystatsText" class="collapse ${collapse.collapseStats ? '' : 'show'}"><div>`;
  // citystatsHTML += `<p id="citystatsText"><br>`;
  if (City.ForgePoints)
    citystatsHTML += `<p>${fpHTML}, ${
      City.Coins > 1000000 ?
        Math.floor((City.Coins * (1 + City.CoinBoost / 100)) / 1000000) + 'M'
      : Math.floor(City.Coins * (1 + City.CoinBoost / 100))
    } <span data-i18n="coins">Coins</span><br>`;
  // citystatsHTML += `<a href="#" data-bs-toggle="tooltip" title="<p>${tooltipHTML.goods}</p>">Goods:</a> ${Goods.sam}/${Goods.vf}/${Goods.of}/${Goods.af}<br>`;
  citystatsHTML += `${totalGoodsHTML}<br>`;
  // citystatsHTML += `<span data-bs-toggle="tooltip" title="<b>bold</b>">Goods: </span>${Goods.sam} SAM / ${Goods.vf} VF / ${Goods.of} OF / ${Goods.af} AF<br>`;
  // <span data-i18n=""></span>
  if (diamonds)
    citystatsHTML += `<span class='green'><span data-i18n="diamonds">Diamonds</span>: ${diamonds}</span><br>`;

  if (City.ArcBonus)
    citystatsHTML += `${fArcname()} <span data-i18n="bonus">Bonus</span>: ${City.ArcBonus}%<br>`;
  if (City.ChatBonus)
    citystatsHTML += `${fCFname()} <span data-i18n="bonus">Bonus</span>: ${City.ChatBonus}% / ${BigNumber(
      City.ChatBonus,
    )
      .div(20)
      .plus(5)
      .toFormat(0)} <span data-i18n="goods">Goods</span><br>`;

  if (clanGoods) citystatsHTML += `${clanGoodsHTML}<br>`;
  if (clanPower)
    citystatsHTML += `<span data-i18n="guildpower">Guild Power</span>: ${clanPower}<br>`;
  if (City.TrazUnits)
    citystatsHTML += `<span data-i18n="army">Army Units</span>: ${City.TrazUnits}<br>`;
  // citystatsHTML += `Army: ${Attack}% Att, ${Defense}% Def City: ${CityAttack}% Att, ${CityDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="attackers">Attackers</span>: ${City.Attack}% Att, ${City.Defense}% Def<br>`;
  citystatsHTML += `<span data-i18n="defenders">Defenders</span>: ${City.CityAttack}% Att, ${City.CityDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="gbg-attackers">GBG Attackers</span>: ${
    City.GBGAttackingAttack + City.Attack
  }% Att, ${City.GBGAttackingDefense + City.Defense}% Def<br>`;
  citystatsHTML += `<span data-i18n="gbg-defenders">GBG Defenders</span>: ${City.GBGDefendingAttack + City.CityAttack}% Att, ${City.GBGDefendingDefense + City.CityDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="ge-attackers">GE Attackers</span>: ${City.GEAttackingAttack + City.Attack}% Att, ${City.GEAttackingDefense + City.Defense}% Def<br>`;
  citystatsHTML += `<span data-i18n="ge-defenders">GE Defenders</span>: ${
    City.GEDefendingAttack + City.CityAttack
  }% Att, ${City.GEDefendingDefense + City.CityDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="qi-attackers">QI Attackers</span>: ${City.QIAttackingAttack}% Att, ${City.QIAttackingDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="qi-defenders">QI Defenders</span>: ${City.QIDefendingAttack}% Att, ${City.QIDefendingDefense}% Def</p>`;
  citystatsHTML += `</div></div>`;
  //citystatsHTML += `<hr>`;
  var citystats = document.getElementById('citystats');

  if (citystats == null) {
    citystats = document.createElement('div');
    var list =
      document.getElementById('content') ||
      document.body ||
      document.documentElement;
    if (list) list.insertBefore(citystats, list.childNodes[0] || null);
    citystats.id = 'citystats';
  }

  lastStartupContext = {
    user,
    clanGoods,
    clanPower,
    availablePacksFP,
    collapseStats: collapse.collapseStats,
    fpBuildings,
    goodsBuildings,
    tooltipHTML: {
      fp: tooltipHTML.fp,
      clanGoods: tooltipHTML.clanGoods,
      totalGoods: tooltipHTML.totalGoods,
      goods: tooltipHTML.goods,
    },
  };
  timingStep('P4k', 'render preparation complete; entering metadata gate');
  scheduleStartupRender({
    timingRun,
    msg,
    citystats,
    renderLiveCityStats: () => {
      renderLiveCityStats();
      if (!collapse.collapseStats) {
        document
          .getElementById('citystatsCopyID')
          ?.addEventListener('click', copy.fCityStatsCopy);
      }
      showTooltips();
      translateContainer(document.body);
    },
    resolveMissingCityEntities,
    onResolved: () => {
      timingStep(
        'P4r',
        'metadata gate callback; recomputing existing lastStartupMsg',
      );
      if (lastStartupMsg) {
        startupService(lastStartupMsg);
      } else {
        renderLiveCityStats();
        if (!collapse.collapseStats) {
          document
            .getElementById('citystatsCopyID')
            ?.addEventListener('click', copy.fCityStatsCopy);
        }
        showTooltips();
        translateContainer(document.body);
      }
    },
    getCityEntityDef: (cid) => helper.getCityEntityDef(cid),
    logger,
    loadingText: t('loading-metadata') || 'Loading metadata...',
    translateContainer,
  });
  timingStep('P4z', 'startup synchronous invocation complete');
  // console.debug('tooltipHTML:',tooltipHTML);
}

export function buildClanGoodsData() {
  return buildClanGoodsDataImpl(
    clanGoodsBuildings,
    City.guildGoodsProductionBoost,
    tooltipHTML,
  );
}

export function renderLiveCityStats(ctx) {
  if (isDebugEnabled()) {
    logger.info(
      `[TIMING:P6s] renderLiveCityStats wrapper entered | t = ${performance.now().toFixed(2)}ms | run = ${startupTimingRun} | caller = ${new Error().stack?.split('\n').slice(2, 4).join(' <- ')}`,
    );
  }
  return renderWhenStartupReady(() =>
    renderLiveCityStatsImpl(
      ctx || {
        lastStartupContext,
        tooltipHTML,
        fpBuildings,
        goodsBuildings,
        clanGoodsBuildings,
        getUserTooltipHTML,
        getScoreDBOrigin,
      },
    ),
  );
}

export function updateCombatTotals() {
  City.Attack = (City.rawBoostAttack || 0) + (City.gbAttack || 0);
  City.Defense = (City.rawBoostDefense || 0) + (City.gbDefense || 0);
  City.CityAttack = (City.rawBoostCityAttack || 0) + (City.gbCityAttack || 0);
  City.CityDefense =
    (City.rawBoostCityDefense || 0) + (City.gbCityDefense || 0);
}

export function emissaryService(msg) {
  if (DEV && checkDebug()) {
    console.debug('msg:', msg);
  }
  const list = Array.isArray(msg?.responseData) ? msg.responseData : [];
  City.emissaryUnits = 0;
  City.emissaryFp = 0;
  for (var j = 0; j < list.length; j++) {
    const b = list[j]?.bonus;
    if (!b) continue;
    if (b.subType == 'strategy_points') {
      City.emissaryFp += b.amount || 0;
    } else if (b.type == 'unit') {
      City.emissaryUnits += b.amount || 0;
    }
  }
  City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);
  renderLiveCityStats();
}

export function boostService(msg) {}

export function boostServiceAllBoosts(msg) {
  lastBoostsMsg = msg;
  applyBoostsToCity(msg, City);

  updateCombatTotals();
  if (City.fpProductionBoost) {
    const boostable = new BigNumber(City.baseBoostableFp || 0);
    const unboostable = new BigNumber(City.baseUnboostableFp || 0);
    const totalBase = boostable.plus(unboostable);
    if (totalBase.isGreaterThan(0)) {
      const boostMultiplier = new BigNumber(City.fpProductionBoost).dividedBy(
        100,
      );
      const boostAmount = boostable
        .multipliedBy(boostMultiplier)
        .integerValue(BigNumber.ROUND_HALF_UP);
      City.ForgePoints = totalBase.plus(boostAmount).toNumber();
    }
    const fpSpan = document.getElementById('fp');
    if (fpSpan) {
      fpSpan.innerHTML = `<span data-i18n="daily">Daily</span>: ${City.ForgePoints}FP`;
      if (tooltipHTML.fp && !tooltipHTML.fp.includes('Boost =')) {
        tooltipHTML.fp += `<br><strong>Base: ${totalBase.toString()}FP (+${City.fpProductionBoost}% Boost = ${City.ForgePoints}FP)</strong>`;
        fpSpan.setAttribute('data-bs-content', tooltipHTML.fp);
        const popover = Popover.getInstance(fpSpan);
        if (popover) {
          popover.setContent({ '.popover-body': tooltipHTML.fp });
        }
      }
    }
  }
  if (clanGoodsBuildings.length > 0) {
    const boostedClanGoods = buildClanGoodsData();
    if (lastStartupContext) {
      lastStartupContext.clanGoods = boostedClanGoods;
      if (!lastStartupContext.tooltipHTML) lastStartupContext.tooltipHTML = {};
      lastStartupContext.tooltipHTML.clanGoods = tooltipHTML.clanGoods;
    }
    const clanSpan = document.getElementById('clanGoods');
    if (clanSpan) {
      clanSpan.innerHTML = `<span data-i18n="guildgoods">Guild Goods</span>: ${boostedClanGoods}`;
      clanSpan.setAttribute('data-bs-content', tooltipHTML.clanGoods);
    }
  }
  renderLiveCityStats();
}

function fCFname() {
  if (helper.fGBname('X_ProgressiveEra_Landmark2')) {
    var nameArray = helper.fGBname('X_ProgressiveEra_Landmark2').split(' ');
    if (nameArray[0] == 'Chateau' || nameArray[0] == 'Château')
      return nameArray[0];
    else if (nameArray[1] == 'Frontenac') return nameArray[1];
    else return helper.fGBname('X_ProgressiveEra_Landmark2');
  } else return 'Chateau';
}

export function fArcname() {
  if (helper.fGBname('X_FutureEra_Landmark1')) {
    if (helper.fGBname('X_FutureEra_Landmark1') == 'The Arc') return 'Arc';
    else return helper.fGBname('X_FutureEra_Landmark1');
  } else return 'Arc';
}

export { showGalaxy, updateGalaxy };

function fGenericRewardUnits(reward) {
  if (!reward) return 0;
  const rewards =
    reward.rewards ||
    reward.contents ||
    reward.array ||
    (reward.genericReward ? reward.genericReward.rewards : []);
  let units = 0;
  if (Array.isArray(rewards)) {
    rewards.forEach((entry) => {
      const probability =
        (entry.probability ?? entry.weight ?? 100) /
        (entry.probability && entry.probability > 1 ? 100 : 100);
      const r = entry.reward || entry.genericReward || entry;
      if (r.type === 'unit') {
        units += (r.amount || 0) * probability;
      } else if (r.type === 'genericReward') {
        units += probability * fGenericRewardUnits(r);
      }
    });
  }
  return units;
}

function fEntityName(entity) {
  const def = helper.getCityEntityDef(entity);
  return def && def.name ? def.name : entity;
}

export function renderBuildingCollectionTimes(options = {}) {
  return renderBuildingCollectionTimesUI({
    buildingsReady: options.buildingsReady || buildingsReady,
    epocTime: options.epocTime ?? EpocTime,
    showOptions,
    helper,
    element,
    collapse,
    formatDateTime,
    ...options,
  });
}

let metadataRenderTimer = null;
if (metadataStore && typeof metadataStore.subscribe === 'function') {
  metadataStore.subscribe((event) => {
    if (metadataRenderTimer) return;
    metadataRenderTimer = setTimeout(() => {
      metadataRenderTimer = null;
      if (isDebugEnabled())
        logger.info(
          `[TIMING:P6s] metadata subscription render timer fired | t = ${performance.now().toFixed(2)}ms | run = ${startupTimingRun}`,
        );
      try {
        renderBuildingCollectionTimes();
      } catch (err) {
        console.error(
          '[FoEInfo] Failed to re-render building collection times:',
          err,
        );
      }
      try {
        showGalaxy();
      } catch (err) {
        console.error('[FoEInfo] Failed to re-render galaxy:', err);
      }
      try {
        renderLiveCityStats();
      } catch (err) {
        console.error('[FoEInfo] Failed to re-render city stats:', err);
      }
    }, 50);
  });
}
