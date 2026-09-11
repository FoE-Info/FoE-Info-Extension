import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  handleReceiveStorage,
  handleStorageChange,
} from '../../src/js/state/storageListener.js';
import {
  getTimeFormattingConfig,
  setTimeFormattingConfig,
} from '../../src/js/utils/date.js';

describe('Date & Time Formatting Config Sync Suite', () => {
  beforeEach(() => {
    setTimeFormattingConfig(null); // reset to default DD.MM.YYYY HH:mm:ss
  });

  it('syncs timeFormatting from global:settings on handleReceiveStorage', () => {
    const customConfig = {
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'hh:mm:ss A',
      dateTimeFormat: 'MM/DD/YYYY hh:mm:ss A',
    };

    handleReceiveStorage({
      'global:settings': {
        timeFormatting: customConfig,
      },
    });

    const active = getTimeFormattingConfig();
    assert.equal(active.dateTimeFormat, 'MM/DD/YYYY hh:mm:ss A');
    assert.equal(active.dateFormat, 'MM/DD/YYYY');
  });

  it('syncs timeFormatting from direct key on handleReceiveStorage fallback', () => {
    const customConfig = {
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
    };

    handleReceiveStorage({
      timeFormatting: customConfig,
    });

    const active = getTimeFormattingConfig();
    assert.equal(active.dateTimeFormat, 'YYYY-MM-DD HH:mm:ss');
  });

  it('updates timeFormatting on handleStorageChange when global:settings changes', () => {
    const customConfig = {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      dateTimeFormat: 'DD/MM/YYYY HH:mm',
    };

    handleStorageChange(
      {
        'global:settings': {
          newValue: {
            timeFormatting: customConfig,
          },
        },
      },
      'local',
    );

    const active = getTimeFormattingConfig();
    assert.equal(active.dateTimeFormat, 'DD/MM/YYYY HH:mm');
  });

  it('updates timeFormatting on handleStorageChange with direct timeFormatting change', () => {
    const customConfig = {
      dateFormat: 'DD.MM.YY',
      timeFormat: 'HH:mm',
      dateTimeFormat: 'DD.MM.YY HH:mm',
    };

    handleStorageChange(
      {
        timeFormatting: {
          newValue: customConfig,
        },
      },
      'local',
    );

    const active = getTimeFormattingConfig();
    assert.equal(active.dateTimeFormat, 'DD.MM.YY HH:mm');
  });
});
