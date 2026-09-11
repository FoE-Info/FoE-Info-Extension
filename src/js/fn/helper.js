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
import browser from 'webextension-polyfill';
import { metadataStore } from '../state/MetadataStore.js';
import * as element from '../ui/AddElement.js';
import { showOptions } from '../vars/showOptions.js';
import {
  battlegroundDIV,
  BattlegroundPerformance,
  BGtime,
  BuildingEntityLookup,
  CityEntityDefs,
  donationDIV,
  GameOrigin,
  Goods,
  GuildMembers,
  url,
} from '../vars/state.js';
import * as collapse from './collapse.js';
import * as copy from './copy.js';
import { setBattlegroundSize, toolOptions } from './globals.js';
import { translateContainer as nativeTranslateContainer } from './i18n.js';
import * as post_webstore from './post.js';
import * as storage from './storage.js';

export {
  escapeHTML,
  formatEntityId,
  fResourceShortName,
  fRewardShortName,
} from '../utils/formatters.js';

export {
  fIncidentName,
  fShowIncidents,
  renderIncidentsPanel,
} from '../ui/incidentsPanel.js';

var heightGBG = toolOptions.battlegroundsSize;
let gbgResizeObserver = null;
export var MyGuildPermissions = 0;

export function translateContainer(container = document.body) {
  nativeTranslateContainer(container);
}

function setHeight() {
  // console.debug('mouseup', heightGBG);
  setBattlegroundSize(heightGBG);
}

export function fGBsname(city_entity) {
  if (city_entity == 'Castel del Monte') {
    return 'CdM';
  } else if (city_entity == 'Innovation Tower') {
    return 'Inno';
  } else if (city_entity == 'Alcatraz') {
    return 'Traz';
  } else if (city_entity == 'Ch\u00e2teau Frontenac') {
    return 'CF';
  } else if (city_entity == 'The Arc') {
    return 'Arc';
  } else if (city_entity == 'Cape Canaveral') {
    return 'Cape';
  } else if (city_entity == 'Hagia Sophia') {
    return 'Hagia';
  } else if (city_entity == 'Arctic Orangery') {
    return 'AO';
  } else if (city_entity == 'The Kraken') {
    return 'Kraken';
  } else if (city_entity == 'Statue of Zeus') {
    return 'Zeus';
  } else if (city_entity == 'Cathedral of Aachen') {
    return 'CoA';
  } else if (city_entity == "St. Mark's Basilica") {
    return 'SMB';
  } else if (city_entity == 'Temple of Relics') {
    return 'ToR';
  } else if (city_entity == 'The Blue Galaxy') {
    return 'Galaxy';
  } else if (city_entity == 'Terracotta Army') {
    return 'Army';
  } else if (city_entity == 'Observatory') {
    return 'Obs';
  } else if (city_entity == 'Rain Forest Project') {
    return 'RF';
  } else if (city_entity == 'Royal Albert Hall') {
    return 'RAH';
  } else if (city_entity == 'Lighthouse of Alexandria') {
    return 'LoA';
  } else if (city_entity == 'Truce Tower') {
    return 'Truce';
  } else if (city_entity == 'Frauenkirche of Dresden') {
    return 'FoD';
  } else if (city_entity == "Saint Basil's Cathedral") {
    return 'Basils';
  } else if (city_entity == 'Atlantis Museum') {
    return 'Atlantis';
  } else if (city_entity == 'Tower of Babel') {
    return 'Babel';
  } else if (city_entity == 'Deal Castle') {
    return 'Deal';
  } else if (city_entity == 'Himeji Castle') {
    return 'Himeji';
  } else if (city_entity == 'Star Gazer') {
    return 'Gazer';
  } else if (city_entity == 'The Virgo Project') {
    return 'Virgo';
  } else if (city_entity == 'Seed Vault') {
    return 'Seed';
  } else if (city_entity == 'Space Carrier') {
    return 'SC';
  } else if (city_entity == 'The Habitat') {
    return 'Hab';
  } else if (city_entity == 'Gaea Statue') {
    return 'Gaea';
  } else if (city_entity == 'Galata Tower') {
    return 'Galata';
  } else if (city_entity == 'Flying Island') {
    return 'Flying';
  } else if (city_entity == 'A.I Core') {
    return 'AI';
  } else if (city_entity == 'Saturn VI Gate CENTAURUS') {
    return 'Centaurus';
  } else if (city_entity == 'Saturn VI Gate PEGASUS') {
    return 'Pegasus';
  } else if (city_entity == 'Saturn VI Gate HYDRA') {
    return 'Hydra';
  } else if (city_entity == 'Stellar Warship') {
    return 'SW';
  } else if (city_entity == 'Cosmic Catalyst') {
    return 'CC';
  }

  return city_entity.slice(0, 10);
}

