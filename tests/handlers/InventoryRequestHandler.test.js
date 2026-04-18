import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../../src/js/fn/storage.js';
import { handleInventoryServiceRequest } from '../../src/js/msg/InventoryRequestHandler.ts';

vi.mock('../../src/js/fn/storage.js', () => ({
  set: vi.fn(),
}));

describe('handleInventoryServiceRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for getGreatBuildings', () => {
    const handled = handleInventoryServiceRequest(
      { requestClass: 'InventoryService', requestMethod: 'getGreatBuildings', responseData: [] },
      { CityEntityDefs: {}, availableFP: 0, setAvailablePacksFP: vi.fn() },
    );

    expect(handled).toBe(true);
  });

  it('handles getItems and updates available FP text', () => {
    const setAvailablePacksFP = vi.fn();
    const fpNode = { textContent: '' };

    global.document = {
      getElementById: vi.fn((id) => (id === 'availableFPID' ? fpNode : null)),
    };

    const handled = handleInventoryServiceRequest(
      {
        requestClass: 'InventoryService',
        requestMethod: 'getItems',
        responseData: [
          { name: '10 Forge Points', inStock: 2 },
          { name: '5 Forge Points', inStock: 1 },
          { name: '2 Forge Points', inStock: 3 },
        ],
      },
      { CityEntityDefs: { a: 1 }, availableFP: 7, setAvailablePacksFP },
    );

    expect(handled).toBe(true);
    expect(storage.set).toHaveBeenCalledWith('CityEntityDefs', { a: 1 });
    expect(setAvailablePacksFP).toHaveBeenCalledWith(31);
    expect(fpNode.textContent).toBe('38');
  });

  it('returns false for unrelated service', () => {
    const handled = handleInventoryServiceRequest(
      { requestClass: 'OtherService', requestMethod: 'x', responseData: [] },
      { CityEntityDefs: {}, availableFP: 0, setAvailablePacksFP: vi.fn() },
    );

    expect(handled).toBe(false);
  });
});
