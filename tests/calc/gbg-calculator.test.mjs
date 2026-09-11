import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateProvinceAttrition,
  formatCampsText,
  formatSectorName,
  formatTargetToken,
  getAttritionReduction,
  MAX_ATTRITION_REDUCTION,
} from '../../src/js/calc/GbgCalculator.js';

describe('GbgCalculator Pure Math Engine', () => {
  describe('MAX_ATTRITION_REDUCTION', () => {
    it('is set to 80 per InnoGames game balance rules', () => {
      assert.equal(MAX_ATTRITION_REDUCTION, 80);
    });
  });

  describe('getAttritionReduction', () => {
    it('returns exact percentage for command posts', () => {
      assert.equal(getAttritionReduction('guild_command_post_improvised'), 20);
      assert.equal(getAttritionReduction('guild_command_post_forward'), 40);
      assert.equal(getAttritionReduction('guild_command_post_fortified'), 60);
    });

    it('returns exact percentage for barracks', () => {
      assert.equal(getAttritionReduction('barracks_improvised'), 20);
      assert.equal(getAttritionReduction('barracks'), 40);
      assert.equal(getAttritionReduction('barracks_reinforced'), 60);
    });

    it('returns exact percentage for guild fieldcamps', () => {
      assert.equal(getAttritionReduction('guild_fieldcamp_small'), 26);
      assert.equal(getAttritionReduction('guild_fieldcamp'), 52);
      assert.equal(getAttritionReduction('guild_fieldcamp_fortified'), 80);
    });

    it('handles watchtowers', () => {
      assert.equal(getAttritionReduction('watchtower'), 8);
    });

    it('handles era-suffixed field outposts', () => {
      assert.equal(getAttritionReduction('basic_field_outpost_1'), 20);
      assert.equal(getAttritionReduction('regular_field_outpost_2'), 40);
      assert.equal(getAttritionReduction('advanced_field_outpost_3'), 60);
    });

    it('handles era-suffixed guild fortresses', () => {
      assert.equal(getAttritionReduction('basic_guild_fortress_1'), 26);
      assert.equal(getAttritionReduction('regular_guild_fortress_2'), 52);
      assert.equal(getAttritionReduction('advanced_guild_fortress_3'), 80);
    });

    it('returns 0 for unknown buildings, traps, decoys, or invalid inputs', () => {
      assert.equal(getAttritionReduction('trap'), 0);
      assert.equal(getAttritionReduction('decoy'), 0);
      assert.equal(getAttritionReduction(''), 0);
      assert.equal(getAttritionReduction(null), 0);
      assert.equal(getAttritionReduction(undefined), 0);
      assert.equal(getAttritionReduction(123), 0);
    });
  });

  describe('calculateProvinceAttrition', () => {
    const epochSec = 1700000000;

    it('calculates ready camps when readyAt is in past (seconds timestamp)', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              { id: 'guild_command_post_fortified', readyAt: epochSec - 100 },
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
      });

      assert.equal(result.campsReady, 60);
      assert.equal(result.campsNotReady, 0);
      assert.equal(result.attritionChance, 40);
      assert.equal(result.underConstructionChance, 40);
    });

    it('calculates under-construction camps when readyAt is in future (ms timestamp)', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              {
                id: 'guild_command_post_forward',
                readyAt: (epochSec + 3600) * 1000,
              },
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
      });

      assert.equal(result.campsReady, 0);
      assert.equal(result.campsNotReady, 40);
      assert.equal(result.attritionChance, 100);
      assert.equal(result.underConstructionChance, 60);
    });

    it('enforces 80% maximum attrition cap on ready camps', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              { id: 'guild_command_post_fortified', readyAt: epochSec - 100 }, // 60%
              { id: 'guild_command_post_forward', readyAt: epochSec - 200 }, // 40% -> total 100%
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
      });

      assert.equal(result.campsReady, 80);
      assert.equal(result.campsNotReady, 0);
      assert.equal(result.attritionChance, 20);
      assert.equal(result.underConstructionChance, 20);
    });

    it('enforces 80% cap across combined ready and under-construction camps', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              { id: 'guild_command_post_fortified', readyAt: epochSec - 100 }, // 60% ready
              { id: 'guild_command_post_forward', readyAt: epochSec + 500 }, // 40% UC -> should be capped at 20%
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
      });

      assert.equal(result.campsReady, 60);
      assert.equal(result.campsNotReady, 20); // capped at 80 - 60 = 20
      assert.equal(result.attritionChance, 40);
      assert.equal(result.underConstructionChance, 20);
    });

    it('filters out buildings from non-friendly provinces', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 99, // Rival guild
            placedBuildings: [
              { id: 'guild_fieldcamp_fortified', readyAt: epochSec - 100 },
            ],
          },
          {
            ownerId: 10, // Friendly guild
            placedBuildings: [
              { id: 'guild_command_post_improvised', readyAt: epochSec - 100 },
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
      });

      assert.equal(result.campsReady, 20);
      assert.equal(result.attritionChance, 80);
    });

    it('falls back to gainAttritionChance if no buildings are present', () => {
      const result = calculateProvinceAttrition({
        connectedProvinces: [],
        gainAttritionChance: 20, // 80% siege reduction
      });

      assert.equal(result.campsReady, 80);
      assert.equal(result.campsNotReady, 0);
      assert.equal(result.attritionChance, 20);
    });

    it('reconciles rushed camps when server gainAttritionChance shows higher active reduction than local readyAt', () => {
      // 3 camps placed: 2 ready (40%), 1 under construction (20%)
      // But guildmate rushed the 3rd camp, so server sends gainAttritionChance: 20 (80% reduction ready, 20% attrition)
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              { id: 'barracks', readyAt: epochSec - 100 }, // 40% ready
              { id: 'barracks_improvised', readyAt: epochSec + 3600 }, // 20% UC locally
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
        gainAttritionChance: 20, // Server reports 80% reduction is active!
      });

      assert.equal(result.campsReady, 80);
      assert.equal(result.campsNotReady, 0);
      assert.equal(result.attritionChance, 20);
      assert.equal(result.underConstructionChance, 20);
      assert.equal(
        formatCampsText(result.campsReady, result.campsNotReady, true),
        '(20%)',
      );
    });

    it('preserves under-construction state when server gainAttritionChance matches only completed camps', () => {
      // 1 camp ready (40%), 1 under construction (20%)
      // Server sends gainAttritionChance: 60 (only 40% active)
      const result = calculateProvinceAttrition({
        connectedProvinces: [
          {
            ownerId: 10,
            placedBuildings: [
              { id: 'barracks', readyAt: epochSec - 100 }, // 40% ready
              { id: 'barracks_improvised', readyAt: epochSec + 3600 }, // 20% UC
            ],
          },
        ],
        currentParticipantId: 10,
        currentEpoc: epochSec,
        gainAttritionChance: 60, // Server reports only the 40% ready camp is active
      });

      assert.equal(result.campsReady, 40);
      assert.equal(result.campsNotReady, 20);
      assert.equal(result.attritionChance, 60);
      assert.equal(result.underConstructionChance, 40);
      assert.equal(
        formatCampsText(result.campsReady, result.campsNotReady, true),
        '(60% / 40% UC)',
      );
    });

    it('defaults to 100% attrition chance when no buildings or modifiers exist', () => {
      const result = calculateProvinceAttrition();
      assert.equal(result.campsReady, 0);
      assert.equal(result.campsNotReady, 0);
      assert.equal(result.attritionChance, 100);
      assert.equal(result.underConstructionChance, 100);
    });
  });

  describe('formatSectorName', () => {
    it('formats Volcano archipelago sector tags (2-char ring + 1st char of quadrant)', () => {
      assert.equal(formatSectorName('A1S Central', 'volcano'), 'A1C');
      assert.equal(formatSectorName('D4H Hold', 'volcano'), 'D4H');
      assert.equal(formatSectorName('B2T Border', 'volcano'), 'B2B');
    });

    it('formats Waterfall archipelago sector tags (3-char prefix)', () => {
      assert.equal(formatSectorName('A1 Waterfall', 'waterfall'), 'A1');
      assert.equal(formatSectorName('A1A Archipelago', 'waterfall'), 'A1A');
      assert.equal(formatSectorName('D4X Outer', 'waterfall'), 'D4X');
    });

    it('handles empty or malformed sector names', () => {
      assert.equal(formatSectorName(''), '');
      assert.equal(formatSectorName(null), '');
      assert.equal(formatSectorName(undefined), '');
    });
  });

  describe('formatCampsText', () => {
    it('returns empty string when showCamps is false', () => {
      assert.equal(formatCampsText(80, 0, false), '');
      assert.equal(formatCampsText(0, 60, false), '');
    });

    it('formats ready camps as (X%)', () => {
      assert.equal(formatCampsText(80, 0, true), '(20%)');
      assert.equal(formatCampsText(20, 0, true), '(80%)');
    });

    it('formats under-construction camps as (Y% UC)', () => {
      assert.equal(formatCampsText(0, 60, true), '(40% UC)');
      assert.equal(formatCampsText(0, 40, true), '(60% UC)');
    });

    it('formats mixed ready and UC camps as (X% / Y% UC)', () => {
      assert.equal(formatCampsText(20, 60, true), '(80% / 20% UC)');
      assert.equal(formatCampsText(40, 20, true), '(60% / 40% UC)');
    });

    it('formats 0 camps as (! SC) when showCamps is true', () => {
      assert.equal(formatCampsText(0, 0, true), '(! SC)');
    });
  });

  describe('formatTargetToken', () => {
    it('strictly formats tokens in order: [sectorTag] [targetText] [campsText] [timeText]', () => {
      const token = formatTargetToken({
        sectorTag: 'D4H',
        targetText: 'HOLD',
        campsText: '(20%)',
        timeText: '@ 13:00',
      });
      assert.equal(token, 'D4H HOLD (20%) @ 13:00');
    });

    it('formats token without targetText', () => {
      const token = formatTargetToken({
        sectorTag: 'D4H',
        campsText: '(20%)',
        timeText: '@ 13:00',
      });
      assert.equal(token, 'D4H (20%) @ 13:00');
    });

    it('formats token without timeText', () => {
      const token = formatTargetToken({
        sectorTag: 'D4H',
        targetText: 'HOLD',
        campsText: '(20%)',
      });
      assert.equal(token, 'D4H HOLD (20%)');
    });

    it('formats token with only sectorTag and targetText', () => {
      const token = formatTargetToken({
        sectorTag: 'D4H',
        targetText: 'HOLD',
      });
      assert.equal(token, 'D4H HOLD');
    });

    it('formats token with only sectorTag', () => {
      const token = formatTargetToken({
        sectorTag: 'A1C',
      });
      assert.equal(token, 'A1C');
    });

    it('trims whitespace cleanly across tokens', () => {
      const token = formatTargetToken({
        sectorTag: '  A1C  ',
        targetText: '  RACE  ',
        campsText: '  (20%)  ',
        timeText: '  @ 14:00  ',
      });
      assert.equal(token, 'A1C RACE (20%) @ 14:00');
    });
  });
});