export function getCityEntityDef(id) {
  if (!id) return null;
  let rawId = id;
  if (typeof id === 'object') {
    rawId = id.value || id.id || id.identifier || String(id);
  }
  if (!rawId) return null;

  const strId = String(rawId);
  const cleanId = strId
    .replace(/^building_entity_/, '')
    .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
    .replace(/^(MultiAge_|AllAge_)/, '');

  const candidates = [
    strId,
    `building_entity_${strId}`,
    cleanId,
    `building_entity_${cleanId}`,
    `W_MultiAge_${cleanId}`,
    `building_entity_W_MultiAge_${cleanId}`,
    `R_MultiAge_${cleanId}`,
    `L_MultiAge_${cleanId}`,
    `X_MultiAge_${cleanId}`,
    `M_MultiAge_${cleanId}`,
    `M_AllAge_${cleanId}`,
  ];

  for (const key of candidates) {
    const def = CityEntityDefs[key];
    if (def) {
      const entityName = def.name || def.Name || def.title;
      if (entityName) {
        metadataStore.reportEntityLookup(strId, def);
        return { ...def, name: entityName };
      }
    }
  }

  if (metadataStore && typeof metadataStore.getEntity === 'function') {
    for (const key of candidates) {
      const meta = metadataStore.peekEntity(key);
      if (meta) {
        const entityName = meta.name || meta.Name || meta.title;
        if (entityName) {
          metadataStore.reportEntityLookup(strId, meta);
          return { ...meta, name: entityName };
        }
      }
    }
  }

  const gbName = fGBname(strId, false) || fGBname(cleanId, false);
  if (gbName && gbName !== strId && gbName !== cleanId) {
    metadataStore.reportEntityLookup(strId, true);
    return { id: strId, name: gbName };
  }

  metadataStore.reportEntityLookup(strId, false);
  return null;
}

export function fEntityNameTrim(name) {
  if (!name) return '';
  var raw = String(name);
  if (typeof name === 'object') {
    raw = name.value || name.id || name.identifier || String(name);
  }

  const def = getCityEntityDef(raw);
  if (def && def.name) {
    var trimName = def.name;
    if (trimName.includes(' - Lv.'))
      return trimName.substring(0, trimName.indexOf(' - Lv.'));
    else if (trimName.includes('Lv. 2 - '))
      return trimName.replace('Lv. 2 - ', '');
    else if (trimName.includes('Lv. 1 - '))
      return trimName.replace('Lv. 1 - ', '');
    else return trimName;
  }

  const gbName = fGBname(raw);
  if (gbName && gbName !== raw) {
    return gbName;
  }

  const metadata = metadataStore?.getEntity?.(raw);
  const metadataName = metadata?.name || metadata?.Name || metadata?.title;
  if (metadataName) {
    if (metadataName.includes(' - Lv.'))
      return metadataName.substring(0, metadataName.indexOf(' - Lv.'));
    else if (metadataName.includes('Lv. 2 - '))
      return metadataName.replace('Lv. 2 - ', '');
    else if (metadataName.includes('Lv. 1 - '))
      return metadataName.replace('Lv. 1 - ', '');
    return metadataName;
  }

  return raw;
}

