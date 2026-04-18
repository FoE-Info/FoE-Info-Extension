import { describe, expect, it, vi } from 'vitest';
import { handleRewardServiceRequest } from '../../src/js/msg/RewardAndBlueprintRequestHandler.ts';

describe('handleRewardServiceRequest', () => {
  it('handles collectReward and calls showReward when enabled', () => {
    const showReward = vi.fn();
    const msg = {
      requestClass: 'RewardService',
      requestMethod: 'collectReward',
      responseData: [[{ name: 'forge_points', amount: 10 }], 'battlegrounds_conquest'],
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
