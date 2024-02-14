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

import { gvg, MyInfo } from "../index.js";
import { toolOptions, setGVGSize } from "../fn/globals.js";
import { showOptions } from "../vars/showOptions.js";
import * as collapse from "../fn/collapse.js";
import * as element from "../fn/AddElement";
import { fGVGagesname } from "../fn/helper.js";
import BigNumber from "bignumber.js";

export var gvgContainer = null;
export var gvgSummary = null;
export var gvgAges = null;
var gvgPower = [];
var gvgPowerAll = [];
var gvgAgeNotloadList = ["AA", "FE", "TE", "CE", "PME", "ME", "PE", "InA", "CA", "LMA", "HMA", "EMA", "IA"];

export function getContinent(msg) {
  // console.debug(gvg,gvgContainer,gvgSummary,document.getElementById("gvgInfo"));
  // console.debug(gvg,gvgContainer,gvgSummary,gvgAges);

  // collapseOptions('collapseGVGinfo',false);

  if (gvgContainer == null) {
    console.debug("1");
    gvgContainer = document.createElement("div");
    gvg.appendChild(gvgContainer);
    gvgSummary = document.createElement("div");
    gvgContainer.appendChild(gvgSummary);
  }

  if (document.getElementById("gvgInfo") == null) {
    console.debug("2");
    gvgContainer = document.createElement("div");
    gvgContainer.id = "gvgInfo";
    gvgContainer.className = "alert alert-success alert-dismissible show collapsed";
    gvgContainer.innerHTML = `${element.close()}
        <p id="gvgInfoTextLabel" href="#gvgInfoText" data-bs-toggle="collapse">
      ${element.icon("gvgInfoIcon", "gvgInfoText", collapse.collapseGVGinfo)}
        <strong><span data-i18n="summary">GvG Summary</span>:</strong></p>`;
    gvg.appendChild(gvgContainer);
    gvgSummary = document.createElement("div");
    gvgContainer.appendChild(gvgSummary);
    document.getElementById("gvgInfoTextLabel").addEventListener("click", collapse.fCollapseGVGinfo);
    // document.getElementById("content").appendChild(gvg);
  }

  if (showOptions.showGVG) {
    const map = msg.responseData.continent;
    var gvgAges_copy = null;

    // gvgContainer.innerHTML = `<p>`;
    if (document.getElementById("gvgInfoText") == null) {
      gvgSummary = document.createElement("div");
      gvgSummary.id = "gvgInfoText";
      gvgSummary.className = `collapse${!collapse.collapseGVGinfo ? " show" : ""}`;
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
      gvgSummary,
      collapse.fcollapseGVGOverview,
      collapse.collapseGVGOverview,
      "Overview",
      "GvG Guild Ages Summary"
    );
    buildGvgInnerDiv(
      gvgSummary,
      collapse.fcollapseGVGGuildPower,
      collapse.collapseGVGGuildPower,
      "GuildPower",
      "GvG Guild Power"
    );
    buildGvgInnerDiv(gvgSummary, collapse.fcollapseGVGCurrAge, collapse.collapseGVGCurrAge, "CurrAge", "Live Status");
    buildGvgInnerDiv(
      gvgSummary,
      collapse.fcollapseGVGAllGuildsPower,
      collapse.collapseGVGAllGuildsPower,
      "AllGuildsPower",
      "Guild Ranking Live Status"
    );

    // console.debug(gvg,gvgContainer,document.getElementById("gvgInfo"));
    // var clanHTML = gvg.outerHTML;
    // console.debug(clanHTML);
    // if(clanHTML = null){
    var clanHTML = `<p id='gvgOverviewTextP'>`;
    // console.debug(msg.responseData);
    // }
    let count = 0;
    clanHTML += `Rank ${msg.responseData.clan_data.global_clan_rank}`;
    map.provinces.forEach((era) => {
      // console.debug(era.era);
      count = 0;
      era.sectors.forEach((sector) => {
        if (sector.owner_id === MyInfo.guildID) {
          count++;
          // console.debug(sector.sector_id);
        }
      });
      if (count) {
        const siege = Math.round((3 * Math.pow(count, 1.5) + 0.045 * Math.pow(count, 3.1)) / 5 + 1) * 5 * 5;
        // const siege = BigNumber((3 * Math.pow(count,1.5) + 0.045 * Math.pow(count,3.1)) / 5 + 1).times(5).dp(0);
        const eraName = fGVGagesname(era.era);
        if (era.era == "AllAge") clanHTML += `<br>AA: ${count} sect, ${siege} medals`;
        else clanHTML += `<br>${eraName}: ${count} sect, ${siege} total goods`;
      }
    });
    clanHTML += `</p>`;
    var gvgOverviewText = document.getElementById("gvgOverviewText");
    gvgOverviewText.innerHTML = clanHTML;

    $("body").i18n();
  } else {
    console.debug(msg.responseData.length);
  }
  // console.debug(gvgSummary,gvgAges);
  // gvgSummary.appendChild(gvgAges);
}

