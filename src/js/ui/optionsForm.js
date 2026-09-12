/**
 * optionsForm.js
 *
 * Modular form helper for reading and populating Options page settings.
 */

const CHECKBOX_CONFIG = [
  { id: 'bonus', key: 'showBonus' },
  { id: 'Incidents', key: 'showIncidents' },
  { id: 'Stats', key: 'showStats' },
  { id: 'GBInfo', key: 'showGBInfo' },
  { id: 'GBRewards', key: 'showGBRewards' },
  { id: 'GBDonors', key: 'showGBDonors' },
  { id: 'Invested', key: 'showInvested' },
  { id: 'Donation', key: 'showDonation' },
  { id: 'Friends', key: 'showFriends' },
  { id: 'Guild', key: 'showGuild' },
  { id: 'Hood', key: 'showHood' },
  { id: 'Battleground', key: 'showBattleground' },
  {
    id: 'showBattlegroundChanges',
    key: 'showBattlegroundChanges',
    fallback: false,
  },
  { id: 'InternationalExpedition', key: 'showInternationalExpedition' },
  { id: 'Expedition', key: 'showExpedition' },
  { id: 'Treasury', key: 'showTreasury' },
  { id: 'visit', key: 'showVisit' },
  { id: 'settlement', key: 'showSettlement' },
  { id: 'army', key: 'showArmy' },
  { id: 'goods', key: 'showGoods', fallback: true },
  { id: 'leaderboard', key: 'showLeaderboard' },
  { id: 'GBGrewards', key: 'showGBGrewards' },
  { id: 'GBGprovinceTime', key: 'GBGprovinceTime' },
  { id: 'GBGshowSC', key: 'GBGshowSC' },
  { id: 'GErewards', key: 'showGErewards' },
  { id: 'rewards', key: 'showRewards' },
  { id: 'logs', key: 'showLogs', fallback: true },
  { id: 'contributions', key: 'showContributions', fallback: true },
  { id: 'donationGuildPosition', key: 'showGuildPosition' },
  { id: 'hideUnsafe', key: 'hideUnsafe' },
  { id: 'buildingCosts', key: 'buildingCosts' },
  { id: 'collectionTimes', key: 'collectionTimes' },
  { id: 'showGalaxy', key: 'showGalaxy', fallback: true },
  { id: 'showGuildOverview', key: 'showGuildOverview', fallback: true },
  { id: 'clipboard', key: 'clipboard', fallback: true },
  { id: 'quantumContributions', key: 'showQuantum', fallback: true },
  { id: 'quantumLeaderboard', key: 'showQuantumLeaderboard', fallback: true },
  { id: 'showQIChanges', key: 'showQIChanges', fallback: false },
];

function readWorldSettingsFromForm() {
  const showOptions = {};
  for (const { id, key, fallback } of CHECKBOX_CONFIG) {
    const el = document.getElementById(id);
    if (el) {
      showOptions[key] = Boolean(el.checked);
    } else {
      showOptions[key] = fallback ?? false;
    }
  }

  const gbgTimeModeEl = document.getElementById('GBGtimeMode');
  showOptions.GBGtimeMode =
    gbgTimeModeEl?.value === 'local' ? 'local' : 'server';

  const donationPercentEl = document.getElementById('donationPercent');
  let donationPercent =
    donationPercentEl ? Number(donationPercentEl.value) : 190;
  if (isNaN(donationPercent)) donationPercent = 190;
  if (donationPercent > 200) donationPercent = 200;
  if (donationPercent < 0) donationPercent = 0;

  const donation = {
    percent: donationPercent,
    suffix: document.getElementById('donationSuffix')?.value ?? '',
    targets: document.getElementById('targets')?.value ?? '',
    targetText: document.getElementById('targetText')?.value ?? '',
  };

  const webhooks = {
    discordTargetURL: document.getElementById('discordTargetURL')?.value ?? '',
    sheetGuildURL: document.getElementById('sheetGuildURL')?.value ?? '',
  };

  const minSizeEl = document.getElementById('minSize');
  let minSize = minSizeEl ? Number(minSizeEl.value) : 50;
  if (isNaN(minSize) || minSize <= 0) minSize = 50;
  const toolOptions = {
    minSize,
  };

  return {
    showOptions,
    donation,
    webhooks,
    toolOptions,
  };
}

