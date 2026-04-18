import * as storage from '../fn/storage.js';

export function handleInventoryServiceRequest(msg, deps) {
  if (!msg || msg.requestClass !== 'InventoryService') {
    return false;
  }

  const {
    CityEntityDefs,
    availableFP,
    setAvailablePacksFP,
  } = deps;

  if (msg.requestMethod == 'getGreatBuildings') {
    return true;
  }

  if (msg.requestMethod == 'getItems') {
    storage.set('CityEntityDefs', CityEntityDefs);
    var forgePoints = 0;
    if (msg.responseData.length) {
      for (var j = 0; j < msg.responseData.length; j++) {
        if (msg.responseData[j].name == '10 Forge Points')
          forgePoints += msg.responseData[j].inStock * 10;
        else if (msg.responseData[j].name == '5 Forge Points')
          forgePoints += msg.responseData[j].inStock * 5;
        else if (msg.responseData[j].name == '2 Forge Points')
          forgePoints += msg.responseData[j].inStock * 2;
      }
      setAvailablePacksFP(forgePoints);
      if (document.getElementById('availableFPID'))
        document.getElementById('availableFPID').textContent =
          forgePoints + availableFP;
    }
    return true;
  }

  return false;
}
