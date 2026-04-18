import { describe, expect, it, vi } from 'vitest';
import { handleOtherPlayerServiceRequest } from '../../src/js/msg/OtherPlayerRequestHandler.ts';

describe('handleOtherPlayerServiceRequest', () => {
  const makeDeps = () => ({
    helper: {
      fGBname: vi.fn(() => 'arc'),
      fResourceShortName: vi.fn((name) => name),
    },
    GBselected: {},
    getPlayerID: vi.fn(() => 1),
    clearVisitPlayer: vi.fn(),
    otherPlayerService: vi.fn(),
    otherPlayerServiceUpdateActions: vi.fn(),
    showOptions: { showVisit: true, showGErewards: true },
    rewardsOtherPlayer: {},
    showReward: vi.fn(),
    setPlayerState: vi.fn(),
    setCityProtections: vi.fn(),
  });

  it('routes visitPlayer when showVisit is enabled', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'OtherPlayerService',
      requestMethod: 'visitPlayer',
      responseData: {},
    };

    const handled = handleOtherPlayerServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.clearVisitPlayer).toHaveBeenCalledOnce();
    expect(deps.otherPlayerService).toHaveBeenCalledWith(msg);
  });

  it('returns false for unknown method (negative route)', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'OtherPlayerService',
      requestMethod: 'unknownMethod',
      responseData: {},
    };

    const handled = handleOtherPlayerServiceRequest(msg, deps);

    expect(handled).toBe(false);
    expect(deps.otherPlayerService).not.toHaveBeenCalled();
    expect(deps.showReward).not.toHaveBeenCalled();
  });
});
