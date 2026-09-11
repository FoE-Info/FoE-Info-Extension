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

let element = null;
let collapse = null;
let globals = null;
let helper = null;
let showOptions = { showArmy: true };
let defaultState = { armyDIV: null, MilitaryDefs: [] };

if (typeof __webpack_require__ !== 'undefined') {
  try {
    element = require('../fn/AddElement');
  } catch {}
  try {
    collapse = require('../fn/collapse.js');
  } catch {}
  try {
    globals = require('../fn/globals.js');
  } catch {}
  try {
    helper = require('../fn/helper.js');
  } catch {}
  try {
    const showOpt = require('../vars/showOptions.js');
    showOptions = showOpt.showOptions || showOpt;
  } catch {}
  try {
    defaultState = require('../vars/state.js');
  } catch {}
}

let metadataStore = null;
try {
  const ms = require('../state/MetadataStore.js');
  metadataStore = ms.metadataStore || ms;
} catch {}

let ArmyUnits = {};
let lastArmyMsg = null;

const ERA_LEVELS = {
  BronzeAge: 1,
  IronAge: 2,
  EarlyMiddleAge: 3,
  HighMiddleAge: 4,
  LateMiddleAge: 5,
  ColonialAge: 6,
  IndustrialAge: 7,
  ProgressiveEra: 8,
  ModernEra: 9,
  PostModernEra: 10,
  ContemporaryEra: 11,
  TomorrowEra: 12,
  FutureEra: 13,
  ArcticFuture: 14,
  OceanicFuture: 15,
  VirtualFuture: 16,
  SpaceAgeMars: 17,
  SpaceAgeAsteroidBelt: 18,
  SpaceAgeVenus: 19,
  SpaceAgeJupiterMoon: 20,
  SpaceAgeTitan: 21,
  SpaceAgeSpaceHub: 22,
  StellarAgeDiscovery: 23,
  SpaceAgeDiscovery: 23,
};

function fallbackAgeLevel(era) {
  return ERA_LEVELS[era] ?? 0;
}

function inferEraFromUnitId(unitTypeId) {
  if (!unitTypeId || typeof unitTypeId !== 'string') return 'NoAge';
  if (
    unitTypeId.startsWith('StellarAgeDiscovery') ||
    unitTypeId.startsWith('SpaceAgeDiscovery')
  )
    return 'StellarAgeDiscovery';
  if (unitTypeId.startsWith('SpaceAgeSpaceHub')) return 'SpaceAgeSpaceHub';
  if (unitTypeId.startsWith('SpaceAgeTitan')) return 'SpaceAgeTitan';
  if (unitTypeId.startsWith('SpaceAgeJupiterMoon'))
    return 'SpaceAgeJupiterMoon';
  if (unitTypeId.startsWith('SpaceAgeVenus')) return 'SpaceAgeVenus';
  if (unitTypeId.startsWith('SpaceAgeAsteroidBelt'))
    return 'SpaceAgeAsteroidBelt';
  if (unitTypeId.startsWith('SpaceAgeMars')) return 'SpaceAgeMars';
  if (unitTypeId.startsWith('VirtualFuture')) return 'VirtualFuture';
  if (unitTypeId.startsWith('OceanicFuture')) return 'OceanicFuture';
  if (unitTypeId.startsWith('ArcticFuture')) return 'ArcticFuture';
  return 'NoAge';
}

function fallbackGVGagesname(age) {
  if (age === 'BronzeAge') return 'BA';
  if (age === 'IronAge') return 'IA';
  if (age === 'EarlyMiddleAge') return 'EMA';
  if (age === 'HighMiddleAge') return 'HMA';
  if (age === 'LateMiddleAge') return 'LMA';
  if (age === 'ColonialAge') return 'CA';
  if (age === 'IndustrialAge') return 'InA';
  if (age === 'ProgressiveEra') return 'PE';
  if (age === 'ModernEra') return 'ME';
  if (age === 'PostModernEra') return 'PME';
  if (age === 'ContemporaryEra') return 'CE';
  if (age === 'TomorrowEra') return 'TE';
  if (age === 'FutureEra') return 'FE';
  if (age === 'ArcticFuture') return 'AF';
  if (age === 'OceanicFuture') return 'OF';
  if (age === 'VirtualFuture') return 'VF';
  if (age === 'SpaceAgeMars') return 'SAM';
  if (age === 'SpaceAgeAsteroidBelt') return 'SAAB';
  if (age === 'SpaceAgeVenus') return 'SAV';
  if (age === 'SpaceAgeJupiterMoon') return 'SAJM';
  if (age === 'SpaceAgeTitan') return 'SAT';
  if (age === 'SpaceAgeSpaceHub') return 'SASH';
  if (age === 'StellarAgeDiscovery' || age === 'SpaceAgeDiscovery')
    return 'SAD';
  if (age === 'AllAge') return 'AA';
  return age || 'NoAge';
}

