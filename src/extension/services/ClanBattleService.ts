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

import { gvg, MyInfo } from '../index';
import { toolOptions, setGVGSize } from '../core/globals';
import { showOptions } from '../state/showOptions';
import * as collapse from '../core/collapse';
import * as element from '../core/AddElement';
import { fGVGagesname } from '../core/helper';
import BigNumber from 'bignumber.js';

export var gvgContainer: HTMLDivElement | null = null;
export var gvgSummary: HTMLDivElement | null = null;
export var gvgAges: HTMLDivElement | null = null;
var gvgPower: Array<Record<string, unknown>> = [];
var gvgPowerAll: Record<string, Record<string, unknown>> = {};
var gvgAgeNotloadList = [
  'AA',
  'FE',
  'TE',
  'CE',
  'PME',
  'ME',
  'PE',
  'InA',
  'CA',
  'LMA',
  'HMA',
  'EMA',
  'IA',
];

export function getContinent(msg: Record<string, unknown>) {
  // console.debug(gvg,gvgContainer,gvgSummary,document.getElementById("gvgInfo"));
  // console.debug(gvg,gvgContainer,gvgSummary,gvgAges);

  // collapseOptions('collapseGVGinfo',false);

  if (gvgContainer == null) {
    console.debug('1');
    gvgContainer = document.createElement('div');
    gvg.appendChild(gvgContainer);
    gvgSummary = document.createElement('div');
    gvgContainer.appendChild(gvgSummary);
  }

  if (document.getElementById('gvgInfo') == null) {
    console.debug('2');
    gvgContainer = document.createElement('div');
    gvgContainer.id = 'gvgInfo';
    gvgContainer.className =
      'alert alert-success alert-dismissible show collapsed';
    gvgContainer.innerHTML = `${element.close()}
        <p id="gvgInfoTextLabel" href="#gvgInfoText" data-bs-toggle="collapse">
      ${element.icon('gvgInfoIcon', 'gvgInfoText', collapse.collapseGVGinfo)}
        <strong><span data-i18n="summary">GvG Summary</span>:</strong></p>`;
    gvg.appendChild(gvgContainer);
    gvgSummary = document.createElement('div');
    gvgContainer.appendChild(gvgSummary);
    document
      .getElementById('gvgInfoTextLabel')
      .addEventListener('click', collapse.fCollapseGVGinfo);
    // document.getElementById("content").appendChild(gvg);
  }

  if (showOptions.showGVG) {
    const rd = msg.responseData as Record<string, unknown>;
    const map = rd.continent as Record<string, unknown>;
    var gvgAges_copy = null;

    // gvgContainer.innerHTML = `<p>`;
    if (document.getElementById('gvgInfoText') == null) {
      gvgSummary = document.createElement('div');
      gvgSummary.id = 'gvgInfoText';
      gvgSummary.className = `collapse${!collapse.collapseGVGinfo ? ' show' : ''}`;
      // gvgSummary.innerHTML = ``;
      gvgContainer.appendChild(gvgSummary);
      // gvgSummary = document.createElement('div');
      // gvgContainer.appendChild(gvgSummary);
      // document.getElementById("content").appendChild(gvg);
      // gvg.id="gvgInfo";
      // gvg.className="alert alert-success alert-dismissible show collapsed";
      // console.debug(gvg,gvgContainer,document.getElementById("gvgInfoText"));
    }

    buildGvgInnerDiv(
      gvgSummary!,
      collapse.fcollapseGVGOverview,
      collapse.collapseGVGOverview,
      'Overview',
      'GvG Guild Ages Summary',
    );
    buildGvgInnerDiv(
      gvgSummary,
      collapse.fcollapseGVGGuildPower,
      collapse.collapseGVGGuildPower,
      'GuildPower',
      'GvG Guild Power',
    );
    buildGvgInnerDiv(
      gvgSummary,
      collapse.fcollapseGVGCurrAge,
      collapse.collapseGVGCurrAge,
      'CurrAge',
      'Live Status',
    );
    buildGvgInnerDiv(
      gvgSummary,
      collapse.fcollapseGVGAllGuildsPower,
      collapse.collapseGVGAllGuildsPower,
      'AllGuildsPower',
      'Guild Ranking Live Status',
    );

    // console.debug(gvg,gvgContainer,document.getElementById("gvgInfo"));
    // var clanHTML = gvg.outerHTML;
    // console.debug(clanHTML);
    // if(clanHTML = null){
    var clanHTML = `<p id='gvgOverviewTextP'>`;
    // console.debug(msg.responseData);
    // }
    let count = 0;
    clanHTML += `Rank ${(rd.clan_data as Record<string, unknown>).global_clan_rank}`;
    (map.provinces as Array<Record<string, unknown>>).forEach((era) => {
      // console.debug(era.era);
      count = 0;
      (era.sectors as Array<Record<string, unknown>>).forEach((sector) => {
        if ((sector.owner_id as number) === MyInfo.guildID) {
          count++;
          // console.debug(sector.sector_id);
        }
      });
      if (count) {
        const eraCount = count;
        const siege =
          Math.round(
            (3 * Math.pow(eraCount, 1.5) + 0.045 * Math.pow(eraCount, 3.1)) /
              5 +
              1,
          ) *
          5 *
          5;
        const eraName = fGVGagesname(era.era as string);
        if (era.era == 'AllAge')
          clanHTML += `<br>AA: ${eraCount} sect, ${siege} medals`;
        else
          clanHTML += `<br>${eraName}: ${eraCount} sect, ${siege} total goods`;
      }
    });
    clanHTML += `</p>`;
    var gvgOverviewText = document.getElementById('gvgOverviewText');
    gvgOverviewText!.innerHTML = clanHTML;

    ($('body') as JQuery & { i18n(): void }).i18n();
  } else {
    console.debug((msg.responseData as unknown[]).length);
  }
  // console.debug(gvgSummary,gvgAges);
  // gvgSummary.appendChild(gvgAges);
}

