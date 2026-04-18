export function handleClanBattleServiceRequest(msg, deps) {
  if (!msg || msg.requestClass !== 'ClanBattleService') {
    return false;
  }

  const {
    clearForGVG,
    getContinent,
    getProvinceDetailed,
    deploySiegeArmy,
    grantIndependence,
  } = deps;

  if (msg.requestMethod == 'getContinent') {
    clearForGVG();
    getContinent(msg);
  } else if (msg.requestMethod == 'getProvinceDetailed') {
    getProvinceDetailed(msg);
  } else if (msg.requestMethod == 'deploySiegeArmy') {
    deploySiegeArmy(msg);
  } else if (msg.requestMethod == 'grantIndependence') {
    grantIndependence(msg);
  } else {
    return false;
  }

  return true;
}
