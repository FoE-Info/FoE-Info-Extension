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
import { Popover } from 'bootstrap';
import {
  CityEntityDefs,
  donationDIV,
  GameOrigin,
  Goods,
  hiddenRewards,
  incidents,
  url,
} from '../index';
const _url = url as unknown as Record<string, string>;
const _CityEntityDefs = CityEntityDefs as unknown as Record<
  string,
  { name: string }
>;
const _Goods = Goods as unknown as Record<string, unknown>;
import {
  BattlegroundPerformance,
  BGtime,
  GuildMembers,
} from '../msg/GuildBattlegroundService';
const _BattlegroundPerformance = BattlegroundPerformance as unknown as Array<
  Record<string, unknown>
>;
const _GuildMembers = GuildMembers as unknown as Array<Record<string, unknown>>;
import { ResourceNames } from '../msg/ResourceService';
const _ResourceNames = ResourceNames as unknown as Record<string, string>;
import { showOptions } from '../vars/showOptions';
import * as collapse from './collapse';
import { fCollapseIncidents } from './collapse';
import * as copy from './copy';
import { setBattlegroundSize, toolOptions } from './globals';
import * as post_webstore from './post';
import * as storage from './storage';
import * as element from './AddElement';
import browser from 'webextension-polyfill';

var heightGBG = toolOptions.battlegroundsSize;
export var MyGuildPermissions = 0;

function setHeight() {
  console.debug('mouseup', heightGBG);
  setBattlegroundSize(heightGBG);
}

export function fResourceShortName(name: string) {
  if (name == 'sacrificial_offerings') {
    return 'Offerings';
  } else if (name == 'something else') {
    return 'something';
  } else if (_ResourceNames[name]) {
    return _ResourceNames[name];
  } else return name;
}

export function fRewardShortName(reward: string) {
  if (reward == 'Fragment of Statue Of Honor Selection Kit') {
    return 'SoH Fragment';
  } else if (reward == 'Statue Of Honor Selection Kit') {
    return 'SoH Kit';
  } else if (reward == 'Fragment of The Great Elephant Selection Kit') {
    return 'Elephant Fragment';
  } else if (reward.split(' ')[0] == '1' || reward.split(' ')[0] == '5') {
    return reward.slice(2);
  } else if (reward.split(' ')[0] == '5x' || reward.split(' ')[0] == '10') {
    return reward.slice(3);
  } else if (!isNaN(Number(reward.split(' ')[0]))) {
    return reward.slice(reward.indexOf(' ') + 1);
  } else if (reward.includes('Coins')) {
    return 'Coins';
  } else if (reward.includes('Goods')) {
    return 'Goods';
  } else if (reward.includes('Supplies')) {
    return 'Supplies';
  } else if (reward.includes('Rogue')) {
    return 'Rogues';
  } else if (reward.includes('Medals')) {
    return 'Medals';
  }

  // else if (reward =="something else")
  // {
  // 	return "something";
  // }
  else if (reward.includes('Forge Points')) {
    return 'Forge Points';
  }
  // else if (reward =="something else")
  // {
  // 	return "something";
  // }
  else {
    return reward;
  }
}

export function fGBsname(city_entity: string) {
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

  console.debug(city_entity);
  return city_entity.slice(0, 10);
}

export function fEntityNameTrim(name: string) {
  if (!_CityEntityDefs[name]) return name;
  var trimName = _CityEntityDefs[name].name;
  if (trimName.includes(' - Lv.'))
    return trimName.substring(0, trimName.indexOf(' - Lv.'));
  else if (trimName.includes('Lv. 2 - '))
    return trimName.replace('Lv. 2 - ', '');
  else if (trimName.includes('Lv. 1 - '))
    return trimName.replace('Lv. 1 - ', '');
  else return trimName;
}