export function getProvinceDetailed(msg: Record<string, unknown>) {
  // if(!clanHTML){
  // clanHTML = `<div id="gvgTitle" class="alert alert-success alert-dismissible show collapsed" role="alert">${element.close()}<p id="gvgTextLabel" href="#gvgText" data-bs-toggle="collapse"><svg class="bi alert-warning" id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseStats ? 'plus' : 'dash'}-circle"/></svg><strong>GvG Power:</strong></p>`;
  // }
  // var clanHTML = `<p class="alert-success">`;
  // console.debug(msg.responseData);

  if (showOptions.showGVG) {
    var gvgGuildPowerTextDiv: HTMLElement | null =
      document.getElementById('gvgGuildPowerText');

    // var clanHTML = gvgAges.innerHTML;
    var clanHTML = ``;
    var Guilds: Record<string, string> = {};
    var GuildSectors: Record<string, number> = {};
    var GuildPower: Record<string, number> = {};
    var GVGstatus: Array<Record<string, unknown>> = [];
    var gvgPowerAllSorted: Array<Record<string, unknown>> = [];
    // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
    const map = (msg.responseData as Record<string, unknown>)
      .province_detailed as Record<string, unknown>;
    // console.debug(map);
    var power = 0;
    var total = 0;
    const powerValues = map.power_values as number[];
    const power0 = powerValues[0];
    const power1 = powerValues[1];
    const power2 = powerValues[2];
    const power3 = powerValues[3];

    gvgAgeNotloadList = gvgAgeNotloadList.filter(
      (item) => item !== fGVGagesname(map.era as string),
    );

    var ele = gvgPower.find(
      (element) => element.era == map.era && (element.power as number) > 0,
    );
    if (ele) ele.time = new Date().toLocaleString();
    else
      gvgPower.push({
        era: map.era,
        power: 0,
        time: new Date().toLocaleString(),
      });

    (map.clans as Array<Record<string, unknown>>).forEach((clan) => {
      Guilds[clan.id as string] = clan.name as string;
    });

    (map.sectors as Array<Record<string, unknown>>).forEach((sector) => {
      // if(sector.__class__ == 'ClanBattleProvinceBaseSector')
      // if(sector.is_landing_zone == true)
      //     console.debug(sector);

      if (sector.is_fogged != true && (sector.owner_id as number) > 0) {
        power = 0;

        if (sector.power === 1) power = power1;
        else if (sector.power === 2) power = power2;
        else if (sector.power === 3) power = power3;
        else power = power0;

        if (GuildSectors[sector.owner_id as string])
          GuildSectors[sector.owner_id as string]++;
        else GuildSectors[sector.owner_id as string] = 1;

        if (GuildPower[sector.owner_id as string])
          GuildPower[sector.owner_id as string] += power;
        else GuildPower[sector.owner_id as string] = power;

        // console.debug(sector, GuildPower,power);
        // console.debug(sector, Guilds[sector.owner_id],GuildPower[sector.owner_id],power);
      }
    });
    // console.debug(MyInfo.guildID,Guilds[MyInfo.guildID],GuildPower[MyInfo.guildID],GuildPower);

    // map.top_clans.forEach( (clan,j) => {
    // 	if(clan.id == MyInfo.guildID)
    // 		 power = GuildPower[MyInfo.guildID] * (1 + ((3 - j)/20));
    // });

    Object.entries(Guilds).forEach(([id, clan]) => {
      GVGstatus.push({
        id,
        name: clan,
        sectors: GuildSectors[id] ?? 0,
        power: GuildPower[id] ?? 0,
      });
    });

    GVGstatus.sort(function (a, b) {
      return ((b.power as number) ?? 0) - ((a.power as number) ?? 0);
    });

    GVGstatus.forEach((clan, j) => {
      if (j < 3)
        clan.power = BigNumber(clan.power as Parameters<typeof BigNumber>[0])
          .times(1 + (3 - j) / 20)
          .dp(0);
      if (clan.name == MyInfo.guild)
        gvgPower.find((element) => element.era == map.era)!.power = clan.power;
      if (!gvgPowerAll[clan.id as string])
        gvgPowerAll[clan.id as string] = { name: clan.name, powerList: {} };
      (gvgPowerAll[clan.id as string].powerList as Record<string, unknown>)[
        map.era as string
      ] = clan.power;
    });
    gvgPower.sort(function (a, b) {
      return (
        new Date(b.time as string).getTime() -
        new Date(a.time as string).getTime()
      );
    });

    // if(!gvgPower[map.era]){
    // 	gvgPower.push([map.era,Math.round(power)]);
    // }
    // else
    clanHTML = '<p id="gvgGuildPowerTextP" class="overflow">';
    gvgPower.forEach((age) => {
      if ((age.power as number) > 0) {
        if (age.era == map.era)
          clanHTML += `<strong>${fGVGagesname(map.era as string)}</strong>:</span> ${age.power}<br>`;
        else clanHTML += `${fGVGagesname(age.era as string)}: ${age.power}<br>`;
        total += +(age.power as number);
      }
    });

    clanHTML += `Total: ${total}</p>`;
    gvgGuildPowerTextDiv!.innerHTML = clanHTML;

    Object.keys(gvgPowerAll).forEach((clan) => {
      let clanTotal = 0;
      Object.keys(
        gvgPowerAll[clan].powerList as Record<string, unknown>,
      ).forEach((era) => {
        clanTotal += +((gvgPowerAll[clan].powerList as Record<string, unknown>)[
          era
        ] as number);
      });
      gvgPowerAll[clan].total = clanTotal;
    });
    gvgPowerAllSorted = copy(gvgPowerAll) as Array<Record<string, unknown>>;
    gvgPowerAllSorted.sort(function (a, b) {
      return ((b.total as number) ?? 0) - ((a.total as number) ?? 0);
    });

    // console.debug(gvgPowerAllSorted);
    // GuildPower.forEach( (clan,j) => {
    // 	// console.debug(clan);
    // 	console.debug(Guilds[j],GuildSectors[j],clan);
    // });

    clanHTML = `<strong>${fGVGagesname(map.era)} <span data-i18n="livestatus">Live Status</span></strong>`;
    var gvgGuildPowerTextDiv2: HTMLElement | null = document.getElementById(
      'gvgCurrAgeHeadlineText',
    );
    gvgGuildPowerTextDiv2!.innerHTML = clanHTML;

    clanHTML =
      '<p id="gvgCurrAgeTextP" style="height: 200px" class="overflow">';
    // clanHTML += `<strong>${map.era}</strong><br>`;
    GVGstatus.forEach((clan, j) => {
      clanHTML += `${j + 1} ${clan.name as string}:  ${Math.round(clan.power as number)} (${clan.sectors as number})<br>`;
    });
    // }
    // clanHTML += `<br>`;
    clanHTML += `</p>`;

    var gvgCurrAgeTextDiv: HTMLElement | null =
      document.getElementById('gvgCurrAgeText');
    gvgCurrAgeTextDiv!.innerHTML = clanHTML;

    var gvgAllGuildsPowerTextDiv: HTMLElement | null = document.getElementById(
      'gvgAllGuildsPowerText',
    );

    clanHTML = `<p id="gvgAllGuildsPowerTextP" style="height: 200px" class="overflow">`;
    document.getElementById('gvgWarnGuildPower')?.remove();
    document.getElementById('gvgWarnAllGuildPower')?.remove();
    if (gvgAgeNotloadList.length > 0) {
      var gvgWarnFunc = (id) =>
        `<span id="gvgWarn${id}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${gvgAgeNotloadList.toString()} were not loaded yet"><span>    </span>
        <span class="material-icons-outlined md-18 gvg-warn">warning</span></span> `;
      var headlineSpan = document.getElementById('gvgGuildPowerHeadlineText');
      if (headlineSpan.innerHTML)
        headlineSpan.innerHTML =
          gvgWarnFunc('GuildPower') + headlineSpan.innerHTML;
      headlineSpan = document.getElementById('gvgAllGuildsPowerHeadlineText');
      if (headlineSpan.innerHTML)
        headlineSpan.innerHTML =
          gvgWarnFunc('AllGuildPower') + headlineSpan.innerHTML;
    }

    Object.keys(gvgPowerAllSorted).forEach((clan, j) => {
      clanHTML += `${j + 1} ${(gvgPowerAllSorted as Record<string, Record<string, unknown>>)[clan].name}:  ${Math.round((gvgPowerAllSorted as Record<string, Record<string, unknown>>)[clan].total as number)}<br>`;
    });
    clanHTML += `</p>`;
    gvgAllGuildsPowerTextDiv!.innerHTML = clanHTML;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height)
          setGVGSize(entry.contentRect.height);
      }
    });
    resizeObserver.observe(document.getElementById('gvgOverviewTextP')!);
    resizeObserver.observe(document.getElementById('gvgGuildPowerTextP')!);
    resizeObserver.observe(document.getElementById('gvgCurrAgeTextP')!);
    resizeObserver.observe(document.getElementById('gvgAllGuildsPowerTextP')!);
    ($('body') as JQuery & { i18n(): void }).i18n();

    // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
  } else {
    console.debug((msg.responseData as unknown[]).length);
  }
}

