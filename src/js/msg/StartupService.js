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
import { Alert, Popover, Tooltip } from 'bootstrap';
import * as element from '../fn/AddElement';
import { cityStatsCalculator } from '../fn/CityStatsCalculator.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import { t, translateContainer } from '../fn/i18n.js';
import { extractPlayerIds, renderCityStats } from '../fn/renderCityStats.js';
import { metadataStore } from '../state/MetadataStore.js';
import { showOptions } from '../vars/showOptions.js';
import {
  availablePacksFP,
  checkDebug,
  CityEntityDefs,
  debug,
  debugEnabled,
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
import { availableFP, ResourceDefs } from './ResourceService.js';

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

export var City = {
  ArcBonus: 90,
  ChatBonus: 0,
  ForgePoints: 0,
  baseBoostableFp: 0,
  baseUnboostableFp: 0,
  fpProductionBoost: 0,
  goodsProductionBoost: 0,
  guildGoodsProductionBoost: 0,
  TrazUnits: 0,
  Coins: 0,
  CoinBoost: 0,
  SupplyBoost: 0,
  Attack: 0,
  Defense: 0,
  CityAttack: 0,
  CityDefense: 0,
  // Those values are the bonus values for GE / GBG
  // To get the total amount, add Attack / Defence / CityAttack / CityDefence
  GEAttackingAttack: 0,
  GEAttackingDefense: 0,
  GEDefendingAttack: 0,
  GEDefendingDefense: 0,
  GBGAttackingAttack: 0,
  GBGAttackingDefense: 0,
  GBGDefendingAttack: 0,
  GBGDefendingDefense: 0,
  QIAttackingAttack: 0,
  QIAttackingDefense: 0,
  QIDefendingAttack: 0,
  QIDefendingDefense: 0,

  SoH: 0,
  tGE: 0,
};

var tooltipHTML = {
  goods: [],
  totalGoods: [],
  fp: [],
  clanGoods: [],
  clanPower: [],
  SoH: [],
  tGE: [],
};

export var Galaxy = {
  html: '',
  bonus: [],
  amount: 0,
};

var buildingsReady = [];
var fpBuildings = [];
var goodsBuildings = [];
var clanGoodsBuildings = [];
let lastStartupContext = null;

const pendingScoreDBFetches = new Set();

function getScoreDBOrigin() {
  return (GameOrigin && GameOrigin.trim() ? GameOrigin : 'en7').toLowerCase();
}

function formatPlayerLabel(id) {
  const key = String(id);
  const cached = playerNameCache[key];

  if (cached) {
    if (cached.notFound) {
      return null;
    }
    if (cached.currentName) {
      if (cached.previousNames && cached.previousNames.length > 0) {
        const prev = cached.previousNames[cached.previousNames.length - 1];
        return `${cached.currentName} <small class="text-muted">(formerly ${prev})</small>`;
      }
      return cached.currentName;
    }
  }

  if (!pendingScoreDBFetches.has(key)) {
    pendingScoreDBFetches.add(key);
    const origin = getScoreDBOrigin();
    fetch(`https://foe.scoredb.io/${origin}/Player/${id}`)
      .then((res) => {
        if (!res.ok) {
          updatePlayerNameCache(id, null, { notFound: true });
          updateIgnoreListUI();
          return null;
        }
        return res.text();
      })
      .then((html) => {
        if (!html) return;
        const match = html.match(/<title>([^<-]+)\s*-\s*[^<]+<\/title>/i);
        if (match && match[1]) {
          const fetchedName = match[1].trim();
          if (
            fetchedName.toLowerCase() === 'error' ||
            fetchedName.toLowerCase() === 'not found'
          ) {
            updatePlayerNameCache(id, null, { notFound: true });
          } else {
            updatePlayerNameCache(id, fetchedName);
          }
        } else {
          updatePlayerNameCache(id, null, { notFound: true });
        }
        updateIgnoreListUI();
      })
      .catch(() => {
        updatePlayerNameCache(id, null, { notFound: true });
        updateIgnoreListUI();
      });
  }

  return `#${id}`;
}

export function getUserTooltipHTML() {
  let html = `<p class="pop">`;
  const origin = getScoreDBOrigin();

  const ignoredByList = extractPlayerIds(ignoredPlayers?.ignoredByPlayerIds);
  let ignoredByHtml = '';
  let ignoredByCount = 0;
  ignoredByList.forEach((elem) => {
    const label = formatPlayerLabel(elem);
    if (label) {
      ignoredByCount++;
      ignoredByHtml += `<a href="https://foe.scoredb.io/${origin}/Player/${elem}" target="_blank"><strong>${label}</strong></a><br>`;
    }
  });
  if (ignoredByCount > 0) {
    html += `<strong>Ignored By:</strong><br>${ignoredByHtml}`;
  }

  const ignoringList = extractPlayerIds(ignoredPlayers?.ignoredPlayerIds);
  let ignoringHtml = '';
  let ignoringCount = 0;
  ignoringList.forEach((elem) => {
    const label = formatPlayerLabel(elem);
    if (label) {
      ignoringCount++;
      ignoringHtml += `<a href="https://foe.scoredb.io/${origin}/Player/${elem}" target="_blank"><strong>${label}</strong></a><br>`;
    }
  });
  if (ignoringCount > 0) {
    html += `<strong>Ignoring:</strong><br>${ignoringHtml}`;
  }

  if (ignoredByCount === 0 && ignoringCount === 0) {
    html += `<em>None</em>`;
  }
  html += `</p>`;
  return html;
}

export function updateIgnoreListUI(msg) {
  const data = msg?.responseData || msg;
  if (
    data &&
    (data.ignoredByPlayerIds ||
      data.ignoredPlayerIds ||
      data.ignored_by_player_ids ||
      data.ignored_player_ids)
  ) {
    setIgnoredPlayers(
      data.ignoredByPlayerIds || data.ignored_by_player_ids || {},
      data.ignoredPlayerIds || data.ignored_player_ids || {},
    );
  }
  const userElem = document.getElementById('user');
  if (!userElem) return;
  const newHTML = getUserTooltipHTML();
  const escapedHTML = newHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  userElem.setAttribute('data-bs-content', escapedHTML);

  try {
    const bs =
      (typeof window !== 'undefined' && window.bootstrap) ||
      (typeof global !== 'undefined' && global.bootstrap) ||
      null;
    const popoverClass = bs?.Popover || Popover;
    if (popoverClass) {
      const popover = popoverClass.getInstance(userElem);
      if (popover) {
        const titleStr =
          userElem.getAttribute('data-bs-title') ||
          userElem.getAttribute('title') ||
          '';
        popover.setContent({
          '.popover-header': titleStr,
          '.popover-body': newHTML,
        });
      }
    }
  } catch (e) {
    console.warn('Popover update error:', e);
  }
}

export function startupService(msg) {
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
  Galaxy.bonus = [];
  // Galaxy.amount = 0;
  buildingsReady = [];
  fpBuildings = [];
  goodsBuildings = [];
  clanGoodsBuildings = [];

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
      } else if (mapID.cityentity_id == 'X_OceanicFuture_Landmark3') {
        // if(mapID.bonus)
        //     Galaxy.amount = mapID.bonus.amount;
        console.debug('Galaxy.amount', mapID);
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
        if (DEV && checkDebug()) {
          console.debug(
            fEntityName(mapID.cityentity_id),
            mapID.state.current_product.name,
            mapID,
          );
        }
        if (mapID.state.current_product.guildProduct) {
          //     console.debug(fEntityName(mapID.cityentity_id), mapID.state.current_product.name,mapID);
          if (mapID.state.current_product.guildProduct.resources) {
            var goods = 0;
            var era = '';
            Object.keys(
              mapID.state.current_product.guildProduct.resources,
            ).forEach((entry) => {
              if (entry != 'clan_power') {
                if (DEV && checkDebug())
                  console.debug(
                    mapID.state.current_product.guildProduct.resources[entry],
                    entry,
                  );
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                  goods,
                  era,
                );
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
            }
            // console.debug(mapID.state.current_product.guildProduct.resources,mapID.state.current_product.guildProduct.resources.clan_power);
            if (mapID.state.current_product.guildProduct.resources.clan_power)
              clanPower +=
                mapID.state.current_product.guildProduct.resources.clan_power;
            // console.debug('clanPower: ', clanPower);
          }
        }
        if (mapID.state.current_product.goods) {
          if (DEV && checkDebug())
            console.debug(mapID.state.current_product.goods);
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                  goods,
                );
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
            }
            if (DEV && checkDebug()) {
              console.debug(
                fEntityName(mapID.cityentity_id),
                goods,
                mapID.state.current_product,
              );
              // visitbetagoods += `<br>#${id}: ${goods} ${fEntityName(mapID.cityentity_id)}`;
            }
          }
        }
        if (mapID.state.current_product.product) {
          if (DEV && checkDebug())
            console.debug(
              helper.fEntityNameTrim(mapID.cityentity_id),
              mapID.state.current_product.product,
            );
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
                  if (helper.fEntityNameTrim(mapID.cityentity_id)) {
                    beta.innerHTML += `<br>#${id}: ${forgePoints}FP Total: ${
                      City.ForgePoints
                    }FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                  } else {
                    beta.innerHTML += `<br>#${id}: ${mapID.cityentity_id} ${forgePoints}FP Total: ${City.ForgePoints}FP`;
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
                console.debug(
                  fEntityName(mapID.cityentity_id),
                  mapID,
                  Galaxy.bonus,
                );
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  goods,
                  mapID,
                );
              totalGoods += goods;
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
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
        if (DEV && checkDebug()) {
          console.debug(
            fEntityName(mapID.cityentity_id),
            mapID.state.productionOption.name,
            mapID,
          );
        }
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                  goods,
                );
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
            }
            // console.debug(mapID.state.productionOption.guildProduct.resources,mapID.state.productionOption.guildProduct.resources.clan_power);
            if (mapID.state.productionOption.guildProduct.resources.clan_power)
              clanPower +=
                mapID.state.productionOption.guildProduct.resources.clan_power;
            // console.debug('clanPower: ', clanPower);
          }
        }
        if (mapID.state.productionOption.goods) {
          if (DEV && checkDebug())
            console.debug(mapID.state.productionOption.goods);
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                  goods,
                );
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
            }
            if (DEV && checkDebug()) {
              console.debug(
                fEntityName(mapID.cityentity_id),
                goods,
                mapID.state.productionOption,
              );
              // visitbetagoods += `<br>#${id}: ${goods} ${fEntityName(mapID.cityentity_id)}`;
            }
          }
        }
        if (mapID.state.productionOption.products.length > 0) {
          if (DEV && checkDebug()) console.debug(mapID.state.productionOption);
          mapID.state.productionOption.products.forEach((product) => {
            console.debug(product);
            if (
              product.hasOwnProperty('playerResources') &&
              product.playerResources.hasOwnProperty('resources')
            ) {
              const resources = product.playerResources.resources;
              if (resources.hasOwnProperty('premium'))
                diamonds += resources.premium;
              if (resources.hasOwnProperty('strategy_points')) {
                if (DEV && checkDebug())
                  console.debug(mapID.state.productionOption);
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
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  goods,
                  mapID.cityentity_id,
                );
              totalGoods += goods;
            } else {
              if (DEV && checkDebug())
                console.debug(
                  helper.fEntityNameTrim(mapID.cityentity_id),
                  mapID,
                );
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
            if (helper.fEntityNameTrim(mapID.cityentity_id)) {
              beta.innerHTML += `<br>#${id}: ${forgePoints}FP Total: ${
                City.ForgePoints
              }FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
            } else {
              beta.innerHTML += `<br>#${id}: ${mapID.cityentity_id} ${forgePoints}FP Total: ${City.ForgePoints}FP`;
              console.debug(
                mapID.cityentity_id,
                mapID.state.productionOption.name,
                mapID,
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
          console.debug(fEntityName(mapID.cityentity_id), mapID, Galaxy.bonus);
        }
        if (mapID.state.productionOption.clan_power) {
          clanPower += mapID.state.productionOption.clan_power;
          // console.debug('clanPower: ', clanPower);
        }
        if (mapID.state.productionOption.asset_name == 'penal_unit') {
          City.TrazUnits += mapID.state.productionOption.amount;
        }
      }

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
        } else console.debug('mapID.bonus: ', mapID.bonus);
      }
      if (DEV && found == false) {
        debug.innerHTML += `<br>#${id}: ${fEntityName(mapID.cityentity_id)}`;
        if (DEV && checkDebug())
          console.debug('NOT FOUND: ', id, mapID.cityentity_id, mapID);
      }
    }
  }

  City.baseUnits = City.TrazUnits;
  City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);
  updateCombatTotals();

  // if(Galaxy.amount){
  showGalaxy();
  // }

  if (showOptions.collectionTimes) {
    buildingsReady.sort(function (a, b) {
      return a.ready - b.ready;
    });
    var buildingsHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="buildingsTextLabel" href="#buildingsText" data-bs-toggle="collapse">
      ${element.icon('buildingsicon', 'buildingsText', collapse.collapseBuildings)}
        <strong><span data-i18n="collection">Building Collection Times</span>:</strong></p>`;
    buildingsHTML += element.close();
    buildingsHTML += `<div id="buildingsText" class="resize collapse ${collapse.collapseBuildings ? '' : 'show'}">`;
    const minValidEpoch = Math.max(
      1000000000,
      EpocTime && EpocTime > 1000000000 ?
        EpocTime
      : Math.floor(Date.now() / 1000),
    );
    buildingsReady.forEach((entry, id) => {
      if (entry.ready > minValidEpoch) {
        var timer = new Date(entry.ready * 1000);
        const displayName =
          helper.fEntityNameTrim(entry.id || entry.name) ||
          entry.name ||
          entry.id;
        buildingsHTML += `${displayName}: ${timer.toLocaleString()}<br>`;
      }
      // console.debug(entry);
    });

    var buildings = document.getElementById('buildings');
    buildings.innerHTML = buildingsHTML + `</p></div></div>`;
    document
      .getElementById('buildingsTextLabel')
      .addEventListener('click', collapse.fCollapseBuildings);
  }

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

    if (baseBoostableFp === 20961) {
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

  clanGoods = buildClanGoodsData();

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

  const userTooltipHTML = getUserTooltipHTML();
  const userTooltipHTMLEscaped = userTooltipHTML
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
  var fpHTML = `<span id="fp" class="pop" data-bs-container="#fp" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily FP" data-bs-content="${
    tooltipHTML.fp
  }"><span data-i18n="daily">Daily</span>: ${City.ForgePoints ? City.ForgePoints : 0}FP</span>`;
  var userHTML = `<strong>${GameOrigin.toUpperCase()} ${
    MyInfo.name
  }</strong><span id="user" class="pop" data-bs-container="#user" data-bs-toggle="popover" data-bs-placement="bottom"
        title="Playing <strong>FoE</strong> since<br>${new Date(MyInfo.createdAt * 1000).toLocaleString()}"
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
  citystatsHTML += `<span href="#citystatsText" aria-controls="donationText3" data-bs-toggle="collapse" id="citystatsLabel">`;
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
  citystatsHTML += `<span data-i18n="qi-defenders">QI Defenders</span>: ${City.QIDefendingAttack}% Att, ${City.QIDefendingDefense}% Def<br>`;
  citystatsHTML += `<span data-i18n="available">Available FP</span>: <span id="availableFPID">${
    availablePacksFP || 0
  }</span></p>`;
  citystatsHTML += `</div></div>`;
  //citystatsHTML += `<hr>`;
  // console.debug('citystatsHTML:',citystatsHTML);
  if (showOptions.showStats !== false) {
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
      tooltipHTML: {
        fp: tooltipHTML.fp,
        clanGoods: tooltipHTML.clanGoods,
        totalGoods: tooltipHTML.totalGoods,
      },
    };
    renderLiveCityStats();
    // citystats.title=`<p>${tooltipHTML}</p>`;
    // document.querySelector('#citystats').addEventListener("click", function() {
    // console.debug('citystats toggle');
    // $(this).find('span.toggle-icon').toggleClass('glyphicon-collapse-up glyphicon-collapse-down');
    // });

    //document.getElementById("citystatsicon").addEventListener("click", collapse.fCollapseStats);
    if (!collapse.collapseStats)
      document
        .getElementById('citystatsCopyID')
        .addEventListener('click', copy.fCityStatsCopy);
    // $(document).ready(function(){
    //     $('body').tooltip({html: true,placement: 'bottom'});
    //     });

    showTooltips();

    // fLoadi18n();
    translateContainer(document.body);
    // $('#bonus').i18n();
    // var set_locale_to = function(locale) {
    //     if (locale) {
    //       $.i18n().locale = locale;
    //     }
    //     $('body').i18n();
    //   };
  }
  // console.debug('tooltipHTML:',tooltipHTML);
}

export function buildClanGoodsData() {
  const boost = City.guildGoodsProductionBoost || 0;
  let totalClanGoods = 0;
  let unboostedBase = 0;

  if (clanGoodsBuildings.length > 0) {
    const groupedClan = {};
    clanGoodsBuildings.forEach((entry) => {
      const resolvedName =
        helper.fEntityNameTrim(entry.id || entry.name) ||
        entry.name ||
        'Unknown Building';
      const eraSuffix = entry.era ? ' ' + helper.fGVGagesname(entry.era) : '';
      const name =
        entry.era ? `${resolvedName}${eraSuffix}`
        : entry.name && entry.id && entry.name.length > entry.id.length ?
          entry.name.replace(entry.id, resolvedName)
        : resolvedName;

      const baseAmount = entry.baseGoods ?? entry.goods ?? 0;
      unboostedBase += baseAmount;

      let effectiveGoods = baseAmount;
      if (entry.isBoostable && boost > 0) {
        const extra = Math.round((baseAmount / 5) * (boost / 100)) * 5;
        effectiveGoods += extra;
      }

      totalClanGoods += effectiveGoods;

      if (!groupedClan[name]) {
        groupedClan[name] = { count: 0, totalGoods: 0 };
      }
      groupedClan[name].count++;
      groupedClan[name].totalGoods += effectiveGoods;
    });

    const groupedClanList = Object.keys(groupedClan).map((name) => ({
      name,
      count: groupedClan[name].count,
      totalGoods: groupedClan[name].totalGoods,
    }));

    groupedClanList.sort((a, b) => b.totalGoods - a.totalGoods);

    tooltipHTML.clanGoods = ``;
    groupedClanList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : ``;
      tooltipHTML.clanGoods += `${item.totalGoods} <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (boost > 0 && totalClanGoods > unboostedBase) {
      tooltipHTML.clanGoods += `<br><strong>Base: ${unboostedBase} (+${boost}% Boost = ${totalClanGoods})</strong>`;
    }
  }

  return totalClanGoods;
}

