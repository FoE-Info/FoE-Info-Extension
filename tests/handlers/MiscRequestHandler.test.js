import { describe, expect, it, vi } from 'vitest';
import { handleMiscRequest } from '../../src/js/msg/MiscRequestHandler.ts';

describe('handleMiscRequest', () => {
  const makeDeps = () => ({
    conversationService: vi.fn(),
    getConversation: vi.fn(),
    armyUnitManagementService: vi.fn(),
    clearStartup: vi.fn(),
    clearBattleground: vi.fn(),
    ignoredPlayers: { ignoredByPlayerIds: {}, ignoredPlayerIds: {} },
    setEpocTime: vi.fn(),
    clearForMainCity: vi.fn(),
    helper: { fShowIncidents: vi.fn(), fResourceShortName: vi.fn((v) => v) },
    getResourceDefinitions: vi.fn(),
    getPlayerResources: vi.fn(),
    MyInfo: { name: '', id: 0, guild: '' },
    showOptions: { showStats: false, showSettlement: false },
    citystats: { innerHTML: '' },
    setHiddenRewards: vi.fn(),
    emissaryService: vi.fn(),
    getCultural: vi.fn(),
    setCultural: vi.fn(),
    Resources: {},
    collapse: { collapseCultural: false, fCollapseCultural: vi.fn() },
    element: { close: vi.fn(() => ''), icon: vi.fn(() => '') },
    showCultural: { clearCultural: vi.fn() },
    getBonuses: vi.fn(),
    getLimitedBonuses: vi.fn(),
    boostService: vi.fn(),
    boostServiceAllBoosts: vi.fn(),
  });

  it('routes ArmyUnitManagementService getArmyInfo', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'ArmyUnitManagementService',
      requestMethod: 'getArmyInfo',
      responseData: {},
    };

    const handled = handleMiscRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.armyUnitManagementService).toHaveBeenCalledWith(msg);
  });

  it('returns false for unsupported conversation method', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'unknownMethod',
      responseData: {},
    };

    const handled = handleMiscRequest(msg, deps);

    expect(handled).toBe(false);
    expect(deps.conversationService).not.toHaveBeenCalled();
    expect(deps.getConversation).not.toHaveBeenCalled();
  });
});