export function fGBname(city_entity, reportLookup = true) {
  if (!city_entity) return '';
  var GB_name = String(city_entity);
  const cleanId = GB_name.replace(/^building_entity_/, '').replace(
    /^[WXRLM]_(MultiAge|AllAge|[A-Za-z0-9]+)_/,
    '',
  );

  const candidates = [
    GB_name,
    cleanId,
    `X_AllAge_${cleanId}`,
    `X_MultiAge_${cleanId}`,
    `W_MultiAge_${cleanId}`,
    `R_MultiAge_${cleanId}`,
    `M_AllAge_${cleanId}`,
    `M_MultiAge_${cleanId}`,
  ];
  for (const key of candidates) {
    const def = CityEntityDefs[key];
    if (def) {
      const name = def.name || def.Name || def.title;
      if (name) {
        if (reportLookup)
          metadataStore.reportEntityLookup(String(city_entity), def);
        return name;
      }
    }
  }
  // console.debug(city_entity,CityEntityDefs);

  if (GB_name == 'X_AllAge_EasterBonus4') GB_name = 'Observatory';
  else if (GB_name == 'X_AllAge_Expedition') GB_name = 'Temple of Relics';
  else if (GB_name == 'X_AllAge_Oracle') GB_name = 'Oracle of Delphi';
  else if (GB_name == 'X_AllAge_Galata') GB_name = 'Galata Tower';
  else if (GB_name == 'X_BronzeAge_Landmark1') GB_name = 'Tower of Babel';
  else if (GB_name == 'X_BronzeAge_Landmark2') GB_name = 'Statue of Zeus';
  else if (GB_name == 'X_IronAge_Landmark1') GB_name = 'Colosseum';
  else if (GB_name == 'X_IronAge_Landmark2')
    GB_name = 'Lighthouse of Alexandria';
  else if (GB_name == 'X_EarlyMiddleAge_Landmark1') GB_name = 'Hagia Sophia';
  else if (GB_name == 'X_EarlyMiddleAge_Landmark2')
    GB_name = 'Cathedral of Aachen';
  else if (GB_name == 'X_EarlyMiddleAge_Landmark3') GB_name = 'Galata Tower';
  else if (GB_name == 'X_HighMiddleAge_Landmark1')
    GB_name = "St. Mark's Basilica";
  else if (GB_name == 'X_HighMiddleAge_Landmark3') GB_name = 'Notre Dame';
  else if (GB_name == 'X_LateMiddleAge_Landmark1')
    GB_name = "St. Basil's Cathedral";
  else if (GB_name == 'X_LateMiddleAge_Landmark3') GB_name = 'Castel del Monte';
  else if (GB_name == 'X_ColonialAge_Landmark1')
    GB_name = 'Frauenkirche of Dresden';
  else if (GB_name == 'X_ColonialAge_Landmark2') GB_name = 'Deal Castle';
  else if (GB_name == 'X_IndustrialAge_Landmark1')
    GB_name = 'Royal Albert Hall';
  else if (GB_name == 'X_IndustrialAge_Landmark2') GB_name = 'Capitol';
  else if (GB_name == 'X_ProgressiveEra_Landmark1') GB_name = 'Alcatraz';
  else if (GB_name == 'X_ProgressiveEra_Landmark2')
    GB_name = 'Ch\u00e2teau Frontenac';
  else if (GB_name == 'X_ModernEra_Landmark1') GB_name = 'Space Needle';
  else if (GB_name == 'X_ModernEra_Landmark2') GB_name = 'Atomium';
  else if (GB_name == 'X_PostModernEra_Landmark1') GB_name = 'Cape Canaveral';
  else if (GB_name == 'X_PostModernEra_Landmark2') GB_name = 'The Habitat';
  else if (GB_name == 'X_ContemporaryEra_Landmark1') GB_name = 'Lotus Temple';
  else if (GB_name == 'X_ContemporaryEra_Landmark2')
    GB_name = 'Innovation Tower';
  else if (GB_name == 'X_TomorrowEra_Landmark1') GB_name = 'Voyager V1';
  else if (GB_name == 'X_TomorrowEra_Landmark2') GB_name = 'Truce Tower';
  else if (GB_name == 'X_FutureEra_Landmark1') GB_name = 'The Arc';
  else if (GB_name == 'X_FutureEra_Landmark2') GB_name = 'Rain Forest Project';
  else if (GB_name == 'X_ArcticFuture_Landmark1') GB_name = 'Gaea Statue';
  else if (GB_name == 'X_ArcticFuture_Landmark2') GB_name = 'Arctic Orangery';
  else if (GB_name == 'X_ArcticFuture_Landmark3') GB_name = 'Seed Vault';
  else if (GB_name == 'X_OceanicFuture_Landmark1') GB_name = 'Atlantis Museum';
  else if (GB_name == 'X_OceanicFuture_Landmark2') GB_name = 'The Kraken';
  else if (GB_name == 'X_OceanicFuture_Landmark3') GB_name = 'The Blue Galaxy';
  else if (GB_name == 'X_VirtualFuture_Landmark1') GB_name = 'Terracotta Army';
  else if (GB_name == 'X_VirtualFuture_Landmark2') GB_name = 'Himeji Castle';
  else if (GB_name == 'X_SpaceAgeMars_Landmark1') GB_name = 'Star Gazer';
  else if (GB_name == 'X_SpaceAgeMars_Landmark2') GB_name = 'The Virgo Project';
  else if (GB_name == 'X_SpaceAgeAsteroidBelt_Landmark1')
    GB_name = 'Space Carrier';
  else if (GB_name == 'X_SpaceAgeVenus_Landmark1') GB_name = 'Flying Island';
  else if (GB_name == 'X_SpaceAgeJupiterMoon_Landmark1') GB_name = 'A.I. Core';
  else if (GB_name == 'X_SpaceAgeTitan_Landmark1')
    GB_name = 'Saturn VI Gate CENTAURUS';
  else if (GB_name == 'X_SpaceAgeTitan_Landmark2')
    GB_name = 'Saturn VI Gate PEGASUS';
  else if (GB_name == 'X_SpaceAgeTitan_Landmark3')
    GB_name = 'Saturn VI Gate HYDRA';
  else if (GB_name == 'X_SpaceAgeSpaceHub_Landmark1')
    GB_name = 'Stellar Warship';
  else if (GB_name == 'X_SpaceAgeSpaceHub_Landmark2')
    GB_name = 'Cosmic Catalyst';
  else if (GB_name == 'X_SpaceAgeDiscovery_Landmark1')
    GB_name = 'Space Age Discovery Landmark 1';
  else if (GB_name == 'X_SpaceAgeDiscovery_Landmark2')
    GB_name = 'Space Age Discovery Landmark 2';
  // console.debug(city_entity,CityEntityDefs);
  if (reportLookup)
    metadataStore.reportEntityLookup(
      String(city_entity),
      GB_name !== String(city_entity),
    );
  return GB_name;
}

