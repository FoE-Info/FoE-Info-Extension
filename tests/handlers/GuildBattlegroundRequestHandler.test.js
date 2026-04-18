import { describe, expect, it, vi } from 'vitest';
import { handleGuildBattlegroundRequest } from '../../src/js/msg/GuildBattlegroundRequestHandler.ts';

describe('handleGuildBattlegroundRequest', () => {
  const makeDeps = () => ({
    showOptions: { showLeaderboard: true, showBattleground: true },
    clearForBattleground: vi.fn(),
    getLeaderboard: vi.fn(),
    getPlayerLeaderboard: vi.fn(),
    getBattleground: vi.fn(),
    getState: vi.fn(),
    getBuildings: vi.fn(),
  });

  it('handles getBattleground by clearing and loading battleground', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'GuildBattlegroundService',
      requestMethod: 'getBattleground',
      responseData: {},
    };

    const handled = handleGuildBattlegroundRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.clearForBattleground).toHaveBeenCalledOnce();
    expect(deps.getBattleground).toHaveBeenCalledWith(msg);
  });

  it('routes state service getState when battleground option is enabled', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'GuildBattlegroundStateService',
      requestMethod: 'getState',
      responseData: { stateId: 'preparation' },
    };

    const handled = handleGuildBattlegroundRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.getState).toHaveBeenCalledWith(msg);
  });

  it('returns false for unrelated classes', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'OtherService',
      requestMethod: 'noop',
      responseData: {},
    };

    const handled = handleGuildBattlegroundRequest(msg, deps);

    expect(handled).toBe(false);
    expect(deps.getBattleground).not.toHaveBeenCalled();
  });
});