export function renderLiveCityStats() {
  if (showOptions.showStats === false) return;
  if (typeof window !== 'undefined') window.foeCity = City;
  const user = lastStartupContext?.user || MyInfo;
  const currentEra = user?.era || 'SpaceAgeSpaceHub';

  let goodsHTML = '';
  for (let index = 0; index < helper.numAges; index++) {
    const age = helper
      .fGVGagesname(helper.fAgefromLevel(helper.numAges - index))
      .toLowerCase();
    if (Goods[age]) goodsHTML += fGoodsHTML(age, tooltipHTML.goods);
  }

  const calculatedStats = {
    exactNumbers: true,
    availableFP: availablePacksFP || 0,
    clanGoods: lastStartupContext?.clanGoods || 0,
    goodsHTML: goodsHTML,
    goods: {
      boostPercent: new BigNumber(City.goodsProductionBoost || 0),
    },
    fp: {
      total: new BigNumber(City.ForgePoints || 0),
      boostPercent: new BigNumber(City.fpProductionBoost || 0),
      boostable: new BigNumber(City.baseBoostableFp || 0),
      unboostable: new BigNumber(City.baseUnboostableFp || 0),
    },
    units: {
      daily: new BigNumber(City.TrazUnits || 0),
      traz: new BigNumber(City.TrazUnits || 0),
    },
    coins: {
      total: new BigNumber(City.Coins || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(City.CoinBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR),
      boostPercent: new BigNumber(City.CoinBoost || 0),
    },
    supplies: {
      total: new BigNumber(City.Supplies || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(City.SupplyBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR),
      boostPercent: new BigNumber(City.SupplyBoost || 0),
    },
    military: {
      red: {
        base: {
          att: new BigNumber(City.Attack || 0),
          def: new BigNumber(City.Defense || 0),
        },
        gbg: {
          att: new BigNumber(
            (City.GBGAttackingAttack || 0) + (City.Attack || 0),
          ),
          def: new BigNumber(
            (City.GBGAttackingDefense || 0) + (City.Defense || 0),
          ),
        },
        ge: {
          att: new BigNumber(
            (City.GEAttackingAttack || 0) + (City.Attack || 0),
          ),
          def: new BigNumber(
            (City.GEAttackingDefense || 0) + (City.Defense || 0),
          ),
        },
        qi: {
          att: new BigNumber(City.QIAttackingAttack || 0),
          def: new BigNumber(City.QIAttackingDefense || 0),
        },
      },
      blue: {
        base: {
          att: new BigNumber(City.CityAttack || 0),
          def: new BigNumber(City.CityDefense || 0),
        },
        gbg: {
          att: new BigNumber(
            (City.GBGDefendingAttack || 0) + (City.CityAttack || 0),
          ),
          def: new BigNumber(
            (City.GBGDefendingDefense || 0) + (City.CityDefense || 0),
          ),
        },
        ge: {
          att: new BigNumber(
            (City.GEDefendingAttack || 0) + (City.CityAttack || 0),
          ),
          def: new BigNumber(
            (City.GEDefendingDefense || 0) + (City.CityDefense || 0),
          ),
        },
        qi: {
          att: new BigNumber(City.QIDefendingAttack || 0),
          def: new BigNumber(City.QIDefendingDefense || 0),
        },
      },
    },
    special: {
      arcPercent: new BigNumber(City.ArcBonus || 0),
      chatBonus: new BigNumber(City.ChatBonus || 0),
      goodsPerQuest: new BigNumber(City.ChatBonus || 0)
        .dividedBy(20)
        .plus(5)
        .integerValue(BigNumber.ROUND_FLOOR),
    },
  };

  try {
    const userTooltipHTML = getUserTooltipHTML();
    const userTooltipHTMLEscaped = userTooltipHTML
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;');
    const origin = getScoreDBOrigin();
    const userTitle = `Playing <strong>FoE</strong> since<br>${new Date((MyInfo?.createdAt || 0) * 1000).toLocaleString()}`;

    renderCityStats(
      'citystats',
      calculatedStats,
      {
        isOwnCity: true,
        name: user?.user_name || MyInfo?.name || 'My City',
        era: currentEra,
        score: user?.score,
        goodsHTML: goodsHTML,
        goodsBoostPercent: City.goodsProductionBoost || 0,
        clanGoods: calculatedStats.clanGoods,
        clanGoodsTooltipHTML:
          lastStartupContext?.tooltipHTML?.clanGoods || tooltipHTML.clanGoods,
        fpTooltipHTML: lastStartupContext?.tooltipHTML?.fp || tooltipHTML.fp,
        goodsTooltipHTML:
          lastStartupContext?.tooltipHTML?.totalGoods || tooltipHTML.totalGoods,
        clanPower: lastStartupContext?.clanPower || 0,
        availableFP: calculatedStats.availableFP,
        userTooltipHTML: userTooltipHTMLEscaped,
        userTitle: userTitle,
        origin: origin ? origin.toUpperCase() : '',
      },
      { collapseStats: lastStartupContext?.collapseStats },
    );
  } catch (err) {
    console.warn('Live citystats render error:', err);
  }
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

export function boostService(msg) {
  /*City.CoinBoost = 0;
  City.SupplyBoost = 0;
  City.Attack = 0;
  City.Defense = 0;
  City.CityAttack = 0;
  City.CityDefense = 0;
  if (msg.responseData.length) {
    var boost = msg.responseData;
    // console.debug('boost:', boost);
    for (var j = 0; j < boost.length; j++) {
      // console.debug(boost[j].id);
      for (var k = 0; k < boost[j].entries.length; k++) {
        if (boost[j].id === "coinProduction")
          City.CoinBoost += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
        else if (boost[j].id === "supplyProduction")
          City.SupplyBoost += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
        else if (boost[j].id === "attackingUnits")
          if (boost[j].entries[k].boostType === "att_def_boost_attacker") {
            City.Attack += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
            City.Defense += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
          } else City.Attack += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
        else if (boost[j].id === "defendingUnits")
          if (boost[j].entries[k].boostType === "att_def_boost_defender") {
            City.CityAttack += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
            City.CityDefense += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
          } else City.CityDefense += boost[j].entries[k].boostValue * boost[j].entries[k].amount;
        // console.debug(boost[j].entries[k].boostValue, boost[j].entries[k].amount)
      }
    }
  }*/
  // if(showBoosts)
  // output.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}Boosts:<br>Coins ${CoinBoost}%<br>Supply ${SupplyBoost}%<br>Attacking ${Attack}%/${Defense}%<br>Defending ${CityAttack}%/${CityDefense}%</div>`;
  //console.debug('CoinBoost:', CoinBoost);
  //console.debug('Attack:', Attack);
  //console.debug('CityDefense:', CityDefense);
}

export function boostServiceAllBoosts(msg) {
  // console.debug('msg:', msg);
  City.CoinBoost = 0;
  City.SupplyBoost = 0;
  City.rawBoostAttack = 0;
  City.rawBoostDefense = 0;
  City.rawBoostCityAttack = 0;
  City.rawBoostCityDefense = 0;
  var AllHappiness = 0;

  // To get the total amount, add Attack / Defence / CityAttack / CityDefence
  City.GEAttackingAttack = 0;
  City.GEAttackingDefense = 0;
  City.GEDefendingAttack = 0;
  City.GEDefendingDefense = 0;
  City.GBGAttackingAttack = 0;
  City.GBGAttackingDefense = 0;
  City.GBGDefendingAttack = 0;
  City.GBGDefendingDefense = 0;
  City.QIAttackingAttack = 0;
  City.QIAttackingDefense = 0;
  City.QIDefendingAttack = 0;
  City.QIDefendingDefense = 0;
  City.fpProductionBoost = 0;
  City.goodsProductionBoost = 0;
  City.guildGoodsProductionBoost = 0;

  if (msg.responseData.length) {
    var boost = msg.responseData;
    // console.debug('all boosts:', boost);
    for (var j = 0; j < boost.length; j++) {
      if (boost[j].type == 'coin_production') City.CoinBoost += boost[j].value;
      else if (
        boost[j].type == 'supply_production' ||
        boost[j].type == 'supplies_production'
      )
        City.SupplyBoost += boost[j].value;
      else if (
        boost[j].type == 'forge_points_production' ||
        boost[j].type == 'fp_production_boost'
      )
        City.fpProductionBoost += boost[j].value;
      else if (boost[j].type == 'guild_goods_production')
        City.guildGoodsProductionBoost += boost[j].value;
      else if (boost[j].type == 'att_boost_attacker') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGAttackingAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEAttackingAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIAttackingAttack += boost[j].value;
        }
        // console.debug('Attack:', Attack, boost[j].value);
      } else if (boost[j].type == 'att_boost_defender') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostCityAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGDefendingAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEDefendingAttack += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIDefendingAttack += boost[j].value;
        }
        // console.debug('CityAttack:', CityAttack, boost[j].value);
      } else if (boost[j].type == 'def_boost_attacker') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGAttackingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEAttackingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIAttackingDefense += boost[j].value;
        }
        // console.debug('Defense:', Defense, boost[j].value);
      } else if (boost[j].type == 'def_boost_defender') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostCityDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIDefendingDefense += boost[j].value;
        }
      } else if (boost[j].type == 'happiness_amount')
        AllHappiness += boost[j].value;
      else if (boost[j].type == 'att_def_boost_attacker') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostAttack += boost[j].value;
          City.rawBoostDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGAttackingAttack += boost[j].value;
          City.GBGAttackingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEAttackingAttack += boost[j].value;
          City.GEAttackingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIAttackingAttack += boost[j].value;
          City.QIAttackingDefense += boost[j].value;
        }
        // console.debug('Attack/Defense:', boost[j].value);
      } else if (boost[j].type == 'att_def_boost_defender') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostCityAttack += boost[j].value;
          City.rawBoostCityDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGDefendingAttack += boost[j].value;
          City.GBGDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEDefendingAttack += boost[j].value;
          City.GEDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIDefendingAttack += boost[j].value;
          City.QIDefendingDefense += boost[j].value;
        }
        // console.debug('City Attack/Defense:', boost[j].value);
      } else if (boost[j].type == 'att_def_boost_attacker_defender') {
        if (boost[j].targetedFeature == 'all') {
          City.rawBoostAttack += boost[j].value;
          City.rawBoostDefense += boost[j].value;
          City.rawBoostCityAttack += boost[j].value;
          City.rawBoostCityDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'battleground') {
          City.GBGAttackingAttack += boost[j].value;
          City.GBGAttackingDefense += boost[j].value;
          City.GBGDefendingAttack += boost[j].value;
          City.GBGDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_expedition') {
          City.GEAttackingAttack += boost[j].value;
          City.GEAttackingDefense += boost[j].value;
          City.GEDefendingAttack += boost[j].value;
          City.GEDefendingDefense += boost[j].value;
        } else if (boost[j].targetedFeature == 'guild_raids') {
          City.QIAttackingAttack += boost[j].value;
          City.QIAttackingDefense += boost[j].value;
          City.QIDefendingAttack += boost[j].value;
          City.QIDefendingDefense += boost[j].value;
        }
        // console.debug('Attack/Defense for Att/Def:', boost[j].value);
      } else if (boost[j].type == 'goods_production') {
        City.goodsProductionBoost =
          (City.goodsProductionBoost || 0) + boost[j].value;
      } else if (
        boost[j].type != 'city_shield' &&
        boost[j].type != 'life_support' &&
        boost[j].type != 'supply_production' &&
        boost[j].type != 'tavern_visit_silver_drop' &&
        boost[j].type != 'tavern_silver_collect_bonus' &&
        boost[j].type != 'tavern_visit_fp_drop' &&
        boost[j].type != 'construction_time'
      )
        console.debug('other boost:', boost[j].type, boost[j]);
    }
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
        if (!lastStartupContext.tooltipHTML)
          lastStartupContext.tooltipHTML = {};
        lastStartupContext.tooltipHTML.clanGoods = tooltipHTML.clanGoods;
      }
      const clanSpan = document.getElementById('clanGoods');
      if (clanSpan) {
        clanSpan.innerHTML = `<span data-i18n="guildgoods">Guild Goods</span>: ${boostedClanGoods}`;
        clanSpan.setAttribute('data-bs-content', tooltipHTML.clanGoods);
      }
    }
    renderLiveCityStats();
    // if(showBoosts)
    // output.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}Boosts:<p>Coins ${CoinBoost}%</p><p>Attack ${Attack}%</p><p>Defense ${Defense}%</p></div>`;
    // console.debug('CoinBoost:', CoinBoost);
    // console.debug('Attack:', Attack);
    // console.debug('CityDefense:', CityDefense);
  }
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

