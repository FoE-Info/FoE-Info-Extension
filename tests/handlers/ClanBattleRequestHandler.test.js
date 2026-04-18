import { describe, expect, it, vi } from 'vitest';
import { handleClanBattleServiceRequest } from '../../src/js/msg/ClanBattleRequestHandler.js';

describe('handleClanBattleServiceRequest', () => {
  const makeDeps = () => ({
    clearForGVG: vi.fn(),
    getContinent: vi.fn(),
    getProvinceDetailed: vi.fn(),
    deploySiegeArmy: vi.fn(),
    grantIndependence: vi.fn(),
  });

  it('handles getContinent and clears GVG first', () => {
    const deps = makeDeps();
    const msg = { requestClass: 'ClanBattleService', requestMethod: 'getContinent' };

    const handled = handleClanBattleServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.clearForGVG).toHaveBeenCalledOnce();
    expect(deps.getContinent).toHaveBeenCalledWith(msg);
  });

  it('handles deploySiegeArmy routing', () => {
    const deps = makeDeps();
    const msg = { requestClass: 'ClanBattleService', requestMethod: 'deploySiegeArmy' };

    const handled = handleClanBattleServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.deploySiegeArmy).toHaveBeenCalledWith(msg);
  });

  it('returns false for unknown method', () => {
    const deps = makeDeps();
    const msg = { requestClass: 'ClanBattleService', requestMethod: 'unknownMethod' };

    const handled = handleClanBattleServiceRequest(msg, deps);

    expect(handled).toBe(false);
    expect(deps.getContinent).not.toHaveBeenCalled();
  });
});