export function fGBname(city_entity: string) {
  var GB_name = city_entity;

  // if(CityEntityDefs[city_entity] &&  CityEntityDefs[city_entity].name == "Galata Tower")
  // 	console.debug(CityEntityDefs[city_entity]);

  // return GBdefs[city_entity];
  if (_CityEntityDefs[city_entity]) {
    // console.debug(CityEntityDefs[city_entity].name,CityEntityDefs);
    return _CityEntityDefs[city_entity].name;
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
  // console.debug(city_entity,CityEntityDefs);
  return GB_name;
}

export function fIncidentName(incidentName: string) {
  var incident: { type: string; text: string } = {
    type: '?',
    text: incidentName,
  };

  if (incidentName == 'incident_fallen_tree_1x1') {
    incident.type = 'r';
    incident.text = 'Fallen Tree';
  } else if (incidentName == 'incident_fallen_tree_2x2') {
    incident.type = '<strong>R</strong>';
    incident.text = 'Fallen Tree 2x2';
  } else if (incidentName == 'incident_pothole_1x1') {
    incident.type = 'r';
    incident.text = 'Pothole';
  } else if (incidentName == 'incident_pothole_2x2') {
    incident.type = '<strong>R</strong>';
    incident.text = 'Pothole';
  } else if (incidentName == 'incident_blocked_road_1x1') {
    incident.type = 'r';
    incident.text = 'Road';
  } else if (incidentName == 'incident_blocked_road_2x2') {
    incident.type = '<strong>R</strong>';
    incident.text = 'Blocked Road';
  } else if (incidentName == 'incident_dinosaur_bones') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Dinosaur Bones';
  } else if (incidentName == 'incident_statue') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Statue';
  } else if (incidentName == 'incident_fruit_vendor') {
    incident.type = 'n';
    incident.text = 'Fruit Vendor';
  } else if (incidentName == 'incident_treasure_chest') {
    incident.type = 'n';
    incident.text = 'Treasure Chest';
  } else if (incidentName == 'incident_overgrowth') {
    incident.type = 'n';
    incident.text = 'Overgrowth';
  } else if (incidentName == 'incident_clothesline') {
    incident.type = 'n';
    incident.text = 'Clothesline';
  } else if (incidentName == 'incident_beehive') {
    incident.type = 'n';
    incident.text = 'Beehive';
  } else if (incidentName == 'incident_broken_cart') {
    incident.type = 'n';
    incident.text = 'Broken Cart';
  } else if (incidentName == 'incident_musician') {
    incident.type = 'n';
    incident.text = 'Musician';
  } else if (incidentName == 'incident_kite') {
    incident.type = 'n';
    incident.text = 'Kite';
  } else if (incidentName == 'incident_sculptor') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Sculptor';
  } else if (incidentName == 'incident_stick_hut') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Stick Hut';
  } else if (incidentName == 'incident_wine_cask') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Wine Cask';
  } else if (incidentName == 'incident_mammoth_bones') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Mammoth Bones';
  } else if (incidentName == 'incident_crates') {
    incident.type = 'n';
    incident.text = 'Crates';
  } else if (incidentName == 'incident_flotsam') {
    incident.type = 's';
    incident.text = 'Flotsam';
  } else if (incidentName == 'incident_shipwreck') {
    incident.type = '<strong>S</strong>';
    incident.text = 'Shipwreck';
  } else if (incidentName == 'incident_sos') {
    incident.type = 's';
    incident.text = 'SOS';
  } else if (incidentName == 'incident_fisherman') {
    incident.type = 'w';
    incident.text = 'Fisherman';
  } else if (incidentName == 'incident_castaway') {
    incident.type = 'w';
    incident.text = 'Castaway';
  } else if (incidentName == 'incident_rhino') {
    incident.type = '<strong>W</strong>';
    incident.text = 'Rhino';
  } else if (incidentName == 'spring_cherry_tree') {
    incident.type = `<span class='green'>E</span>`;
    incident.text = 'Cherry Tree';
  } else if (incidentName.includes('ages_birthday_gift')) {
    incident.type = `<span class='green'>E</span>`;
    incident.text = 'Paper Money';
  } else if (incidentName == 'incident_car_accident') {
    incident.type = '<strong>R</strong>';
    incident.text = 'Car Accident';
  } else if (incidentName == 'fall_apple_tree') {
    incident.type = `<span class='green'>E</span>`;
    incident.text = 'Apple Tree';
  } else if (incidentName == 'incident_quicksand') {
    incident.type = 'n';
    incident.text = 'Quicksand';
  } else if (incidentName == 'incident_beach_gear') {
    incident.type = 's';
    incident.text = 'Beach Gear';
  } else if (incidentName == 'incident_floating_chest') {
    incident.type = 'w';
    incident.text = 'Floating Chest';
  } else if (incidentName == 'incident_chest') {
    incident.type = '<strong>N</strong>';
    incident.text = 'Chest';
  } else if (incidentName == 'incident_hero') {
    incident.type = '<strong>E</strong>';
    incident.text = 'Travel Rations';
  } else {
    incident.type = '?';
    incident.text = incidentName;
  }
  return incident;
}