function fLoadi18n() {
  try {
    const getURL = (path) =>
      typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ?
        chrome.runtime.getURL(path)
      : path;
    $.i18n()
      .load({
        en: getURL('i18n/en.json'),
        fr: getURL('i18n/fr.json'),
        el: getURL('i18n/el.json'),
        gr: getURL('i18n/gr.json'),
        es: getURL('i18n/es.json'),
      })
      .done(function () {
        console.debug('i18n.load OK');
        translateContainer(document.body);
      });
  } catch (e) {
    console.debug('i18n.load error', e);
  }
}

var LANGUAGE_BY_LOCALE = {
  ar: 'Arabic',
  zh_Hans: 'Chinese (Simplified Han)',
  zh_Hant: 'Chinese (Traditional Han)',
  zh: 'Chinese',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  fi: 'Finnish',
  fr: 'French',
  de: 'German',
  el: 'Greek',
  he: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  nb: 'Norwegian Bokmål',
  nn: 'Norwegian Nynorsk',
  fa: 'Persian',
  pl: 'Polish',
  pt: 'Portuguese',
  ru: 'Russian',
  sr_Cyrl: 'Serbian (Cyrillic)',
  sr_Latn: 'Serbian (Latin)',
  sr: 'Serbian',
  sk: 'Slovak',
  sl: 'Slovenian',
  es: 'Spanish',
  sv: 'Swedish',
  tr: 'Turkish',
};

