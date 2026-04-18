import * as storage from '../fn/storage.js';
import { HandlerMessage } from './types';

type InventoryItem = {
  name?: string;
  inStock?: number;
};

type InventoryMessage = HandlerMessage & {
  responseData?: InventoryItem[];
};

type InventoryDeps = {
  CityEntityDefs: Record<string, unknown>;
  availableFP: number;
  setAvailablePacksFP: (value: number) => void;
};

export function handleInventoryServiceRequest(
  msg: InventoryMessage,
  deps: InventoryDeps,
): boolean {
  if (!msg || msg.requestClass !== 'InventoryService') {
    return false;
  }

  const { CityEntityDefs, availableFP, setAvailablePacksFP } = deps;

  if (msg.requestMethod === 'getGreatBuildings') {
    return true;
  }

  if (msg.requestMethod === 'getItems') {
    storage.set('CityEntityDefs', CityEntityDefs);
    let forgePoints = 0;
    const items = msg.responseData ?? [];

    if (items.length) {
      for (let j = 0; j < items.length; j++) {
        if (items[j].name === '10 Forge Points') {
          forgePoints += (items[j].inStock ?? 0) * 10;
        } else if (items[j].name === '5 Forge Points') {
          forgePoints += (items[j].inStock ?? 0) * 5;
        } else if (items[j].name === '2 Forge Points') {
          forgePoints += (items[j].inStock ?? 0) * 2;
        }
      }

      setAvailablePacksFP(forgePoints);
      const availableNode = document.getElementById('availableFPID');
      if (availableNode) {
        availableNode.textContent = String(forgePoints + availableFP);
      }
    }

    return true;
  }

  return false;
}
