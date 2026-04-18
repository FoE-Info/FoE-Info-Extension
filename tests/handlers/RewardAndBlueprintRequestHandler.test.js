import { describe, expect, it, vi } from 'vitest';
import {
  handleBlueprintServiceRequest,
  handleRewardServiceRequest,
} from '../../src/extension/services/RewardAndBlueprintRequestHandler.ts';

describe('handleRewardServiceRequest', () => {
  it('handles collectReward and calls showReward when enabled', () => {
    const showReward = vi.fn();
    const msg = {
      requestClass: 'RewardService',
      requestMethod: 'collectReward',
      responseData: [
        [{ name: 'forge_points', amount: 10 }],
        'battlegrounds_conquest',
      ],
    };

    const handled = handleRewardServiceRequest(
      msg,
      { showGBGrewards: true, showRewards: true },
      showReward,
    );

    expect(handled).toBe(true);
    expect(showReward).toHaveBeenCalledOnce();
    expect(showReward.mock.calls[0][0].source).toBe('battlegrounds_conquest');
  });

  it('handles collectRewardSet and emits each reward when enabled', () => {
    const showReward = vi.fn();
    const msg = {
      requestClass: 'RewardService',
      requestMethod: 'collectRewardSet',
      responseData: {
        reward: {
          rewards: [
            { name: 'coins', amount: 100 },
            { name: 'supplies', amount: 200 },
          ],
        },
        context: 'event',
      },
    };

    const handled = handleRewardServiceRequest(
      msg,
      { showGBGrewards: true, showRewards: true },
      showReward,
    );

    expect(handled).toBe(true);
    expect(showReward).toHaveBeenCalledTimes(2);
  });

  it('returns false for unrelated request class', () => {
    const showReward = vi.fn();
    const handled = handleRewardServiceRequest(
      { requestClass: 'OtherService', requestMethod: 'x', responseData: {} },
      { showGBGrewards: true, showRewards: true },
      showReward,
    );

    expect(handled).toBe(false);
    expect(showReward).not.toHaveBeenCalled();
  });
});

describe('handleBlueprintServiceRequest', () => {
  it('returns false for unrelated request', () => {
    const handled = handleBlueprintServiceRequest(
      { requestClass: 'OtherService', requestMethod: 'x', responseData: {} },
      {},
    );

    expect(handled).toBe(false);
  });

  it('handles newReward and updates reward UI when enabled', () => {
    const rewardObserve = vi.fn();
    const addAvailablePacksFP = vi.fn();
    const getTotalAvailableFP = vi.fn(() => 123);
    const rewardsTextLabelNode = { addEventListener: vi.fn() };
    const availableFPNode = { textContent: '' };
    const rewardsTextNode = null;

    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'availableFPID') return availableFPNode;
        if (id === 'rewardsTextLabel') return rewardsTextLabelNode;
        if (id === 'rewardsText') return rewardsTextNode;
        return null;
      }),
    };

    const cityrewards = { innerHTML: '' };
    const msg = {
      requestClass: 'BlueprintService',
      requestMethod: 'newReward',
      responseData: {
        cityentity_id: 123,
        strategy_point_amount: 10,
        building_owner: { name: 'Tester' },
        level: 5,
      },
    };

    const handled = handleBlueprintServiceRequest(msg, {
      helper: {
        fGBname: vi.fn(() => 'arc'),
        fGBsname: vi.fn(() => 'The Arc'),
      },
      showOptions: { showGBRewards: true },
      collapse: {
        collapseRewards: false,
        fCollapseRewards: vi.fn(),
      },
      element: {
        icon: vi.fn(() => '<i>icon</i>'),
        close: vi.fn(() => '<button>x</button>'),
      },
      cityrewards,
      rewardObserve,
      addAvailablePacksFP,
      getTotalAvailableFP,
    });

    expect(handled).toBe(true);
    expect(addAvailablePacksFP).toHaveBeenCalledWith(10);
    expect(getTotalAvailableFP).toHaveBeenCalledOnce();
    expect(availableFPNode.textContent).toBe('123');
    expect(cityrewards.innerHTML).toContain('Tester');
    expect(cityrewards.innerHTML).toContain('The Arc');
    expect(rewardObserve).toHaveBeenCalledOnce();
    expect(rewardsTextLabelNode.addEventListener).toHaveBeenCalledOnce();
  });
});