export function fLevelfromAge(age) {
  if (age == 'BronzeAge') {
    return 1;
  } else if (age == 'IronAge') {
    return 2;
  } else if (age == 'EarlyMiddleAge') {
    return 3;
  } else if (age == 'HighMiddleAge') {
    return 4;
  } else if (age == 'LateMiddleAge') {
    return 5;
  } else if (age == 'ColonialAge') {
    return 6;
  } else if (age == 'IndustrialAge') {
    return 7;
  } else if (age == 'ProgressiveEra') {
    return 8;
  } else if (age == 'ModernEra') {
    return 9;
  } else if (age == 'PostModernEra') {
    return 10;
  } else if (age == 'ContemporaryEra') {
    return 11;
  } else if (age == 'TomorrowEra') {
    return 12;
  } else if (age == 'FutureEra') {
    return 13;
  } else if (age == 'ArcticFuture') {
    return 14;
  } else if (age == 'OceanicFuture') {
    return 15;
  } else if (age == 'VirtualFuture') {
    return 16;
  } else if (age == 'SpaceAgeMars') {
    return 17;
  } else if (age == 'SpaceAgeAsteroidBelt') {
    return 18;
  } else if (age == 'SpaceAgeVenus') {
    return 19;
  } else if (age == 'SpaceAgeJupiterMoon') {
    return 20;
  } else if (age == 'SpaceAgeTitan') {
    return 21;
  } else if (age == 'SpaceAgeSpaceHub') {
    return 22;
  } else if (age == 'StellarAgeDiscovery' || age == 'SpaceAgeDiscovery') {
    return 23;
  }
  // else if (age =="AllAge")
  // {
  // 	name = "AA";
  // }
  return -1;
}

// number of numAges
// added SAV - 19 ages
// added SAJM - 20 ages
// added SAT - 21 ages
// added SASH - 22 ages
// added SAD - 23 ages
export const numAges = 23;

