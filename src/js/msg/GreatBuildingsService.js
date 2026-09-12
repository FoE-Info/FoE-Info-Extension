// import '../../css/main.css';
import { calculateArcReward } from '../calc/GreatBuildingCalculator.js';
import * as element from '../fn/AddElement.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import * as GreatBuildingRegistry from '../state/GreatBuildingRegistry.js';
import { greatBuildingsState } from '../state/GreatBuildingsState.js';
import { showOptions } from '../vars/showOptions.js';
import {
  cityrewards,
  donation2DIV,
  donationDIV,
  donationPercent,
  donationSuffix,
  GameOrigin,
  gbInfoDIV,
  GBselected,
  getPlayerName,
  greatbuilding,
  MyInfo,
  PlayerID,
  PlayerName,
  setPlayerName,
  url,
} from '../vars/state.js';
import * as GbDonationService from './GbDonationService.js';
import { getContributions } from './InvestedService.js';
import { City } from './StartupService.js';

export { getContributions } from './InvestedService.js';

var Top = [0, 0, 0, 0, 0, 0];
var GBrewards = [0, 0, 0, 0, 0];
var Reward = [0, 0, 0, 0, 0];
var currentPercent = donationPercent ? donationPercent : 190;
var googleSheetGame = '';
var rankings;
var availablePackageForgePoints = 0;

if (url && url.hasOwnProperty('sheetGameURL'))
  googleSheetGame = url.sheetGameURL;

function syncRankingPayload(msg, rankingParams, extractedLevel) {
  if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
    GBselected.level = extractedLevel;
  }

  const myId = MyInfo?.id || 0;
  const myName = MyInfo?.name || MyInfo?.player_name || '';
  const isForeign =
    rankingParams?.playerId !== undefined &&
    rankingParams.playerId !== null &&
    rankingParams.playerId !== 0 &&
    rankingParams.playerId !== myId;

  const pId = isForeign ? rankingParams.playerId : 0;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;

  if (
    msg?.responseData &&
    typeof msg.responseData === 'object' &&
    !Array.isArray(msg.responseData)
  ) {
    GbDonationService.syncGbSelected(GBselected, msg.responseData);
    GreatBuildingRegistry.registerGreatBuilding(msg.responseData, pId);
    if (pId === 0 && myId) {
      GreatBuildingRegistry.registerGreatBuilding(msg.responseData, myId);
    }
  }

  if (Array.isArray(msg?.responseData?.rankings)) {
    rankings = msg.responseData.rankings;
  } else if (Array.isArray(msg?.responseData)) {
    rankings = msg.responseData;
  } else if (Array.isArray(msg)) {
    rankings = msg;
  } else if (!Array.isArray(rankings)) {
    rankings = [];
  }

  let cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
  if (!cached && pId === 0 && myId) {
    cached = GreatBuildingRegistry.getGreatBuilding(myId, eId);
  }
  if (!cached && eId) {
    cached = GreatBuildingRegistry.getGreatBuilding(null, eId);
  }
  if (!cached && pId) {
    cached = GreatBuildingRegistry.getGreatBuilding(pId, null);
  }

  if (cached) {
    if (pId === 0) {
      if (!cached.player && myId) cached.player = myId;
      if (!cached.player_name && myName) cached.player_name = myName;
    }
    GbDonationService.syncGbSelected(GBselected, cached);
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    const resolvedName = cached.player_name || (pId === 0 ? myName : '') || '';
    const resolvedId = cached.player || (pId === 0 ? myId : pId) || 0;
    if (resolvedName || resolvedId) {
      setPlayerName(resolvedName, resolvedId);
    }
  } else if (eId && eId !== GBselected.id) {
    GBselected.id = eId;
    GBselected.entity_id = eId;
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    if (pId === 0) {
      GBselected.player = myId;
      GBselected.player_name = myName;
      setPlayerName(myName, myId);
    } else {
      GBselected.player = pId;
      const foreignName = getPlayerName(pId) || '';
      GBselected.player_name = foreignName;
      setPlayerName(foreignName, pId);
    }
  }

  if (
    (!GBselected.total || GBselected.total === 0) &&
    GBselected.cityentity_id &&
    GBselected.level > 0
  ) {
    GBselected.total = GreatBuildingRegistry.calculateLevelCost(
      GBselected.cityentity_id,
      GBselected.level,
    );
  }
}

