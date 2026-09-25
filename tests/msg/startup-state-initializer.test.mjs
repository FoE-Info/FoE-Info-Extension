import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createStartupContext,
  createTimingTracker,
  initializeStartupSession,
  initStartupUser,
  resetCityStartupState,
  updateCombatTotals,
} from '../../src/js/msg/StartupStateInitializer.js';

describe('StartupStateInitializer Suite', () => {
  describe('initStartupUser', () => {
    it('returns null and logs error if responseData or user_data is missing', () => {
      let errorLogged = false;
      const mockLogger = {
        error: () => {
          errorLogged = true;
        },
      };

      const result1 = initStartupUser(null, { logger: mockLogger });
      assert.equal(result1, null);
      assert.equal(errorLogged, true);

      errorLogged = false;
      const result2 = initStartupUser(
        { responseData: {} },
        { logger: mockLogger },
      );
      assert.equal(result2, null);
      assert.equal(errorLogged, true);
    });

    it('initializes user, resolves score, sets info, permissions, and resets state', () => {
      let myInfoArgs = null;
      let ignoredArgs = null;
      let permissions = null;
      let unitsCleared = false;
      let galaxyReset = false;

      const msg = {
        responseData: {
          user_data: {
            player_id: 12345,
            user_name: 'TestPlayer',
            clan_id: 678,
            clan_name: 'TestGuild',
            user_era: 'SpaceAgeMars',
            points: 999999,
            registration_date: 1600000000,
            clan_permissions: { founder: true },
          },
          ignoredPlayerIds: [1, 2],
          ignoredByPlayerIds: [3, 4],
        },
      };

      const options = {
        setMyScore: () => {},
        setMyInfo: (...args) => {
          myInfoArgs = args;
        },
        setIgnoredPlayers: (by, ing) => {
          ignoredArgs = { by, ing };
        },
        helper: {
          setMyGuildPermissions: (perm) => {
            permissions = perm;
          },
        },
        clearArmyUnits: () => {
          unitsCleared = true;
        },
        blueGalaxyState: {
          reset: () => {
            galaxyReset = true;
          },
        },
      };

      const user = initStartupUser(msg, options);
      assert.ok(user);
      assert.equal(user.player_id, 12345);
      assert.deepEqual(ignoredArgs, { by: [3, 4], ing: [1, 2] });
      assert.deepEqual(permissions, { founder: true });
      assert.equal(unitsCleared, true);
      assert.equal(galaxyReset, true);
      assert.ok(myInfoArgs);
      assert.equal(myInfoArgs[0], 'TestPlayer');
      assert.equal(myInfoArgs[1], 12345);
    });

    it('handles snake_case ignored player fields fallback', () => {
      let ignoredArgs = null;
      const msg = {
        responseData: {
          user_data: { player_id: 1 },
          ignored_player_ids: [10],
          ignored_by_player_ids: [20],
        },
      };

      initStartupUser(msg, {
        setMyScore: () => {},
        setMyInfo: () => {},
        setIgnoredPlayers: (by, ing) => {
          ignoredArgs = { by, ing };
        },
      });

      assert.deepEqual(ignoredArgs, { by: [20], ing: [10] });
    });

    it('delegates to state object methods when passed via options.state', () => {
      let infoSet = null;
      let ignoredSet = null;

      const mockState = {
        setMyInfo: (...args) => {
          infoSet = args;
        },
        setIgnoredPlayers: (by, ing) => {
          ignoredSet = { by, ing };
        },
      };

      const msg = {
        responseData: {
          user_data: {
            player_id: 99,
            user_name: 'StateUser',
            points: 500,
          },
          ignoredPlayerIds: [5],
        },
      };

      initStartupUser(msg, { state: mockState });
      assert.ok(infoSet);
      assert.equal(infoSet[0], 'StateUser');
      assert.equal(infoSet[6], 500);
      assert.deepEqual(ignoredSet, { by: undefined, ing: [5] });
    });
  });

  describe('resetCityStartupState', () => {
    it('resets all city combat, production, and boost fields to 0', () => {
      const City = {
        ForgePoints: 500,
        baseBoostableFp: 100,
        baseUnboostableFp: 50,
        TrazUnits: 40,
        baseUnits: 40,
        gbAttack: 100,
        gbDefense: 80,
        gbCityAttack: 20,
        gbCityDefense: 30,
        Coins: 1000,
        Supplies: 2000,
        CoinBoost: 50,
        SupplyBoost: 50,
        Attack: 300,
        Defense: 250,
        CityAttack: 50,
        CityDefense: 60,
        ArcBonus: 90,
        ChatBonus: 10,
        AOCriticalStrike: 25,
        CCCriticalStrike: 15,
        CriticalStrike: 35,
      };

      resetCityStartupState(City);

      assert.equal(City.ForgePoints, 0);
      assert.equal(City.baseBoostableFp, 0);
      assert.equal(City.baseUnboostableFp, 0);
      assert.equal(City.TrazUnits, 0);
      assert.equal(City.baseUnits, 0);
      assert.equal(City.gbAttack, 0);
      assert.equal(City.gbDefense, 0);
      assert.equal(City.gbCityAttack, 0);
      assert.equal(City.gbCityDefense, 0);
      assert.equal(City.Coins, 0);
      assert.equal(City.Supplies, 0);
      assert.equal(City.CoinBoost, 0);
      assert.equal(City.SupplyBoost, 0);
      assert.equal(City.Attack, 0);
      assert.equal(City.Defense, 0);
      assert.equal(City.CityAttack, 0);
      assert.equal(City.CityDefense, 0);
      assert.equal(City.ArcBonus, 0);
      assert.equal(City.ChatBonus, 0);
      assert.equal(City.AOCriticalStrike, 0);
      assert.equal(City.CCCriticalStrike, 0);
      assert.equal(City.CriticalStrike, 0);
    });

    it('applies cached boosts when lastBoostsMsg is provided', () => {
      const City = {};
      let boostsApplied = false;
      const lastBoostsMsg = { responseData: [{ type: 'att_boost' }] };

      resetCityStartupState(City, {
        lastBoostsMsg,
        applyBoostsToCity: (boosts, c) => {
          assert.equal(boosts, lastBoostsMsg);
          assert.equal(c, City);
          boostsApplied = true;
        },
      });

      assert.equal(boostsApplied, true);
    });

    it('invokes removeDebug when DEV is false', () => {
      const City = {};
      let debugRemoved = false;

      resetCityStartupState(City, {
        DEV: false,
        removeDebug: () => {
          debugRemoved = true;
        },
      });

      assert.equal(debugRemoved, true);
    });

    it('handles null City gracefully', () => {
      assert.doesNotThrow(() => resetCityStartupState(null));
    });
  });

  describe('updateCombatTotals', () => {
    it('computes Attack, Defense, CityAttack, CityDefense from raw boosts and GB stats', () => {
      const City = {
        rawBoostAttack: 150,
        gbAttack: 50,
        rawBoostDefense: 120,
        gbDefense: 30,
        rawBoostCityAttack: 40,
        gbCityAttack: 10,
        rawBoostCityDefense: 60,
        gbCityDefense: 20,
      };

      updateCombatTotals(City);

      assert.equal(City.Attack, 200);
      assert.equal(City.Defense, 150);
      assert.equal(City.CityAttack, 50);
      assert.equal(City.CityDefense, 80);
    });

    it('defaults missing or undefined values to 0', () => {
      const City = {};
      updateCombatTotals(City);

      assert.equal(City.Attack, 0);
      assert.equal(City.Defense, 0);
      assert.equal(City.CityAttack, 0);
      assert.equal(City.CityDefense, 0);
    });

    it('handles null targetCity gracefully without throwing', () => {
      assert.doesNotThrow(() => updateCombatTotals(null));
    });
  });

  describe('initializeStartupSession', () => {
    it('initializes user and resets city state in one unified call', () => {
      const City = { ForgePoints: 100 };
      const msg = {
        responseData: {
          user_data: {
            player_id: 42,
            user_name: 'Pilot',
            points: 1000,
          },
        },
      };
      let infoCalled = false;
      const options = {
        City,
        setMyInfo: () => {
          infoCalled = true;
        },
      };

      const user = initializeStartupSession(msg, options);
      assert.ok(user);
      assert.equal(user.player_id, 42);
      assert.equal(infoCalled, true);
      assert.equal(City.ForgePoints, 0);
    });

    it('returns null and skips city reset if user initialization fails', () => {
      const City = { ForgePoints: 50 };
      const result = initializeStartupSession(null, { City });
      assert.equal(result, null);
      assert.equal(City.ForgePoints, 50);
    });
  });

  describe('createTimingTracker', () => {
    it('creates timing step function that records step info without crashing', () => {
      const logs = [];
      const mockLogger = {
        info: (msg) => logs.push(msg),
      };

      const tracker = createTimingTracker(mockLogger, 1, 'req-123');
      assert.ok(typeof tracker.timingStep === 'function');
      assert.equal(typeof tracker.debugEnabled, 'boolean');
    });
  });

  describe('createStartupContext', () => {
    it('assembles complete startup context payload for render pipeline', () => {
      const user = { player_id: 10 };
      const entityResult = {
        clanGoods: 50,
        clanPower: 100,
        aidStats: { aidCount: 5 },
      };
      const stateObj = { availablePacksFP: 42 };
      const collapseObj = { collapseStats: true };
      const tooltipHTML = {
        fp: ['fp-tip'],
        clanGoods: ['cg-tip'],
        goods: ['g-tip'],
      };

      const ctx = createStartupContext({
        user,
        entityResult,
        state: stateObj,
        collapse: collapseObj,
        fpBuildings: ['fp1'],
        goodsBuildings: ['g1'],
        tooltipHTML,
      });

      assert.equal(ctx.user, user);
      assert.equal(ctx.clanGoods, 50);
      assert.equal(ctx.clanPower, 100);
      assert.equal(ctx.availablePacksFP, 42);
      assert.equal(ctx.collapseStats, true);
      assert.deepEqual(ctx.fpBuildings, ['fp1']);
      assert.deepEqual(ctx.goodsBuildings, ['g1']);
      assert.deepEqual(ctx.tooltipHTML, tooltipHTML);
    });
  });
});
