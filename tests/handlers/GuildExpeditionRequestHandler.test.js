import { describe, expect, it, vi } from 'vitest';
import { handleGuildExpeditionServiceRequest } from '../../src/js/msg/GuildExpeditionRequestHandler.ts';

describe('handleGuildExpeditionServiceRequest', () => {
  const makeDeps = () => ({
    clearExpedition: vi.fn(),
    showOptions: { showExpedition: true, showGErewards: true },
    guildExpeditionService: vi.fn(),
    helper: { fRewardShortName: vi.fn(() => 'FP') },
    rewardsGE: {},
    showReward: vi.fn(),
  });

  it('handles getOverview by clearing expedition view', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'GuildExpeditionService',
      requestMethod: 'getOverview',
    };

    const handled = handleGuildExpeditionServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.clearExpedition).toHaveBeenCalledOnce();
  });

  it('handles openChest and aggregates rewards', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'GuildExpeditionService',
      requestMethod: 'openChest',
      responseData: { name: 'forge_points', amount: 5 },
    };

    const handled = handleGuildExpeditionServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.helper.fRewardShortName).toHaveBeenCalledWith('forge_points');
    expect(deps.rewardsGE.FP).toBe(5);
    expect(deps.showReward).toHaveBeenCalledOnce();
  });

  it('returns false for unknown method', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'GuildExpeditionService',
      requestMethod: 'unknownMethod',
    };

    const handled = handleGuildExpeditionServiceRequest(msg, deps);

    expect(handled).toBe(false);
  });
});