export function fAgefromLevel(level) {
  if (level == 1) {
    return 'BronzeAge';
  } else if (level == 2) {
    return 'IronAge';
  } else if (level == 3) {
    return 'EarlyMiddleAge';
  } else if (level == 4) {
    return 'HighMiddleAge';
  } else if (level == 5) {
    return 'LateMiddleAge';
  } else if (level == 6) {
    return 'ColonialAge';
  } else if (level == 7) {
    return 'IndustrialAge';
  } else if (level == 8) {
    return 'ProgressiveEra';
  } else if (level == 9) {
    return 'ModernEra';
  } else if (level == 10) {
    return 'PostModernEra';
  } else if (level == 11) {
    return 'ContemporaryEra';
  } else if (level == 12) {
    return 'TomorrowEra';
  } else if (level == 13) {
    return 'FutureEra';
  } else if (level == 14) {
    return 'ArcticFuture';
  } else if (level == 15) {
    return 'OceanicFuture';
  } else if (level == 16) {
    return 'VirtualFuture';
  } else if (level == 17) {
    return 'SpaceAgeMars';
  } else if (level == 18) {
    return 'SpaceAgeAsteroidBelt';
  } else if (level == 19) {
    return 'SpaceAgeVenus';
  } else if (level == 20) {
    return 'SpaceAgeJupiterMoon';
  } else if (level == 21) {
    return 'SpaceAgeTitan';
  } else if (level == 22) {
    return 'SpaceAgeSpaceHub';
  } else if (level == 23) {
    return 'StellarAgeDiscovery';
  }
  // else if (age =="AllAge")
  // {
  // 	name = "AA";
  // }
  return -1;
}

export function fEraAbbreviation(age) {
  var name = age;

  if (age == 'BronzeAge') {
    name = 'BA';
  } else if (age == 'IronAge') {
    name = 'IA';
  } else if (age == 'EarlyMiddleAge') {
    name = 'EMA';
  } else if (age == 'HighMiddleAge') {
    name = 'HMA';
  } else if (age == 'LateMiddleAge') {
    name = 'LMA';
  } else if (age == 'ColonialAge') {
    name = 'CA';
  } else if (age == 'IndustrialAge') {
    name = 'InA';
  } else if (age == 'ProgressiveEra') {
    name = 'PE';
  } else if (age == 'ModernEra') {
    name = 'ME';
  } else if (age == 'PostModernEra') {
    name = 'PME';
  } else if (age == 'ContemporaryEra') {
    name = 'CE';
  } else if (age == 'TomorrowEra') {
    name = 'TE';
  } else if (age == 'FutureEra') {
    name = 'FE';
  } else if (age == 'ArcticFuture') {
    name = 'AF';
  } else if (age == 'OceanicFuture') {
    name = 'OF';
  } else if (age == 'VirtualFuture') {
    name = 'VF';
  } else if (age == 'SpaceAgeMars') {
    name = 'SAM';
  } else if (age == 'SpaceAgeAsteroidBelt') {
    name = 'SAAB';
  } else if (age == 'SpaceAgeVenus') {
    name = 'SAV';
  } else if (age == 'SpaceAgeJupiterMoon') {
    name = 'SAJM';
  } else if (age === 'SpaceAgeTitan') {
    name = 'SAT';
  } else if (age === 'SpaceAgeSpaceHub') {
    name = 'SASH';
  } else if (age === 'StellarAgeDiscovery' || age === 'SpaceAgeDiscovery') {
    name = 'SAD';
  } else if (age == 'AllAge') {
    name = 'AA';
  }
  return name;
}
export const fGVGagesname = fEraAbbreviation;

