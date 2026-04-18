import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleStartupServiceRequest } from '../../src/extension/services/StartupRequestHandler.ts';

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        getBytesInUse: vi.fn(() => Promise.resolve(42)),
        get: vi.fn(() => Promise.resolve({ enMyInfo: { guildPosition: 3 } })),
      },
    },
  },
}));

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('handleStartupServiceRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeDeps = () => ({
    setGameOrigin: vi.fn(),
    getGameOrigin: vi.fn(() => 'en'),
    MyInfo: {},
    receiveStorage: vi.fn(),
    output: { innerHTML: 'x' },
    overview: { innerHTML: 'x' },
    cityinvested: { innerHTML: 'x' },
    cityrewards: { innerHTML: 'x' },
    incidents: { innerHTML: 'x' },
    donationDIV: { innerHTML: 'x' },
    greatbuilding: { innerHTML: 'x' },
    gvg: { innerHTML: 'x' },
    guild: { innerHTML: 'x' },
    citystats: { innerHTML: 'x' },
    visitstats: { innerHTML: 'x', className: 'a' },
    cultural: { innerHTML: 'x', className: 'b' },
    metadataLoaded: vi.fn(() => true),
    startupService: vi.fn(),
    setPendingStartupMsg: vi.fn(),
  });

  it('returns false for wrong request method (negative branch)', () => {
    const deps = makeDeps();
    const handled = handleStartupServiceRequest(
      { requestClass: 'StartupService', requestMethod: 'otherMethod' },
      { request: { headers: [] } },
      deps,
    );

    expect(handled).toBe(false);
    expect(deps.startupService).not.toHaveBeenCalled();
  });

  it('handles getData and routes to startupService when metadata is loaded', async () => {
    const deps = makeDeps();
    const msg = { requestClass: 'StartupService', requestMethod: 'getData' };

    const handled = handleStartupServiceRequest(
      msg,
      {
        request: {
          headers: [{ name: ':authority', value: 'en0.forgeofempires.com' }],
        },
      },
      deps,
    );

    await flushPromises();

    expect(handled).toBe(true);
    expect(deps.setGameOrigin).toHaveBeenCalledWith('en0');
    expect(deps.startupService).toHaveBeenCalledWith(msg);
    expect(deps.MyInfo.guildPosition).toBe(3);
    expect(deps.receiveStorage).toHaveBeenCalled();
    expect(deps.output.innerHTML).toBe('');
    expect(deps.visitstats.className).toBe('');
    expect(deps.cultural.className).toBe('');
  });
});