function armyUnitManagementService(msg) {
  let army = null;
  if (Array.isArray(msg?.responseData?.counts)) {
    army = msg.responseData.counts;
  } else if (Array.isArray(msg?.responseData)) {
    army = msg.responseData;
  } else if (Array.isArray(msg?.counts)) {
    army = msg.counts;
  } else if (Array.isArray(msg)) {
    army = msg;
  }

  if (!army || !army.length) {
    return {
      success: false,
      rogues: 0,
      allUnits: 0,
      totalUnits: 0,
      unitsPerEra: [],
      armyUnits: ArmyUnits,
    };
  }

  lastArmyMsg = msg;
  const MilitaryDefs = defaultState?.MilitaryDefs || {};
  const unitsPerEra = [];
  let allUnits = 0;
  let rogues = 0;

  for (let j = army.length - 1; j >= 0; j--) {
    const item = army[j];
    if (!item) continue;

    const unitTypeId = item.unitTypeId || item.id || 'unknown';
    const def =
      (MilitaryDefs && MilitaryDefs[unitTypeId]) ||
      (metadataStore &&
        typeof metadataStore.getUnit === 'function' &&
        metadataStore.getUnit(unitTypeId)) ||
      null;
    const eraId = def?.era || def?.minEra || inferEraFromUnitId(unitTypeId);
    let unitName = def?.name || unitTypeId;
    if (unitName === unitTypeId && unitTypeId.includes('_')) {
      const parts = unitTypeId.split('_');
      if (
        parts[0] === 'StellarAgeDiscovery' ||
        parts[0].startsWith('SpaceAge')
      ) {
        unitName = parts
          .slice(1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    const getAgeName = helper?.fGVGagesname || fallbackGVGagesname;
    const eraText = getAgeName(eraId);

    const isRogue = unitTypeId === 'rogue';
    const shouldInclude = !def?.era || eraId !== 'NoAge' || isRogue;

    if (shouldInclude) {
      let units = 0;
      if (item.unattached) units += Number(item.unattached) || 0;
      if (item.attached) units += Number(item.attached) || 0;
      if (!units && (item.count || item.units)) {
        units = Number(item.count || item.units) || 0;
      }

      if (isRogue) {
        rogues += units;
        if (ArmyUnits[unitTypeId] == null) {
          ArmyUnits[unitTypeId] = units;
        }
      } else {
        let diffHtml = '';
        if (ArmyUnits[unitTypeId] == null) {
          ArmyUnits[unitTypeId] = units;
          unitsPerEra.push({
            era: eraId,
            text: `${eraText}: ${unitName} ${units}`,
          });
        } else {
          if (units !== ArmyUnits[unitTypeId]) {
            const diff = units - ArmyUnits[unitTypeId];
            diffHtml = `<span class=${diff > 0 ? '"green">+' : '"red">'}${diff}</span>`;
          }
          unitsPerEra.push({
            era: eraId,
            text: `${eraText}: ${unitName} ${units} ${diffHtml}`.trimEnd(),
          });
        }
        allUnits += units;
      }
    }
  }

  if (typeof document !== 'undefined') {
    const isArmyVisible = showOptions ? showOptions.showArmy : true;
    if (isArmyVisible && (rogues || allUnits)) {
      const targetDiv =
        document.getElementById('army') || defaultState?.armyDIV;
      if (targetDiv) {
        const diff = rogues - (ArmyUnits['rogue'] ?? 0);
        const isCollapsed = collapse?.collapseArmy ?? false;
        const armySize = globals?.toolOptions?.armySize ?? 150;
        const closeBtn =
          element && typeof element.close === 'function' ?
            element.close()
          : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
        const iconHtml =
          element && typeof element.icon === 'function' ?
            element.icon('armyicon', 'armyText', isCollapsed)
          : '';

        let armyHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">`;
        armyHTML += closeBtn;
        armyHTML += `<p id="armyTextLabel" href="#armyText" data-bs-toggle="collapse">`;
        armyHTML += iconHtml;
        armyHTML += `<strong>Army:</strong><span id="armyUnits">${
          isCollapsed ? `Rogues: ${rogues} Units: ${allUnits}` : ''
        }</span></p>`;
        armyHTML += `<div id="armyText" style="height: ${armySize}px" class="overflow-y collapse ${
          isCollapsed ? '' : 'show'
        }"><p class="" >`;
        armyHTML += `<span id="armyUnits2">Rogues: ${rogues}</span> <span class=${
          diff > 0 ? '"green">+' : '"red">'
        }${diff !== 0 ? diff : ''}</span><br><span id="armyUnits3">Units: ${allUnits}</span><br>`;

        const getAgeLevel = helper?.fLevelfromAge || fallbackAgeLevel;
        const armyText = unitsPerEra
          .sort((a, b) => getAgeLevel(b.era) - getAgeLevel(a.era))
          .map((item) => item.text)
          .join('<br>');

        targetDiv.innerHTML = armyHTML + armyText + `</p></div></div>`;

        const labelEl = document.getElementById('armyTextLabel');
        if (
          labelEl &&
          collapse &&
          typeof collapse.fCollapseArmy === 'function'
        ) {
          labelEl.addEventListener('click', collapse.fCollapseArmy);
        }

        const armyDiv = document.getElementById('armyText');
        if (armyDiv && typeof ResizeObserver !== 'undefined') {
          const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (
                entry.contentRect &&
                entry.contentRect.height &&
                globals?.setArmySize
              ) {
                globals.setArmySize(entry.contentRect.height);
              }
            }
          });
          resizeObserver.observe(armyDiv);
        }

        if (
          armyDiv &&
          helper &&
          typeof helper.translateContainer === 'function'
        ) {
          helper.translateContainer(armyDiv);
        }
      }
    }
  }

  return {
    success: true,
    rogues,
    allUnits,
    totalUnits: rogues + allUnits,
    unitsPerEra,
    armyUnits: ArmyUnits,
  };
}

function clearArmyUnits() {
  ArmyUnits = {};
}

const exportsObj = {
  armyUnitManagementService,
  clearArmyUnits,
};

Object.defineProperty(exportsObj, 'ArmyUnits', {
  get: () => ArmyUnits,
  set: (val) => {
    ArmyUnits = val;
  },
  enumerable: true,
  configurable: true,
});

module.exports = exportsObj;
module.exports.default = exportsObj;
module.exports.armyUnitManagementService = armyUnitManagementService;
module.exports.clearArmyUnits = clearArmyUnits;