export function getProvinceDetailed(msg) {
  // if(!clanHTML){
  // clanHTML = `<div id="gvgTitle" class="alert alert-success alert-dismissible show collapsed" role="alert">${element.close()}<p id="gvgTextLabel" href="#gvgText" data-bs-toggle="collapse"><svg class="bi alert-warning" id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseStats ? 'plus' : 'dash'}-circle"/></svg><strong>GvG Power:</strong></p>`;
  // }
  // var clanHTML = `<p class="alert-success">`;
  // console.debug(msg.responseData);

  if (showOptions.showGVG) {
    var gvgGuildPowerTextDiv = document.getElementById("gvgGuildPowerText");

    // var clanHTML = gvgAges.innerHTML;
    var clanHTML = ``;
    var Guilds = [];
    var GuildSectors = [];
    var GuildPower = [];
    var GVGstatus = [];
    var gvgPowerAllSorted = [];
    // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
    const map = msg.responseData.province_detailed;
    // console.debug(map);
    var power = 0;
    var total = 0;
    const power0 = map.power_values[0];
    const power1 = map.power_values[1];
    const power2 = map.power_values[2];
    const power3 = map.power_values[3];

    gvgAgeNotloadList = gvgAgeNotloadList.filter((item) => item !== fGVGagesname(map.era));

    var ele = gvgPower.find((element) => element.era == map.era && element.power > 0);
    if (ele) ele.time = new Date().toLocaleString();
    else
      gvgPower.push({
        era: map.era,
        power: 0,
        time: new Date().toLocaleString(),
      });

    map.clans.forEach((clan) => {
      // console.debug(clan);

      Guilds[clan.id] = clan.name;
    });

    map.sectors.forEach((sector) => {
      // if(sector.__class__ == 'ClanBattleProvinceBaseSector')
      // if(sector.is_landing_zone == true)
      //     console.debug(sector);

      if (sector.is_fogged != true && sector.owner_id > 0) {
        power = 0;

        if (sector.power === 1) power = power1;
        else if (sector.power === 2) power = power2;
        else if (sector.power === 3) power = power3;
        else power = power0;

        if (GuildSectors[sector.owner_id]) GuildSectors[sector.owner_id]++;
        else GuildSectors[sector.owner_id] = 1;

        if (GuildPower[sector.owner_id]) GuildPower[sector.owner_id] += power;
        else GuildPower[sector.owner_id] = power;

        // console.debug(sector, GuildPower,power);
        // console.debug(sector, Guilds[sector.owner_id],GuildPower[sector.owner_id],power);
      }
    });
    // console.debug(MyInfo.guildID,Guilds[MyInfo.guildID],GuildPower[MyInfo.guildID],GuildPower);

    // map.top_clans.forEach( (clan,j) => {
    // 	if(clan.id == MyInfo.guildID)
    // 		 power = GuildPower[MyInfo.guildID] * (1 + ((3 - j)/20));
    // });

    Guilds.forEach((clan, j) => {
      // console.debug(clan);
      // console.debug(clan,GuildSectors[j],GuildPower[j]);
      GVGstatus.push({
        id: j,
        name: clan,
        sectors: GuildSectors[j]??0,
        power: GuildPower[j]??0,
      });
    });

    GVGstatus.sort(function (a, b) {
      return (b.power ??0) - (a.power ??0);
    });

    GVGstatus.forEach((clan, j) => {
      // if(j < 3) clan.power =  Math.round(clan.power*(1 + ((3 - j)/20)));
      if (j < 3)
        clan.power = BigNumber(clan.power)
          .times(1 + (3 - j) / 20)
          .dp(0);
      if (clan.name == MyInfo.guild) gvgPower.find((element) => element.era == map.era).power = clan.power;
      if (!gvgPowerAll[clan.id]) gvgPowerAll[clan.id] = { name: clan.name, powerList: [] };
      gvgPowerAll[clan.id].powerList[map.era] = clan.power;
    });
    gvgPower.sort(function (a, b) {
      return new Date(b.time) - new Date(a.time);
    });

    // if(!gvgPower[map.era]){
    // 	gvgPower.push([map.era,Math.round(power)]);
    // }
    // else
    clanHTML = '<p id="gvgGuildPowerTextP" class="overflow">';
    gvgPower.forEach((age) => {
      if (age.power > 0) {
        if (age.era == map.era) clanHTML += `<strong>${fGVGagesname(map.era)}</strong>:</span> ${age.power}<br>`;
        // clanHTML += `<strong>${fGVGagesname(map.era)}</strong>:</span> ${age.power} (Updated at ${age.time})<br>`;
        else clanHTML += `${fGVGagesname(age.era)}: ${age.power}<br>`;
        // clanHTML += `${fGVGagesname(age.era)}: ${age.power} (Updated at ${age.time}<br>`;
        total += +age.power;
      }
    });

    clanHTML += `Total: ${total}</p>`;
    gvgGuildPowerTextDiv.innerHTML = clanHTML;

    Object.keys(gvgPowerAll).forEach((clan) => {
      let clanTotal = 0;
      Object.keys(gvgPowerAll[clan].powerList).forEach((era) => {
        clanTotal += +gvgPowerAll[clan].powerList[era];
      });
      gvgPowerAll[clan].total = clanTotal;
    });
    gvgPowerAllSorted = copy(gvgPowerAll);
    gvgPowerAllSorted.sort(function (a, b) {
      return (b.total ??0) - (a.total ??0);
    });

    // console.debug(gvgPowerAllSorted);
    // GuildPower.forEach( (clan,j) => {
    // 	// console.debug(clan);
    // 	console.debug(Guilds[j],GuildSectors[j],clan);
    // });

    clanHTML = `<strong>${fGVGagesname(map.era)} <span data-i18n="livestatus">Live Status</span></strong>`;
    var gvgGuildPowerTextDiv = document.getElementById("gvgCurrAgeHeadlineText");
    gvgGuildPowerTextDiv.innerHTML = clanHTML;

    clanHTML = '<p id="gvgCurrAgeTextP" style="height: 200px" class="overflow">';
    // clanHTML += `<strong>${map.era}</strong><br>`;
    GVGstatus.forEach((clan, j) => {
      clanHTML += `${j + 1} ${clan.name}:  ${Math.round(clan.power)} (${clan.sectors})<br>`;
    });
    // }
    // clanHTML += `<br>`;
    clanHTML += `</p>`;

    var gvgCurrAgeTextDiv = document.getElementById("gvgCurrAgeText");
    gvgCurrAgeTextDiv.innerHTML = clanHTML;

    var gvgAllGuildsPowerTextDiv = document.getElementById("gvgAllGuildsPowerText");

    clanHTML = `<p id="gvgAllGuildsPowerTextP" style="height: 200px" class="overflow">`;
    document.getElementById("gvgWarnGuildPower")?.remove();
    document.getElementById("gvgWarnAllGuildPower")?.remove();
    if (gvgAgeNotloadList.length > 0) {
      var gvgWarnFunc = (id) =>
        `<span id="gvgWarn${id}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${gvgAgeNotloadList.toString()} were not loaded yet"><span>    </span>
        <span class="material-icons-outlined md-18 gvg-warn">warning</span></span> `;
      var headlineSpan = document.getElementById("gvgGuildPowerHeadlineText");
      if (headlineSpan.innerHTML) headlineSpan.innerHTML = gvgWarnFunc("GuildPower") + headlineSpan.innerHTML;
      headlineSpan = document.getElementById("gvgAllGuildsPowerHeadlineText");
      if (headlineSpan.innerHTML) headlineSpan.innerHTML = gvgWarnFunc("AllGuildPower") + headlineSpan.innerHTML;
    }

    Object.keys(gvgPowerAllSorted).forEach((clan, j) => {
      clanHTML += `${j + 1} ${gvgPowerAllSorted[clan].name}:  ${Math.round(gvgPowerAllSorted[clan].total)}<br>`;
    });
    // }
    // clanHTML += `<br>`;
    clanHTML += `</p>`;
    gvgAllGuildsPowerTextDiv.innerHTML = clanHTML;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height) setGVGSize(entry.contentRect.height);
      }
    });
    resizeObserver.observe(document.getElementById("gvgOverviewTextP"));
    resizeObserver.observe(document.getElementById("gvgGuildPowerTextP"));
    resizeObserver.observe(document.getElementById("gvgCurrAgeTextP"));
    resizeObserver.observe(document.getElementById("gvgAllGuildsPowerTextP"));
    $("body").i18n();

    // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
  } else {
    console.debug(msg.responseData.length);
  }
}