export function fLevelfromAge(age: string) {
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
export const numAges = 22;

export function fAgefromLevel(level: number) {
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
  }
  // else if (age =="AllAge")
  // {
  // 	name = "AA";
  // }
  return -1;
}

export function fGVGagesname(age: string) {
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
  } else if (age == 'AllAge') {
    name = 'AA';
  }
  return name;
}

export function fGoodsTally(age: string, good: number) {
  // console.debug(age,good);
  if (age == 'BronzeAge') (_Goods as Record<string, number>).ba += good;
  else if (age == 'IronAge') (_Goods as Record<string, number>).ia += good;
  else if (age == 'EarlyMiddleAge')
    (_Goods as Record<string, number>).ema += good;
  else if (age == 'HighMiddleAge')
    (_Goods as Record<string, number>).hma += good;
  else if (age == 'LateMiddleAge')
    (_Goods as Record<string, number>).lma += good;
  else if (age == 'ColonialAge') (_Goods as Record<string, number>).cma += good;
  else if (age == 'IndustrialAge')
    (_Goods as Record<string, number>).ina += good;
  else if (age == 'ProgressiveEra')
    (_Goods as Record<string, number>).pe += good;
  else if (age == 'ModernEra') (_Goods as Record<string, number>).me += good;
  else if (age == 'PostModernEra')
    (_Goods as Record<string, number>).pme += good;
  else if (age == 'ContemporaryEra')
    (_Goods as Record<string, number>).ce += good;
  else if (age == 'TomorrowEra') (_Goods as Record<string, number>).te += good;
  else if (age == 'FutureEra') (_Goods as Record<string, number>).fe += good;
  else if (age == 'ArcticFuture') (_Goods as Record<string, number>).af += good;
  else if (age == 'OceanicFuture')
    (_Goods as Record<string, number>).of += good;
  else if (age == 'VirtualFuture')
    (_Goods as Record<string, number>).vf += good;
  else if (age == 'SpaceAgeMars')
    (_Goods as Record<string, number>).sam += good;
  else if (age == 'SpaceAgeAsteroidBelt')
    (_Goods as Record<string, number>).saab += good;
  else if (age == 'SpaceAgeVenus')
    (_Goods as Record<string, number>).sav += good;
  else if (age == 'SpaceAgeJupiterMoon')
    (_Goods as Record<string, number>).sajm += good;
  else if (age == 'SpaceAgeTitan')
    (_Goods as Record<string, number>).sat += good;
  else if (age == 'SpaceAgeSpaceHub')
    (_Goods as Record<string, number>).sash += good;
  else if (age == 'NoAge') (_Goods as Record<string, number>).noage += good;
  else console.debug(age, good);
}

