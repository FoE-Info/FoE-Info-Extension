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
import '../css/options.scss';
// import "bootstrap/scss/bootstrap";

const showOptions = {
  showFriends: true,
  showGuild: true,
  showHood: true,
  showBonus: true,
  showIncidents: true,
  showGVG: true,
  showStats: true,
  showGBInfo: false,
  showGBRewards: true,
  showGBDonors: true,
  showInvested: true,
  showDonation: true,
  showBattleground: true,
  showBattlegroundChanges: false,
  showExpedition: true,
  showTreasury: true,
  showVisit: true,
  showSettlement: true,
  showArmy: true,
  showGoods: false,
  showLeaderboard: false,
  showGBGrewards: true,
  GBGprovinceTime: true,
  GBGshowSC: true,
  showGErewards: true,
  showRewards: true,
  showLogs: false,
  showContributions: true,
  showGuildPosition: false,
  hideUnsafe: true,
  buildingCosts: false,
  collectionTimes: false
};

// Saves options to browser.storage
function save_options() {
  var showOptions = [];
  var tool = [];
  var toolOptions = [];
  var url = [];
  showOptions.showBonus = document.getElementById('bonus').checked;
  showOptions.showIncidents = document.getElementById('Incidents').checked;
  showOptions.showGVG = document.getElementById('GvG').checked;
  showOptions.showStats = document.getElementById('Stats').checked;
  showOptions.showGBInfo = document.getElementById('GBInfo').checked;
  showOptions.showGBRewards = document.getElementById('GBRewards').checked;
  showOptions.showGBDonors = document.getElementById('GBDonors').checked;
  showOptions.showInvested = document.getElementById('Invested').checked;
  showOptions.showDonation = document.getElementById('Donation').checked;
  showOptions.showFriends = document.getElementById('Friends').checked;
  showOptions.showGuild = document.getElementById('Guild').checked;
  showOptions.showHood = document.getElementById('Hood').checked;
  showOptions.showBattleground = document.getElementById('Battleground').checked;
  showOptions.showExpedition = document.getElementById('Expedition').checked;
  showOptions.showTreasury = document.getElementById('Treasury').checked;
  showOptions.showVisit = document.getElementById('visit').checked;
  showOptions.showSettlement = document.getElementById('settlement').checked;
  showOptions.showArmy = document.getElementById('army').checked;
  showOptions.showGoods = document.getElementById('goods').checked;
  showOptions.showLeaderboard = document.getElementById('leaderboard').checked;
  showOptions.showGBGrewards = document.getElementById('GBGrewards').checked;
  showOptions.GBGprovinceTime = document.getElementById('GBGprovinceTime').checked;
  showOptions.GBGshowSC = document.getElementById('GBGshowSC').checked;
  showOptions.showGErewards = document.getElementById('GErewards').checked;
  showOptions.showRewards = document.getElementById('rewards').checked;
  showOptions.showLogs = document.getElementById('logs').checked;
  showOptions.showContributions = document.getElementById('contributions').checked;
  showOptions.showGuildPosition = document.getElementById('donationGuildPosition').checked;
  showOptions.hideUnsafe = document.getElementById('hideUnsafe').checked;
  showOptions.buildingCosts = document.getElementById('buildingCosts').checked;
  showOptions.collectionTimes = document.getElementById('collectionTimes').checked;
  //  showOptions.show = document.getElementById('').checked;
  //  showOptions.show = document.getElementById('').checked;
  //  showOptions.show = document.getElementById('').checked;

  tool.language = document.getElementById('language').value;
  var targets = document.getElementById('targets').value;
  var targetText = document.getElementById('targetText').value;
  var donationPercent = document.getElementById('donationPercent').value;
  if (donationPercent > 200) donationPercent = 200;
  var donationSuffix = document.getElementById('donationSuffix').value;
  toolOptions.minSize = document.getElementById('minSize').value;
  //  console.debug(localOptions);
  // var defaultArcBonus = document.getElementById('defaultArcBonus').value;

  // Discord Webhooks
  url.discordTargetURL = document.getElementById('discordTargetURL').value;

  // Google Sheets
  url.sheetGuildURL = document.getElementById('sheetGuildURL').value;
  // url.sheetCityURL = document.getElementById('sheetCityURL').value;
  // url.sheetGameURL = document.getElementById('sheetGameURL').value;

  setStorage(showOptions);

  browser.storage.local.set({
    tool: {
      language: tool.language
    },
    targets: targets,
    targetText: targetText,
    toolOptions: {
      minSize: toolOptions.minSize
    },
    donationPercent: donationPercent,
    donationSuffix: donationSuffix,
    url: {
      discordTargetURL: url.discordTargetURL,
      sheetGuildURL: url.sheetGuildURL,
      // sheetCityURL: url.sheetCityURL,
      // sheetGameURL: url.sheetGameURL
    },
  }).then(() => {
    // console.debug(`Value is set to`, value);
  });

}