function copy(
  aObject: Record<string, unknown> | unknown[],
): Record<string, unknown> | unknown[] {
  // Prevent undefined objects
  // if (!aObject) return aObject;

  let bObject = Array.isArray(aObject) ? [] : {};

  let value;
  for (const key in aObject) {
    // Prevent self-references to parent object
    // if (Object.is(aObject[key], aObject)) continue;

    value = aObject[key];

    bObject[key] = typeof value === 'object' ? copy(value) : value;
  }

  return bObject;
}

function buildGvgInnerDiv(
  parentDiv: HTMLElement,
  collapseFunc: () => void,
  collapseVar: boolean,
  name: string,
  text: string,
) {
  var wrapperDiv;
  var headlineDiv;
  var textDiv;

  if (document.getElementById(`gvg${name}Wrapper`)) {
    var label = document.getElementById(`gvg${name}TextLabel`);
    label.addEventListener('click', collapseFunc);
  } else {
    wrapperDiv = document.createElement('div');
    wrapperDiv.id = `gvg${name}Wrapper`;
    wrapperDiv.className = `alert alert-success nopadding collapse${!collapse.collapseGVGinfo ? ' show' : ''}`;
    parentDiv.appendChild(wrapperDiv);
    headlineDiv = document.createElement('div');
    headlineDiv.id = `gvg${name}Headline`;
    headlineDiv.className = `collapsed${!collapse.collapseGVGinfo ? ' show' : ''}`;
    wrapperDiv.appendChild(headlineDiv);
    headlineDiv.innerHTML = `<p id="gvg${name}TextLabel" href="#gvg${name}Text" data-bs-toggle="collapse">
      ${element.icon('gvg' + name + 'Icon', 'gvg' + name + 'Text', collapse.collapseGVGinfo)}
        <span id=gvg${name}HeadlineText><strong>${text}:</strong></span></p>`;
    textDiv = document.createElement('div');
    textDiv.id = `gvg${name}Text`;
    textDiv.className = `collapsed${!collapseVar ? ' show' : ''}`;
    wrapperDiv.appendChild(textDiv);
  }
}

export function deploySiegeArmy(msg: Record<string, unknown>) {
  console.debug('Siege Placed', msg);
}
export function grantIndependence(msg: Record<string, unknown>) {
  console.debug('Grant Freedom', msg);
}