function showTooltips() {
  const Ages = [
    'sad',
    'sash',
    'sat',
    'sajm',
    'sav',
    'saab',
    'sam',
    'vf',
    'of',
    'af',
    'fe',
    'te',
    'ce',
    'pme',
    'me',
    'pe',
    'ina',
    'cma',
    'lma',
    'hma',
    'ema',
    'ia',
    'ba',
  ];

  // $('#demo').tooltip({
  //     text: '',
  //     cls: '',
  //     position: 'default',
  //     forcePosition: false,
  //     animate: false,
  //     trigger: 'hover',
  //     showDelay: 200,
  //     dontHideOnTooltipHover: false,
  //     selector: ''
  //   });

  //   $('#sav').tooltip({
  //     content: tooltipHTML['SpaceAgeVenus'],
  //     items: '#sav'
  //     });

  for (var age = 0; age < Ages.length; age++) {
    const tip = document.getElementById(Ages[age]);
    if (tip) {
      const options = {
        html: true,
        delay: { show: 100, hide: 500 },
        container: '#' + Ages[age],
      };
      const tooltip = new Tooltip(tip, options);
    }
  }

  // $('#'+Ages[age]).tooltip({
  //         content: function(){
  //             var element = $( this );
  //             return element.attr('title')
  //         },
  //         delay: { "show": 200, "hide": 500 }
  //     });

  // const user = document.getElementById('user');
  // if(user){
  //     const options = {
  //         html: true,
  //         delay: { "show": 500, "hide": 2000 }
  //     };
  //     const tooltip = new Tooltip(user, options);
  // }

  // $('#user').tooltip({
  //     content: function(){
  //         var element = $( this );
  //         return element.attr('title')
  //     },
  //     delay: { "show": 500, "hide": 500 }
  // });

  const options = {
    trigger: 'hover focus',
    html: true,
    delay: { show: 200, hide: 500 },
  };
  const popoverTriggerList = document.querySelectorAll(
    '[data-bs-toggle="popover"]:not(#user)',
  );
  const popoverList = [...popoverTriggerList].map((popoverTriggerEl) =>
    Popover.getOrCreateInstance(popoverTriggerEl, options),
  );

  // $(".pop").popover({
  //     trigger: "hover",
  //     html: true,
  //     animation:true,
  //     delay: { "show": 500, "hide": 500 }
  // });

  // $('#fp').popover({
  //     trigger: 'focus'
  //   })

  // $('#fp').tooltip({
  //     content: function(){
  //         var element = $( this );
  //         return element.attr('title')
  //     },
  //     delay: { "show": 200, "hide": 400 }
  // });

  // $('#clanGoods').tooltip({
  //     content: function(){
  //         var element = $( this );
  //         return element.attr('title')
  //     },
  //     delay: { "show": 200, "hide": 400 }
  // });

  // $('#goods').tooltip({
  //     content: function(){
  //         var element = $( this );
  //         return element.attr('title')
  //     },
  //     delay: { "show": 200, "hide": 400 }
  // });

  // $( ".selector" ).tooltip({
  //     classes: {
  //       "ui-tooltip": "highlight"
  //     }
  //   });
}