export function getConstruction(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  if (
    (!GBselected.current || GBselected.current === 0) &&
    Array.isArray(rankings)
  ) {
    const investedSum = (rankings || []).reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );
    if (investedSum > 0) GBselected.current = investedSum;
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function contributeForgePoints(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  GbDonationService.updateContributionProgress(
    GBselected,
    rankings,
    rankingParams,
    PlayerID,
  );

  const pId = rankingParams?.playerId || GBselected.player || PlayerID;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;
  if (eId) {
    const cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
    if (cached) {
      cached.current = GBselected.current;
      cached.current_progress = GBselected.current;
    }
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function showGreatBuldingDonation() {
  fCheckOutput();
  if (!Array.isArray(rankings)) {
    rankings = [];
  }

  greatBuildingsState.setDonors({
    GBselected,
    rankings,
    showOptions,
    greatbuilding,
    Top,
    GBrewards,
    Reward,
    City,
    PlayerID,
    playerName: PlayerName || GBselected.player_name,
    setPlayerName,
    helper,
    element,
    collapse,
    copy,
    calculateArcReward,
  });
  greatBuildingsState.setInfo({
    targetEl: gbInfoDIV,
    gbData: GBselected,
    playerName: PlayerName,
    showOptions,
  });

  greatBuildingsState.setDonation({
    GBselected,
    showOptions,
    donationDIV,
    donation2DIV,
    Top,
    GBrewards,
    currentPercent,
    City,
    PlayerID,
    PlayerName,
    MyInfo,
    donationSuffix,
    availablePackageForgePoints,
    onRerender: showGreatBuldingDonation,
  });
}

export function getConstructionRanking(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
    GBselected.level = extractedLevel;
  }
  if (Array.isArray(msg?.responseData)) {
    rankings = msg.responseData;
  } else if (Array.isArray(msg)) {
    rankings = msg;
  } else if (Array.isArray(msg?.responseData?.rankings)) {
    rankings = msg.responseData.rankings;
  }

  const myId = MyInfo?.id || 0;
  const myName = MyInfo?.name || MyInfo?.player_name || '';
  const isForeign =
    rankingParams?.playerId !== undefined &&
    rankingParams.playerId !== null &&
    rankingParams.playerId !== 0 &&
    rankingParams.playerId !== myId;

  const pId = isForeign ? rankingParams.playerId : 0;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;

  let cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
  if (!cached && pId === 0 && myId) {
    cached = GreatBuildingRegistry.getGreatBuilding(myId, eId);
  }
  if (!cached && eId) {
    cached = GreatBuildingRegistry.getGreatBuilding(null, eId);
  }
  if (!cached && pId) {
    cached = GreatBuildingRegistry.getGreatBuilding(pId, null);
  }

  if (cached) {
    if (pId === 0) {
      if (!cached.player && myId) cached.player = myId;
      if (!cached.player_name && myName) cached.player_name = myName;
    }
    GbDonationService.syncGbSelected(GBselected, cached);
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    const resolvedName = cached.player_name || (pId === 0 ? myName : '') || '';
    const resolvedId = cached.player || (pId === 0 ? myId : pId) || 0;
    if (resolvedName || resolvedId) {
      setPlayerName(resolvedName, resolvedId);
    }
  } else if (eId && eId !== GBselected.id) {
    GBselected.id = eId;
    GBselected.entity_id = eId;
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    if (pId === 0) {
      GBselected.player = myId;
      GBselected.player_name = myName;
      setPlayerName(myName, myId);
    } else {
      GBselected.player = pId;
      const foreignName = getPlayerName(pId) || '';
      GBselected.player_name = foreignName;
      setPlayerName(foreignName, pId);
    }
  }

  if (
    (!GBselected.total || GBselected.total === 0) &&
    GBselected.cityentity_id &&
    GBselected.level > 0
  ) {
    GBselected.total = GreatBuildingRegistry.calculateLevelCost(
      GBselected.cityentity_id,
      GBselected.level,
    );
  }

  if (
    (!GBselected.current || GBselected.current === 0) &&
    Array.isArray(rankings)
  ) {
    const investedSum = (rankings || []).reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );
    if (investedSum > 0) GBselected.current = investedSum;
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function handleNewReward(msg) {
  return GbDonationService.handleNewReward(msg, showOptions, cityrewards);
}

export function getAvailablePackageForgePoints(msg) {
  const data = msg?.responseData ?? msg;
  const raw = Array.isArray(data) ? data[0] : data;
  availablePackageForgePoints = Number(raw) || 0;
  return availablePackageForgePoints;
}

export function getAvailablePackageFp() {
  return availablePackageForgePoints;
}

export function fCheckOutput() {
  // Output repair and container safeguard are handled reactively
  // in src/js/ui/greatBuildingsRenderBinding.js via gbOutputRepair.js.
}

export function setCurrentPercent(percent) {
  if (percent) currentPercent = percent;
  else currentPercent = donationPercent;
  console.debug(percent);
}

export default {
  getConstruction,
  contributeForgePoints,
  showGreatBuldingDonation,
  getConstructionRanking,
  setCurrentPercent,
  getContributions,
  fCheckOutput,
  getAvailablePackageForgePoints,
  getAvailablePackageFp,
};
