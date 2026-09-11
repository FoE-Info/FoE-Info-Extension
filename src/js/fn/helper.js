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
import { fGBname } from '../calc/gbNaming.js';
import { metadataStore } from '../state/MetadataStore.js';
import { fResourceShortName as formattersResourceShortName } from '../utils/formatters.js';
import {
  BuildingEntityLookup,
  CityEntityDefs,
  Goods,
  ResourceNames,
  url,
} from '../vars/state.js';
import { translateContainer as nativeTranslateContainer } from './i18n.js';

export {
  escapeHTML,
  formatEntityId,
  fRewardShortName,
  fRound,
  fNumber,
  fFormatNumber,
  fAgestring,
} from '../utils/formatters.js';

export function fResourceShortName(name, lookup = null) {
  return formattersResourceShortName(name, lookup || ResourceNames);
}

export {
  fshowBattleground,
  fshowBattlegroundChanges,
} from '../ui/renderBattlegroundsPanel.js';

export {
  fIncidentName,
  fShowIncidents,
  renderIncidentsPanel,
} from '../ui/incidentsPanel.js';

export {
  numAges,
  fLevelfromAge,
  fAgefromLevel,
  fGVGagesname,
  fEraAbbreviation,
} from '../calc/eraMapping.js';

export { fGBsname, fGBname, fCFname, fArcname } from '../calc/gbNaming.js';

export var MyGuildPermissions = 0;

export function translateContainer(container = document.body) {
  nativeTranslateContainer(container);
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