export function fGoodsTally(age, good) {
  // console.debug(age,good);
  if (age == 'BronzeAge') Goods.ba += good;
  else if (age == 'IronAge') Goods.ia += good;
  else if (age == 'EarlyMiddleAge') Goods.ema += good;
  else if (age == 'HighMiddleAge') Goods.hma += good;
  else if (age == 'LateMiddleAge') Goods.lma += good;
  else if (age == 'ColonialAge') Goods.cma += good;
  else if (age == 'IndustrialAge') Goods.ina += good;
  else if (age == 'ProgressiveEra') Goods.pe += good;
  else if (age == 'ModernEra') Goods.me += good;
  else if (age == 'PostModernEra') Goods.pme += good;
  else if (age == 'ContemporaryEra') Goods.ce += good;
  else if (age == 'TomorrowEra') Goods.te += good;
  else if (age == 'FutureEra') Goods.fe += good;
  else if (age == 'ArcticFuture') Goods.af += good;
  else if (age == 'OceanicFuture') Goods.of += good;
  else if (age == 'VirtualFuture') Goods.vf += good;
  else if (age == 'SpaceAgeMars') Goods.sam += good;
  else if (age == 'SpaceAgeAsteroidBelt') Goods.saab += good;
  else if (age == 'SpaceAgeVenus') Goods.sav += good;
  else if (age == 'SpaceAgeJupiterMoon') Goods.sajm += good;
  else if (age == 'SpaceAgeTitan') Goods.sat += good;
  else if (age == 'SpaceAgeSpaceHub') Goods.sash += good;
  else if (age == 'StellarAgeDiscovery') Goods.sad += good;
  else if (age == 'NoAge') Goods.noage += good;
  // else console.debug(age, good);
}

export function fHideTooltips() {}

export function fshowBattlegroundChanges() {
  showOptions.showBattlegroundChanges = !showOptions.showBattlegroundChanges;
  storage.set('showOptions', showOptions);
  // console.debug(BattlegroundPerformance);
  fshowBattleground();
  // console.debug('fshowBattlegroundChanges',showOptions.showBattlegroundChanges);
}