function copy(aObject) {
  // Prevent undefined objects
  // if (!aObject) return aObject;

  let bObject = Array.isArray(aObject) ? [] : {};

  let value;
  for (const key in aObject) {
    // Prevent self-references to parent object
    // if (Object.is(aObject[key], aObject)) continue;

    value = aObject[key];

    bObject[key] = typeof value === "object" ? copy(value) : value;
  }

  return bObject;
}

function buildGvgInnerDiv(parentDiv, collapseFunc, collapseVar, name, text) {
  var wrapperDiv;
  var headlineDiv;
  var textDiv;

  if (document.getElementById(`gvg${name}Wrapper`)) {
    var label = document.getElementById(`gvg${name}TextLabel`);
    label.addEventListener("click", collapseFunc);
  } else {
    wrapperDiv = document.createElement("div");
    wrapperDiv.id = `gvg${name}Wrapper`;
    wrapperDiv.className = `alert alert-success nopadding collapse${!collapse.collapseGVGinfo ? " show" : ""}`;
    parentDiv.appendChild(wrapperDiv);
    headlineDiv = document.createElement("div");
    headlineDiv.id = `gvg${name}Headline`;
    headlineDiv.className = `collapsed${!collapse.collapseGVGinfo ? " show" : ""}`;
    wrapperDiv.appendChild(headlineDiv);
    headlineDiv.innerHTML = `<p id="gvg${name}TextLabel" href="#gvg${name}Text" data-bs-toggle="collapse">
      ${element.icon("gvg" + name + "Icon", "gvg" + name + "Text", collapse.collapseGVGinfo)}
        <span id=gvg${name}HeadlineText><strong>${text}:</strong></span></p>`;
    textDiv = document.createElement("div");
    textDiv.id = `gvg${name}Text`;
    textDiv.className = `collapsed${!collapseVar ? " show" : ""}`;
    wrapperDiv.appendChild(textDiv);
  }
}

export function deploySiegeArmy(msg) {
  console.debug("Siege Placed", msg);
}
export function grantIndependence(msg) {
  console.debug("Grant Freedom", msg);
}
