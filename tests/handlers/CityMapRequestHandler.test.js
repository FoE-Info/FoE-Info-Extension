import { describe, expect, it, vi } from 'vitest';
import { handleCityMapServiceRequest } from '../../src/extension/services/CityMapRequestHandler.ts';

describe('handleCityMapServiceRequest', () => {
  const makeDeps = () => ({
    MyInfo: { id: 1, name: 'Tester' },
    GBselected: {},
    helper: {
      fGBname: vi.fn(() => 'The Arc'),
      fGVGagesname: vi.fn(() => 'Modern Era'),
    },
    setPlayerName: vi.fn(),
    element: {
      close: vi.fn(() => '<button>x</button>'),
    },
    collapse: {
      collapseGBInfo: false,
      fCollapseGBInfo: vi.fn(),
    },
    PlayerName: vi.fn(() => 'Tester'),
    info: {
      innerHTML: '',
    },
    showOptions: {
      showGBInfo: true,
    },
  });

  it('handles updateEntity for greatbuilding and renders info', () => {
    const deps = makeDeps();
    const label = { addEventListener: vi.fn() };

    global.document = {
      getElementById: vi.fn((id) => (id === 'infoTextLabel' ? label : null)),
    };
    global.$ = vi.fn(() => ({ i18n: vi.fn() }));

    const msg = {
      requestClass: 'CityMapService',
      requestMethod: 'updateEntity',
      responseData: [
        {
          type: 'greatbuilding',
          player_id: 1,
          id: 99,
          cityentity_id: 'X_ModernEra',
          level: 10,
          max_level: 20,
          connected: true,
          state: {
            forge_points_for_level_up: 100,
            invested_forge_points: 30,
            next_state_transition_at: 2147483647,
          },
        },
      ],
    };

    const handled = handleCityMapServiceRequest(msg, deps);

    expect(handled).toBe(true);
    expect(deps.setPlayerName).toHaveBeenCalledWith('Tester', 1);
    expect(deps.GBselected.name).toBe('The Arc');
    expect(deps.GBselected.current).toBe(30);
    expect(deps.info.innerHTML).toContain('The Arc');
    expect(label.addEventListener).toHaveBeenCalledOnce();
  });

  it('returns false for unsupported method (negative branch)', () => {
    const deps = makeDeps();
    const msg = {
      requestClass: 'CityMapService',
      requestMethod: 'unknownMethod',
      responseData: [],
    };

    const handled = handleCityMapServiceRequest(msg, deps);

    expect(handled).toBe(false);
    expect(deps.setPlayerName).not.toHaveBeenCalled();
  });
});
