import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
} from './GreatBuildingsService.js';
import BigNumber from 'bignumber.js';

export function handleGreatBuildingsServiceRequest(
  msg,
  request,
  safeJsonParse,
  deps,
) {
  if (!msg || msg.requestClass !== 'GreatBuildingsService') {
    return false;
  }

  if (msg.requestMethod === 'getConstructionRanking') {
    const constructionRankingData =
      safeJsonParse?.(
        request?.request?.postData?.text,
        'GreatBuildingsService.getConstructionRanking requestData',
      ) || [];

    getConstructionRanking(msg, constructionRankingData);
    return true;
  }

  if (msg.requestMethod === 'getConstruction') {
    getConstruction(msg);
    return true;
  }

  if (msg.requestMethod === 'contributeForgePoints') {
    console.debug('msg:', msg);
    contributeForgePoints(msg.responseData);
    return true;
  }

  if (msg.requestMethod === 'getContributions') {
    const {
      showOptions,
      cityinvested,
      City,
      availablePacksFP,
      availableFP,
      element,
      collapse,
      copy,
    } = deps;

    var reward = 0;
    var invested = 0;
    var cityinvestedHTML = ``;
    cityinvested.innerHTML = ``;
    if (showOptions.showInvested && msg.responseData.length) {
      var numGB = 0;
      for (var j = 0; j < msg.responseData.length; j++) {
        invested += msg.responseData[j].forge_points;
        if (msg.responseData[j].rank < 6) {
          if (
            msg.responseData[j].reward.strategy_point_amount &&
            msg.responseData[j].forge_points > 9
          ) {
            reward += msg.responseData[j].reward.strategy_point_amount;
            numGB++;
          }
          console.debug(
            'invested: ',
            numGB,
            msg.responseData[j].forge_points,
            invested,
            reward,
          );
        }
      }
      const rewardBonus = BigNumber(City.ArcBonus)
        .div(100)
        .plus(1)
        .times(reward)
        .dp(0);
      console.debug(
        BigNumber(City.ArcBonus),
        BigNumber(City.ArcBonus).div(100),
        BigNumber(City.ArcBonus).div(100).plus(1),
        BigNumber(City.ArcBonus).div(100).plus(1).times(reward),
      );
      console.debug(
        availablePacksFP(),
        availableFP,
        reward,
        invested,
        rewardBonus,
      );
      cityinvestedHTML = `<div id="investedDiv" class="alert alert-success alert-dismissible collapsed" role="alert">`;
      cityinvestedHTML += element.close();
      cityinvestedHTML += `<p id="investedTextLabel" href="#investedText" aria-expanded="true" aria-controls="investedText" data-bs-toggle="collapse">`;
      cityinvestedHTML += element.icon(
        'investedicon',
        'investedText',
        collapse.collapseInvested,
      );
      cityinvestedHTML += `<strong>FP Status: </strong><span id="onHandFP">${
        collapse.collapseInvested ? availablePacksFP() + availableFP : ''
      }</span></p>`;
      cityinvestedHTML += element.copy(
        'investedCopyID',
        'success',
        'right',
        collapse.collapseInvested,
      );
      cityinvestedHTML += `<div id="investedText" class="collapse ${
        collapse.collapseInvested ? '' : 'show'
      }">`;
      cityinvestedHTML += `On Hand FP: <span id="onHandFP2">${
        availablePacksFP() + availableFP
      }</span><br>`;
      cityinvestedHTML += `FP Invested: ${invested} (${numGB} GB)<br>`;
      if (City.ArcBonus > 90)
        cityinvestedHTML += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards:</span>: ${rewardBonus} (+${City.ArcBonus}%)`;
      else
        cityinvestedHTML += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards:</span>: ${rewardBonus}`;
      cityinvestedHTML += `<br>Total FP: ${
        availablePacksFP() + availableFP + Number(rewardBonus)
      }</p>`;

      cityinvested.innerHTML = cityinvestedHTML + `</div></div>`;
      document
        .getElementById('investedTextLabel')
        .addEventListener('click', collapse.fCollapseInvested);
      document
        .getElementById('investedCopyID')
        .addEventListener('click', copy.fInvestedCopy);
      $('#investedDiv').i18n();
    }

    return true;
  }

  if (msg.requestMethod === 'getOtherPlayerOverview') {
    if (msg.responseData.length) {
      for (var j = 0; j < msg.responseData.length; j++) {
        var player = msg.responseData[j].player;
        deps.setPlayerName(player.name, player.player_id);
      }
    }
    return true;
  }

  if (msg.requestMethod === 'getAvailablePackageForgePoints') {
    deps.setAvailablePacksFP(msg.responseData[0]);
    deps.setAvailableFPText();
    return true;
  }

  return false;
}