function readGlobalSettingsFromForm() {
  const langEl = document.getElementById('language');
  const dateTimeFormatEl = document.getElementById('dateTimeFormat');
  const customPatternEl = document.getElementById('customDateTimePattern');

  const selectedFormat = dateTimeFormatEl?.value || 'DD.MM.YYYY HH:mm:ss';
  const customPattern = customPatternEl?.value || '';

  let dateFormat = 'DD.MM.YYYY';
  let timeFormat = 'HH:mm:ss';

  if (selectedFormat === 'MM/DD/YYYY hh:mm:ss A') {
    dateFormat = 'MM/DD/YYYY';
    timeFormat = 'hh:mm:ss A';
  } else if (selectedFormat === 'DD/MM/YYYY HH:mm:ss') {
    dateFormat = 'DD/MM/YYYY';
    timeFormat = 'HH:mm:ss';
  } else if (selectedFormat === 'DD.MM.YYYY HH:mm:ss') {
    dateFormat = 'DD.MM.YYYY';
    timeFormat = 'HH:mm:ss';
  } else if (selectedFormat === 'custom' && customPattern) {
    if (/\bhh\b|[Aa]/.test(customPattern)) {
      timeFormat = 'hh:mm:ss A';
    }
  }

  return {
    language: langEl?.value || 'game',
    timeFormatting: {
      dateFormat,
      timeFormat,
      dateTimeFormat:
        selectedFormat === 'custom' ?
          customPattern || 'DD.MM.YYYY HH:mm:ss'
        : selectedFormat,
      customPattern: selectedFormat === 'custom' ? customPattern : '',
    },
  };
}

function populateForm(worldSettings = {}, globalSettings = {}) {
  const {
    showOptions = {},
    donation = {},
    webhooks = {},
    toolOptions = {},
  } = worldSettings;

  for (const { id, key, fallback } of CHECKBOX_CONFIG) {
    const el = document.getElementById(id);
    if (el) {
      el.checked = Boolean(showOptions[key] ?? fallback ?? false);
    }
  }

  const gbgTimeModeEl = document.getElementById('GBGtimeMode');
  if (gbgTimeModeEl) {
    gbgTimeModeEl.value = showOptions.GBGtimeMode || 'server';
  }

  const donationPercentEl = document.getElementById('donationPercent');
  if (donationPercentEl && donation.percent !== undefined) {
    donationPercentEl.value = donation.percent;
  }

  const donationSuffixEl = document.getElementById('donationSuffix');
  if (donationSuffixEl && donation.suffix !== undefined) {
    donationSuffixEl.value = donation.suffix;
  }

  const targetsEl = document.getElementById('targets');
  if (targetsEl && donation.targets !== undefined) {
    targetsEl.value = donation.targets;
  }

  const targetTextEl = document.getElementById('targetText');
  if (targetTextEl && donation.targetText !== undefined) {
    targetTextEl.value = donation.targetText;
  }

  const discordEl = document.getElementById('discordTargetURL');
  if (discordEl && webhooks.discordTargetURL !== undefined) {
    discordEl.value = webhooks.discordTargetURL;
  }

  const sheetEl = document.getElementById('sheetGuildURL');
  if (sheetEl && webhooks.sheetGuildURL !== undefined) {
    sheetEl.value = webhooks.sheetGuildURL;
  }

  const minSizeEl = document.getElementById('minSize');
  if (minSizeEl) {
    minSizeEl.value =
      toolOptions.minSize !== undefined && toolOptions.minSize > 0 ?
        toolOptions.minSize
      : 50;
  }

  const langEl = document.getElementById('language');
  if (langEl) {
    langEl.value = globalSettings?.language || 'game';
  }

  const dateTimeFormatEl = document.getElementById('dateTimeFormat');
  const customPatternEl = document.getElementById('customDateTimePattern');
  const customPatternDiv = document.getElementById('customPatternDiv');

  if (dateTimeFormatEl && globalSettings?.timeFormatting) {
    const currentFmt =
      globalSettings.timeFormatting.dateTimeFormat || 'DD.MM.YYYY HH:mm:ss';
    const isCustom =
      Boolean(globalSettings.timeFormatting.customPattern) ||
      (currentFmt !== 'DD.MM.YYYY HH:mm:ss' &&
        currentFmt !== 'DD/MM/YYYY HH:mm:ss' &&
        currentFmt !== 'MM/DD/YYYY hh:mm:ss A');

    if (isCustom) {
      dateTimeFormatEl.value = 'custom';
      if (customPatternDiv) customPatternDiv.style.display = '';
      if (customPatternEl) {
        customPatternEl.value =
          globalSettings.timeFormatting.customPattern || currentFmt;
      }
    } else {
      dateTimeFormatEl.value = currentFmt;
      if (customPatternDiv) customPatternDiv.style.display = 'none';
    }
  }
}

module.exports = {
  CHECKBOX_CONFIG,
  readWorldSettingsFromForm,
  readGlobalSettingsFromForm,
  populateForm,
};
module.exports.default = module.exports;