export function fShowIncidents() {
  const incidentRewards = Array.isArray(hiddenRewards)
    ? (hiddenRewards as unknown as Array<Record<string, unknown>>)
    : [];
  var rewards = 0;
  var type = '';
  var textCurrent = '';
  var textComing = '';
  var tooltipHTML = '';
  if (showOptions && showOptions.showIncidents && incidentRewards.length) {
    fHideTooltips();
    for (var j = 0; j < incidentRewards.length; j++) {
      const incident = incidentRewards[j];
      if (
        (incident.position as Record<string, string>)?.context ==
        'guildExpedition'
      )
        continue;
      const incidentName = fIncidentName(incident.type as string);
      if (incidentName.type == '?') console.debug(incident);
      // console.debug(incidentName.text,incidentName,incident);
      var start = new Date(incident.startTime as string).getTime() / 1000;
      var finish = new Date(incident.expireTime as string).getTime() / 1000;
      var diffText = '';
      start -= Date.now() / 1000;
      finish -= Date.now() / 1000;
      if (start < 0) var diff = Math.abs(start);
      else var diff = Math.abs(finish);
      // console.debug(start,finish,diff,Date.now()/1000);
      // get hours
      var hours = Math.floor(diff / 3600) % 24;
      // document.write("<br>Difference (Hours): "+hours);
      diffText += `${hours}:`;

      // get minutes
      var minutes = Math.floor(diff / 60) % 60;
      // document.write("<br>Difference (Minutes): "+minutes);
      diffText += `${minutes}:`;

      // get seconds
      var seconds = Math.floor(diff) % 60;
      // document.write("<br>Difference (Seconds): "+seconds);
      diffText += `${seconds}`;

      if (start < 0) {
        rewards++;
        // textCurrent += `Reward ${j+1}: ${msg.responseData.hiddenRewards[j].type} ${timer.toUTCString()}<br>`;

        type += incidentName.type;
        if ((incident.rarity as string) != 'common')
          textCurrent += `<span class='green'>${incidentName.text}</span>`;
        else textCurrent += incidentName.text;
        textCurrent += ` for ` + diffText + `<br>`;
      } else {
        textComing += incidentName.text + ` in ` + diffText + `<br>`;
      }
    }
    // var timer = new Date(Date.now());
    // output.innerHTML += `<div>Now: ${timer.toUTCString()}</div>`;
    // console.debug(rewards,type,textCurrent,textComing);
    // data-bs-placement="bottom"
    if (rewards) {
      tooltipHTML = `<div><p>${textCurrent}</p>${
        textComing != '' ?
          '<p><strong>Coming Soon:</strong><br>' + textComing + '</p>'
        : ''
      }`;
      tooltipHTML +=
        '<p><strong>Legend:</strong><br>n/N - Nature<br>s/S - Shore<br>w/W - Water<br>r/R - Road<br> E - Event<br>Capitals = Uncommon/Rare Reward</p></div>';
      incidents.innerHTML = `<div id="incidentsTip" class="alert alert-light alert-dismissible show collapsed" role="alert">
            <p id="incidentsTextLabel" href="#incidentsText" data-bs-toggle="collapse">
			${element.icon('incidentsicon', 'incidentsText', collapse.collapseIncidents)}
			<span id="incidents_tooltip" class="pop" data-bs-container="#incidents_tooltip" data-bs-toggle="popover" data-bs-placement="bottom" title="Incidents" data-bs-content="${tooltipHTML}"><strong><span data-i18n="incident">Incidents</span>:</strong></span> ${type}</p>
            ${element.close()}
            <div id="incidentsText" class="collapse ${collapse.collapseIncidents ? '' : 'show'} alert-light">
            ${tooltipHTML}</div></div>`;
      // outputHTML += '<div id="incidentsText" class="collapse show">';
      //$('.incidents').show();
      // document.getElementById("incidentsTip").title = tooltipHTML;
      // cityincidents.data-html="true";
      // $(document).ready(function(){
      // $('#incidentsTip').tooltip({html: true,placement: 'bottom'});
      //   });
      document
        .getElementById('incidentsTextLabel')!
        .addEventListener('click', fCollapseIncidents);
      document
        .getElementById('incidentsTip')!
        .addEventListener('onmouseleave', fHideTooltips);

      const incidents_tooltip = document.getElementById('incidents_tooltip');
      if (incidents_tooltip) {
        const options = {
          trigger: 'hover focus',
          html: true,
          delay: { show: 100, hide: 300 },
        };
        // const tooltip = new Tooltip(incidents_tooltip, options);
        const popover = new Popover(
          incidents_tooltip,
          options as unknown as Parameters<
            typeof Popover.getOrCreateInstance
          >[1],
        );
      }

      // $('#incidents_tooltip').tooltip({
      //     content: function(){
      //         var element = $( this );
      //         return element.attr('title')
      //     },
      // 	delay: { "show": 200, "hide": 500 }
      // });
    } else {
      incidents.innerHTML = ``;
      //$('.incidents').hide();
    }
  }
}

export function fHideTooltips() {
  const incidents_tooltip = document.getElementById('incidents_tooltip');
  if (incidents_tooltip) {
    const popover = Popover.getOrCreateInstance(incidents_tooltip);
    popover.hide();
  }
}

export function fshowBattlegroundChanges() {
  showOptions.showBattlegroundChanges = !showOptions.showBattlegroundChanges;
  storage.set('showOptions', showOptions);
  // console.debug(BattlegroundPerformance);
  fshowBattleground();
  // console.debug('fshowBattlegroundChanges',showOptions.showBattlegroundChanges);
}

