import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
} from './GreatBuildingsService.js';

export function handleGreatBuildingsServiceRequest(
  msg,
  request,
  safeJsonParse,
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

  return false;
}
