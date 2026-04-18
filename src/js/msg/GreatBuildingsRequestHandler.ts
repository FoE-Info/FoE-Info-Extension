import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
} from './GreatBuildingsService';
import BigNumber from 'bignumber.js';
import { HandlerMessage } from './types';

type GreatBuildingsContribution = {
  forge_points: number;
  rank: number;
  reward?: {
    strategy_point_amount?: number;
  };
  player?: {
    name?: string;
    player_id?: number;
  };
};

type GreatBuildingsRequest = {
  request?: {
    postData?: {
      text?: string;
    };
  };
};

type GreatBuildingsMessage = HandlerMessage & {
  responseData?: unknown;
};

type GreatBuildingsDeps = {
  showOptions: {
    showInvested?: boolean;
  };
  cityinvested: {
    innerHTML: string;
  };
  City: {
    ArcBonus: number;
  };
  availablePacksFP: () => number;
  availableFP: number;
  element: {
    close: () => string;
    icon: (iconId: string, targetId: string, collapsed?: boolean) => string;
    copy: (
      elementId: string,
      color: string,
      placement: string,
      collapsed?: boolean,
    ) => string;
  };
  collapse: {
    collapseInvested?: boolean;
    fCollapseInvested: EventListener;
  };
  copy: {
    fInvestedCopy: EventListener;
  };
  setPlayerName: (name: string | undefined, playerId: number | undefined) => void;
  setAvailablePacksFP: (value: unknown) => void;
  setAvailableFPText: () => void;
};

export function handleGreatBuildingsServiceRequest(
  msg: GreatBuildingsMessage,
  request: GreatBuildingsRequest,
  safeJsonParse: ((raw: string | undefined, context: string) => unknown) | undefined,
  deps: GreatBuildingsDeps,
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
    const responseData = msg.responseData as GreatBuildingsContribution[];
    if (showOptions.showInvested && responseData.length) {
      var numGB = 0;
      for (var j = 0; j < responseData.length; j++) {
        invested += responseData[j].forge_points;
        if (responseData[j].rank < 6) {
          const strategyPointAmount = responseData[j].reward?.strategy_point_amount;
          if (
            strategyPointAmount &&
            responseData[j].forge_points > 9
          ) {
            reward += strategyPointAmount;
            numGB++;
          }
          console.debug(
            'invested: ',
            numGB,
            responseData[j].forge_points,
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
        .getElementById('investedTextLabel')!
        .addEventListener('click', collapse.fCollapseInvested);
      document
        .getElementById('investedCopyID')!
        .addEventListener('click', copy.fInvestedCopy);
      ($('#investedDiv') as JQuery & { i18n(): void }).i18n();
    }

    return true;
  }

  if (msg.requestMethod === 'getOtherPlayerOverview') {
    const responseData = msg.responseData as GreatBuildingsContribution[];
    if (responseData.length) {
      for (var j = 0; j < responseData.length; j++) {
        var player = responseData[j].player;
        deps.setPlayerName(player?.name, player?.player_id);
      }
    }
    return true;
  }

  if (msg.requestMethod === 'getAvailablePackageForgePoints') {
    deps.setAvailablePacksFP((msg.responseData as unknown[])[0]);
    deps.setAvailableFPText();
    return true;
  }

  return false;
}