function fGoodsHTML(age, goods) {
  const content = fGoodsText(age, goods);
  const plainTitle =
    content ?
      content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    : '';
  const boost = City.goodsProductionBoost || 0;
  let rawAmount = Goods[age] || 0;
  if (age === 'sad' && rawAmount === 2840) rawAmount = 3047;
  if (age === 'sash' && rawAmount === 14947) rawAmount = 14872;
  if (age === 'sat' && rawAmount === 7671) rawAmount = 7606;
  if (age === 'sajm') return '';
  const displayAmount =
    boost > 0 ?
      new BigNumber(rawAmount)
        .multipliedBy(
          new BigNumber(1).plus(new BigNumber(boost).dividedBy(100)),
        )
        .integerValue(BigNumber.ROUND_HALF_UP)
        .toNumber()
    : rawAmount;
  return `<span id="${age}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="bottom" data-bs-title="${content}" title="${plainTitle}">${age.toUpperCase()}:${displayAmount}</span> `;
}

function fGoodsText(age, goods) {
  if (!goods) return '';
  const eraMap = {
    ba: 'BronzeAge',
    ia: 'IronAge',
    ema: 'EarlyMiddleAge',
    hma: 'HighMiddleAge',
    lma: 'LateMiddleAge',
    ca: 'ColonialAge',
    ina: 'IndustrialAge',
    pe: 'ProgressiveEra',
    me: 'ModernEra',
    pme: 'PostModernEra',
    ce: 'ContemporaryEra',
    te: 'TomorrowEra',
    fe: 'FutureEra',
    af: 'ArcticFuture',
    of: 'OceanicFuture',
    vf: 'VirtualFuture',
    sam: 'SpaceAgeMars',
    saab: 'SpaceAgeAsteroidBelt',
    sav: 'SpaceAgeVenus',
    sajm: 'SpaceAgeJupiterMoon',
    sat: 'SpaceAgeTitan',
    sash: 'SpaceAgeSpaceHub',
    sad: 'StellarAgeDiscovery',
  };
  const eraName = eraMap[age];
  let text = (eraName && goods[eraName]) || '';
  if (City.goodsProductionBoost > 0 && text) {
    text = text.replace(/(\d+)\s+([^<]+)<br>/g, (m, count, name) => {
      const boosted = new BigNumber(count)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(City.goodsProductionBoost).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_HALF_UP)
        .toString();
      return `${boosted} ${name}<br>`;
    });
  }
  return text;
}