export function fshowBattleground() {
  // console.debug(data,BattlegroundPerformance);
  const bgWorldMatch =
    GameOrigin ?
      GameOrigin.match(/^https?:\/\/([a-z0-9]+)\.forgeofempires\.com/i)
    : null;
  const bgWorldLabel =
    bgWorldMatch ?
      bgWorldMatch[1].toUpperCase()
    : (GameOrigin || 'en7')
        .replace(/https?:\/\//i, '')
        .replace(/\.forgeofempires\.com/i, '')
        .toUpperCase();
  var battlegroundHTML = `<div class="alert alert-info alert-dismissible show collapsed" role="alert">
	<p id="battlegroundTextLabel">
	${element.icon('battlegroundicon', 'battlegroundCollapse', collapse.collapseBattleground)}
	<strong>Battlegrounds: [${bgWorldLabel}]</strong></p>${element.close()}`;

  if (url.sheetGuildURL)
    battlegroundHTML += element.post(
      'battlegroundPostID',
      'info',
      'mid',
      collapse.collapseBattleground,
    );
  battlegroundHTML += element.copy(
    'battlegroundCopyID',
    'info',
    'right',
    collapse.collapseBattleground,
  );
  battlegroundHTML += `<div id="battlegroundCollapse" class="alert-info overflow resize-both collapse ${
    collapse.collapseBattleground ? '' : 'show'
  }"><div id="battlegroundText">`;

  battlegroundHTML += `<p class="showGBGchanges"><input type="checkbox" id="showGBGchanges"><label for="showGBGchanges">show changes only</label></p>
	${BGtime ? '<p>Last Saved: ' + BGtime + '</p>' : ''}
	<div><table id="gbg-table" class="gbg-table"><tr><th>Member</th><th>Negs</th><th>Fights</th><th>Attrition</th></tr>`;
  BattlegroundPerformance.forEach((entry) => {
    // console.debug(entry);
    var wonNegotiations = 0;
    var wonBattles = 0;
    var battleDiff = 0;
    var negotiationsDiff = 0;
    var attrition = 0;
    var attritionDiff = 0;
    if (entry.wonNegotiations) wonNegotiations = entry.wonNegotiations;
    if (entry.wonBattles) wonBattles = entry.wonBattles;
    if (entry.attrition) attrition = entry.attrition;

    // console.debug(playerInfo);
    // console.debug(entry.player.name,BattlegroundPerformance);

    // console.debug(BattlegroundPerformance.indexOf(entry.player.name),entry.player.name);

    // console.debug('GuildMembers',entry.player.name,BattlegroundPerformance[BattlegroundPerformance.indexOf(entry.player.name)],GuildMembers[entry.player.name],GuildMembers[entry.player.name].wonBattles);
    // if(GuildMembers[entry.player.name]){
    var player = GuildMembers.find((id) => id.name == entry.name);
    // console.debug(player);
    battleDiff = wonBattles - player.wonBattles;
    negotiationsDiff = wonNegotiations - player.wonNegotiations;
    attritionDiff = attrition - player.attrition;
    // }
    // console.debug(entry.name,battleDiff,negotiationsDiff);
    if (
      !showOptions.showBattlegroundChanges ||
      battleDiff ||
      negotiationsDiff ||
      attritionDiff
    ) {
      battlegroundHTML += `<tr><td>${entry.name}</td><td>${wonNegotiations}`;
      if (negotiationsDiff)
        battlegroundHTML += ` <span class="red">+${negotiationsDiff}</span>`;
      battlegroundHTML += `</td><td>${wonBattles}`;
      if (battleDiff)
        battlegroundHTML += ` <span class="red">+${battleDiff}</span>`;
      battlegroundHTML += `</td><td>${attrition}`;
      if (attritionDiff)
        battlegroundHTML += ` <span class="red">+${attritionDiff}</span>`;
      battlegroundHTML += `</td></tr>`;
    }
  });

  // GuildMembers[entry.player.name] = BattlegroundPerformance[entry.player.name];
  // localStorage.setItem(entry.player.name,JSON.stringify({'wonNegotiations': wonNegotiations,'wonBattles': wonBattles}));
  // storage.set(entry.player.name,BattlegroundPerformance[entry.player.name]);
  // browser.storage.local.set(entry.player.name,{'wonNegotiations': wonNegotiations,'wonBattles': wonBattles});
  // console.debug(entry.player.name,BattlegroundPerformance[entry.player.name],GuildMembers[entry.player.name]);
  // console.debug(data);
  // storage.set(GameOrigin,data);

  {
    /* donationDIV.innerHTML = battlegroundHTML + `</table></div><p class="showGBGchanges"><input type="checkbox" id="showGBGchanges" value="${showOptions.showBattlegroundChanges}"/> <label for="showGBGchanges">show changes only</label></p></div>`; */
  }
  const targetEl =
    (typeof document !== 'undefined' &&
      document.getElementById('battleground')) ||
    battlegroundDIV ||
    donationDIV;
  if (targetEl) {
    targetEl.innerHTML = battlegroundHTML + `</table></div></div></div></div>`;
  }

  const postEl = document.getElementById('battlegroundPostID');
  if (postEl && url.sheetGuildURL) {
    postEl.addEventListener('click', post_webstore.postGBGtoSS);
  }

  const copyEl = document.getElementById('battlegroundCopyID');
  if (copyEl) {
    copyEl.addEventListener('click', copy.BattlegroundCopy);
  }

  const iconEl = document.getElementById('battlegroundicon');
  if (iconEl) {
    iconEl.addEventListener('click', collapse.fCollapseBattleground);
  }

  const showChangesEl = document.getElementById('showGBGchanges');
  if (showChangesEl) {
    showChangesEl.addEventListener('click', fshowBattlegroundChanges);
    showChangesEl.checked = showOptions.showBattlegroundChanges;
  }

  const battlegroundDiv = document.getElementById('battlegroundCollapse');
  if (battlegroundDiv) {
    battlegroundDiv.addEventListener('mouseup', setHeight);
    if (gbgResizeObserver) {
      gbgResizeObserver.disconnect();
    }
    if (typeof ResizeObserver !== 'undefined') {
      gbgResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            heightGBG = entry.contentRect.height;
        }
      });
      gbgResizeObserver.observe(battlegroundDiv);
    }
    const currentHeight = battlegroundDiv.clientHeight;
    if (currentHeight > toolOptions.battlegroundsSize) {
      battlegroundDiv.style.height = `${toolOptions.battlegroundsSize}px`;
    }
  }

  if (targetEl) {
    translateContainer(targetEl);
  }
}

export function checkGBG() {
  if (MyGuildPermissions & 64 && url.discordTargetURL) return true;
  else if (DEV) return true;
  else return false;
}

export function setMyGuildPermissions(permissions) {
  MyGuildPermissions = permissions;
}

// export function getKey(text){
// 	var key = crypto.createCipher('aes-128-cbc', salt);
// 	var str = key.update(text, 'utf8', 'hex')
// 	str += key.final('hex');
// 	return str;
// }