// Restores select box and checkbox state using the preferences
// stored in browser.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.

  // if(DEV) document.getElementById('urlDiv').style.display = "none";

  browser.storage.local.get(['showOptions', 'tool', 'url', 'targets', 'targetText', 'toolOptions', 'donationPercent', 'donationSuffix']).then((items) => {
    if (items.showOptions) {
      const showOptions = items.showOptions;
      fnShowOptions(showOptions);
    }
    else {
      setStorage(showOptions);
      fnShowOptions(showOptions);
    }
    if (items.tool) {
      document.getElementById('language').value = items.tool.language;
      console.debug(items.tool);
    }
    if (items.targets != null) {
      document.getElementById('targets').value = items.targets;
      console.debug(items.targets);
    }
    if (items.targetText != null) {
      document.getElementById('targetText').value = items.targetText;
      console.debug(items.targetText);
    }
    if (items.toolOptions) {
      document.getElementById('minSize').value = items.toolOptions.minSize;
      console.debug(items.toolOptions);
    }
    if (items.donationPercent) {
      document.getElementById('donationPercent').value = items.donationPercent;
      console.debug(items.donationPercent);
    }
    if (items.donationSuffix) {
      document.getElementById('donationSuffix').value = items.donationSuffix;
      console.debug(items.donationSuffix);
    }
    if (items.url) {
      const url = items.url;
      if (url.discordTargetURL)
        document.getElementById('discordTargetURL').value = url.discordTargetURL;
      if (url.sheetGuildURL)
        document.getElementById('sheetGuildURL').value = url.sheetGuildURL;
      // if(url.sheetCityURL)
      //    document.getElementById('sheetCityURL').value = url.sheetCityURL;
      // if(url.sheetGameURL)
      //    document.getElementById('sheetGameURL').value = url.sheetGameURL;

    }
  });
}


function fnShowOptions(showOptions) {
  document.getElementById('bonus').checked = showOptions.showBonus;
  document.getElementById('Incidents').checked = showOptions.showIncidents;
  document.getElementById('GvG').checked = showOptions.showGVG;
  document.getElementById('Stats').checked = showOptions.showStats;
  document.getElementById('GBInfo').checked = showOptions.showGBInfo;
  document.getElementById('GBRewards').checked = showOptions.showGBRewards;
  document.getElementById('GBDonors').checked = showOptions.showGBDonors;
  document.getElementById('Invested').checked = showOptions.showInvested;
  document.getElementById('Donation').checked = showOptions.showDonation;
  document.getElementById('Friends').checked = showOptions.showFriends;
  document.getElementById('Guild').checked = showOptions.showGuild;
  document.getElementById('Hood').checked = showOptions.showHood;
  document.getElementById('Battleground').checked = showOptions.showBattleground;
  document.getElementById('Expedition').checked = showOptions.showExpedition;
  document.getElementById('Treasury').checked = showOptions.showTreasury;
  document.getElementById('visit').checked = showOptions.showVisit;
  document.getElementById('settlement').checked = showOptions.showSettlement;
  document.getElementById('army').checked = showOptions.showArmy;
  document.getElementById('goods').checked = showOptions.showGoods;
  document.getElementById('leaderboard').checked = showOptions.showLeaderboard;
  document.getElementById('GBGrewards').checked = showOptions.showGBGrewards;
  document.getElementById('GBGprovinceTime').checked = showOptions.GBGprovinceTime;
  document.getElementById('GBGshowSC').checked = showOptions.GBGshowSC;
  document.getElementById('GErewards').checked = showOptions.showGErewards;
  document.getElementById('rewards').checked = showOptions.showRewards;
  document.getElementById('logs').checked = showOptions.showLogs;
  document.getElementById('contributions').checked = showOptions.showContributions;
  document.getElementById('donationGuildPosition').checked = showOptions.showGuildPosition;
  document.getElementById('hideUnsafe').checked = showOptions.hideUnsafe;
  document.getElementById('buildingCosts').checked = showOptions.buildingCosts;
  document.getElementById('collectionTimes').checked = showOptions.collectionTimes;

}