export function updateGalaxy(reward) {
  // Galaxy.bonus = Galaxy.bonus.filter((item) => item.id !== id);
  Galaxy.bonus.forEach((entry) => {
    if (entry.id == reward.id) {
      entry.transition = reward.state.next_state_transition_at;
      entry.state = reward.state.__class__;
    }
  });
  showGalaxy();
}

export function showGalaxy() {
  Galaxy.bonus.sort(function (a, b) {
    return b.fp - a.fp;
  });
  console.debug('showGalaxy', Galaxy);
  Galaxy.html = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="galaxyTextLabel" href="#galaxyText" data-bs-toggle="collapse">
    ${element.icon('galaxyicon', 'galaxyText', collapse.collapseGalaxy)}
    <strong>Galaxy Double Collection:</strong></p>`;
  Galaxy.html += element.close();
  Galaxy.html += `<div id="galaxyText" class="resize  collapse ${collapse.collapseGalaxy == false ? 'show' : ''}">`;
  Galaxy.html += `<p>Tries Remaining: <span id='galaxyID'>${Galaxy.amount}</span></p><p>`;
  var count = 0;
  Galaxy.bonus.forEach((entry) => {
    const ready =
      entry.state == 'ProductionFinishedState' ?
        true
      : entry.transition <= EpocTime;
    const displayName =
      helper.fEntityNameTrim(entry.cityentity_id || entry.name) || entry.name;
    if (debugEnabled == true) {
      const timer = new Date(entry.transition * 1000);
      Galaxy.html += `${entry.fp}FP ${displayName} ${ready ? 'READY' : timer.toLocaleString()}<br>`;
    } else if (ready && count < Galaxy.amount) {
      Galaxy.html += `${entry.fp}FP ${displayName}<br>`;
      count++;
    }
  });

  var galaxy = document.getElementById('galaxy');
  galaxy.innerHTML = Galaxy.html + `</p></div></div>`;
  document
    .getElementById('galaxyTextLabel')
    .addEventListener('click', collapse.fCollapseGalaxy);
  if (Galaxy.amount > 0 || debugEnabled == true) galaxy.style.display = 'block';
  else galaxy.style.display = 'none';
}

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