export function fshowBattleground() {
  // console.debug(data,BattlegroundPerformance);
  var battlegroundHTML = `<div class="alert alert-info alert-dismissible show collapsed" role="alert">
	<p id="battlegroundTextLabel" href="#battlegroundCollapse" aria-expanded="true" aria-controls="battlegroundText" data-bs-toggle="collapse">
	${element.icon('battlegroundicon', 'battlegroundCollapse', collapse.collapseBattleground)}
	<strong>Battlegrounds: ${GameOrigin.toUpperCase()}</strong></p>${element.close()}`;

  if (_url.sheetGuildURL || _url.forgeCompanionURL)
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
  battlegroundHTML += `<div id="battlegroundCollapse" class="alert-info overflow collapse ${
    collapse.collapseBattleground ? '' : 'show'
  }"><div id="battlegroundText">`;

  battlegroundHTML += `<p class="showGBGchanges"><input type="checkbox" id="showGBGchanges"><label for="showGBGchanges">show changes only</label></p>
	${BGtime ? '<p>Last Saved: ' + BGtime + '</p>' : ''}
	<div><table id="gbg-table" class="gbg-table"><tr><th>Member</th><th>Negs</th><th>Fights</th><th>Attrition</th></tr>`;
  _BattlegroundPerformance.forEach((entry) => {
    // console.debug(entry);
    var wonNegotiations = 0;
    var wonBattles = 0;
    var battleDiff = 0;
    var negotiationsDiff = 0;
    var attrition = 0;
    var attritionDiff = 0;
    if (entry.wonNegotiations)
      wonNegotiations = entry.wonNegotiations as number;
    if (entry.wonBattles) wonBattles = entry.wonBattles as number;
    if (entry.attrition) attrition = entry.attrition as number;

    // console.debug(playerInfo);
    // console.debug(entry.player.name,BattlegroundPerformance);

    // console.debug(BattlegroundPerformance.indexOf(entry.player.name),entry.player.name);

    // console.debug('GuildMembers',entry.player.name,BattlegroundPerformance[BattlegroundPerformance.indexOf(entry.player.name)],GuildMembers[entry.player.name],GuildMembers[entry.player.name].wonBattles);
    // if(GuildMembers[entry.player.name]){
    var player = _GuildMembers.find((id) => id.name == entry.name);
    // console.debug(player);
    battleDiff = wonBattles - ((player?.wonBattles as number) ?? 0);
    negotiationsDiff =
      wonNegotiations - ((player?.wonNegotiations as number) ?? 0);
    attritionDiff = attrition - ((player?.attrition as number) ?? 0);
    // }
    // console.debug(entry.name,battleDiff,negotiationsDiff);
    if (
      !showOptions.showBattlegroundChanges ||
      battleDiff ||
      negotiationsDiff ||
      attritionDiff
    ) {
      battlegroundHTML += `<tr><td>${entry.name as string}</td><td>${wonNegotiations}`;
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
  donationDIV.innerHTML = battlegroundHTML + `</table></div></div></div></div>`;
  if (_url.sheetGuildURL || _url.forgeCompanionURL)
    document.getElementById('battlegroundPostID')!.addEventListener('click', () => {
      if (_url.sheetGuildURL) {
        post_webstore.postGBGtoSS();
      }
      if (_url.forgeCompanionURL) {
        post_webstore.postGBGtoForgeCompanion();
      }
    });
  // else
  document
    .getElementById('battlegroundCopyID')!
    .addEventListener('click', copy.BattlegroundCopy);

  document
    .getElementById('battlegroundTextLabel')!
    .addEventListener('click', collapse.fCollapseBattleground);
  document
    .getElementById('showGBGchanges')!
    .addEventListener('click', fshowBattlegroundChanges);
  (document.getElementById('showGBGchanges') as HTMLInputElement).checked =
    showOptions.showBattlegroundChanges as boolean;
  const battlegroundDiv = document.getElementById('battlegroundCollapse')!;
  battlegroundDiv.addEventListener('mouseup', setHeight);
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height)
        heightGBG = entry.contentRect.height;
    }
  });
  resizeObserver.observe(battlegroundDiv);
  console.debug($('#battlegroundCollapse').height());
  if (
    ($('#battlegroundCollapse').height() as number) >
    toolOptions.battlegroundsSize
  ) {
    $('#battlegroundCollapse').height(toolOptions.battlegroundsSize);
  }
  ($('body') as JQuery & { i18n(): void }).i18n();
}

export function checkGBG() {
  if (MyGuildPermissions & 64 && _url.discordTargetURL) return true;
  else if (
    typeof (window as unknown as Record<string, unknown>).DEV !== 'undefined' &&
    (window as unknown as Record<string, unknown>).DEV
  )
    return true;
  else return false;
}

export function setMyGuildPermissions(permissions: number) {
  MyGuildPermissions = permissions;
}

// export function getKey(text){
// 	var key = crypto.createCipher('aes-128-cbc', salt);
// 	var str = key.update(text, 'utf8', 'hex')
// 	str += key.final('hex');
// 	return str;
// }