// function setStorage(value){
//   // console.debug(value);
//     browser.storage.local.set({
//       showOptions: {
//         'showIncidents': value.showIncidents,
//         'showGVG': value.showGVG,
//         'showGBInfo': value.showGBInfo,
//         'showGBRewards': value.showGBRewards,
//         'showGBDonors': value.showGBDonors,
//         'showInvested': value.showInvested,
//         'showDonation': value.showDonation,
//         'showFriends': value.showFriends,
//         'showGuild': value.showGuild,
//         'showHood': value.showHood,
//         'showStats': value.showStats,
//         'showBattleground' : value.showBattleground,
//         'showExpedition' : value.showExpedition,
//         'showTreasury' : value.showTreasury,
//         'showVisit': value.showVisit,
//         'showSettlement': value.showSettlement,
//         'showArmy': value.showArmy,
//         'showLeaderboard': value.showLeaderboard,
//         'showGBGrewards': value.showGBGrewards,
//         'showGErewards': value.showGErewards,
//         'showRewards': value.showRewards,
//         'showLogs': value.showLogs
//                    }
//     }, function() {
//     // console.debug(`Value is set to`, value);
//     });

//   // browser.storage.local.get(null, function(items) {
//     // console.debug(items);
//   // });
// }


function setStorage(value) {
  // console.debug(value);
  browser.permissions.request({
    permissions: ['storage']
  }).then((granted) => {
    if (granted) {
      // The extension has the permissions.
      browser.storage.local.set({
        showOptions: {
          'showBonus': value.showBonus,
          'showIncidents': value.showIncidents,
          'showGVG': value.showGVG,
          'showGBInfo': value.showGBInfo,
          'showGBRewards': value.showGBRewards,
          'showGBDonors': value.showGBDonors,
          'showInvested': value.showInvested,
          'showDonation': value.showDonation,
          'showFriends': value.showFriends,
          'showGuild': value.showGuild,
          'showHood': value.showHood,
          'showStats': value.showStats,
          'showBattleground': value.showBattleground,
          'showExpedition': value.showExpedition,
          'showTreasury': value.showTreasury,
          'showVisit': value.showVisit,
          'showSettlement': value.showSettlement,
          'showArmy': value.showArmy,
          'showGoods': value.showGoods,
          'showLeaderboard': value.showLeaderboard,
          'showGBGrewards': value.showGBGrewards,
          'GBGprovinceTime': value.GBGprovinceTime,
          'GBGshowSC': value.GBGshowSC,
          'showGErewards': value.showGErewards,
          'showRewards': value.showRewards,
          'showLogs': value.showLogs,
          'showContributions': value.showContributions,
          'showGuildPosition': value.showGuildPosition,
          'hideUnsafe': value.hideUnsafe,
          'buildingCosts': value.buildingCosts,
          'collectionTimes': value.collectionTimes
        }
      }).then(() => {
        // console.debug(`Value is set to`, value);
      });
    } else {
      // The extension doesn't have the permissions.
    }
  });

  // browser.storage.local.get(null, function(items) {
  // console.debug(items);
  // });
}



document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
