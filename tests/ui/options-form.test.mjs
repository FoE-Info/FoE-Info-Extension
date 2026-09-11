import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/ui/optionsForm.js';

const {
  CHECKBOX_CONFIG,
  populateForm,
  readGlobalSettingsFromForm,
  readWorldSettingsFromForm,
} = pkg;

function createMockElement(initial = {}) {
  return {
    checked: initial.checked ?? false,
    value: initial.value ?? '',
  };
}

function setupMockDOM() {
  const elements = {};
  for (const { id } of CHECKBOX_CONFIG) {
    elements[id] = createMockElement({ checked: true });
  }
  elements['donationPercent'] = createMockElement({ value: '185' });
  elements['donationSuffix'] = createMockElement({ value: ' Arc' });
  elements['targets'] = createMockElement({ value: 'targets_list' });
  elements['targetText'] = createMockElement({ value: 'Target #1' });
  elements['discordTargetURL'] = createMockElement({
    value: 'https://discord.example/webhook',
  });
  elements['sheetGuildURL'] = createMockElement({
    value: 'https://sheets.example/guild',
  });
  elements['minSize'] = createMockElement({ value: '45' });
  elements['language'] = createMockElement({ value: 'de' });
  elements['GBGtimeMode'] = createMockElement({ value: 'server' });
  elements['dateTimeFormat'] = createMockElement({
    value: 'DD.MM.YYYY HH:mm:ss',
  });
  elements['customDateTimePattern'] = createMockElement({ value: '' });
  elements['customPatternDiv'] = { style: { display: 'none' } };

  globalThis.document = {
    getElementById: (id) => elements[id] || null,
  };

  return elements;
}

test('optionsForm - readWorldSettingsFromForm and readGlobalSettingsFromForm', () => {
  const elements = setupMockDOM();

  const worldSettings = readWorldSettingsFromForm();
  assert.strictEqual(worldSettings.showOptions.showBonus, true);
  assert.strictEqual(
    worldSettings.showOptions.showInternationalExpedition,
    true,
  );
  assert.strictEqual(worldSettings.showOptions.showGuildPosition, true);
  assert.strictEqual(worldSettings.showOptions.showGalaxy, true);
  assert.strictEqual(worldSettings.showOptions.clipboard, true);
  assert.strictEqual(worldSettings.showOptions.GBGtimeMode, 'server');

  // Test reading 'local'
  elements['GBGtimeMode'].value = 'local';
  const worldSettingsLocal = readWorldSettingsFromForm();
  assert.strictEqual(worldSettingsLocal.showOptions.GBGtimeMode, 'local');

  assert.strictEqual(worldSettings.donation.percent, 185);
  assert.strictEqual(worldSettings.donation.suffix, ' Arc');
  assert.strictEqual(worldSettings.donation.targets, 'targets_list');
  assert.strictEqual(worldSettings.donation.targetText, 'Target #1');
  assert.strictEqual(
    worldSettings.webhooks.discordTargetURL,
    'https://discord.example/webhook',
  );
  assert.strictEqual(
    worldSettings.webhooks.sheetGuildURL,
    'https://sheets.example/guild',
  );
  assert.strictEqual(worldSettings.toolOptions.minSize, 45);

  // When minSize is empty, 0, or negative, defaults to 50
  elements['minSize'].value = '0';
  assert.strictEqual(readWorldSettingsFromForm().toolOptions.minSize, 50);
  elements['minSize'].value = '';
  assert.strictEqual(readWorldSettingsFromForm().toolOptions.minSize, 50);

  const globalSettings = readGlobalSettingsFromForm();
  assert.strictEqual(globalSettings.language, 'de');
  assert.strictEqual(
    globalSettings.timeFormatting.dateTimeFormat,
    'DD.MM.YYYY HH:mm:ss',
  );
  assert.strictEqual(globalSettings.timeFormatting.timeFormat, 'HH:mm:ss');
  assert.strictEqual(globalSettings.timeFormatting.customPattern, '');

  // Test 12-hour US preset derives 12-hour time format
  elements['dateTimeFormat'].value = 'MM/DD/YYYY hh:mm:ss A';
  const globalSettings12h = readGlobalSettingsFromForm();
  assert.strictEqual(globalSettings12h.timeFormatting.timeFormat, 'hh:mm:ss A');
});

test('optionsForm - populateForm binds settings to DOM', () => {
  const elements = setupMockDOM();

  populateForm(
    {
      showOptions: {
        showBonus: false,
        showInternationalExpedition: false,
        showGuildPosition: false,
        showGalaxy: false,
        GBGtimeMode: 'local',
      },
      donation: {
        percent: 195,
        suffix: ' FP',
        targets: 'new_targets',
        targetText: 'Take safe spot',
      },
      webhooks: {
        discordTargetURL: 'https://discord.test',
        sheetGuildURL: 'https://sheet.test',
      },
      toolOptions: {
        minSize: 60,
      },
    },
    { language: 'fr' },
  );

  assert.strictEqual(elements['bonus'].checked, false);
  assert.strictEqual(elements['InternationalExpedition'].checked, false);
  assert.strictEqual(elements['donationGuildPosition'].checked, false);
  assert.strictEqual(elements['showGalaxy'].checked, false);
  assert.strictEqual(elements['GBGtimeMode'].value, 'local');
  assert.strictEqual(elements['donationPercent'].value, 195);
  assert.strictEqual(elements['donationSuffix'].value, ' FP');
  assert.strictEqual(elements['targets'].value, 'new_targets');
  assert.strictEqual(elements['targetText'].value, 'Take safe spot');
  assert.strictEqual(
    elements['discordTargetURL'].value,
    'https://discord.test',
  );
  assert.strictEqual(elements['sheetGuildURL'].value, 'https://sheet.test');
  assert.strictEqual(elements['minSize'].value, 60);
  assert.strictEqual(elements['language'].value, 'fr');

  // Test fallback to 50 when minSize is 0 or undefined
  populateForm({ toolOptions: { minSize: 0 } }, {});
  assert.strictEqual(elements['minSize'].value, 50);
  populateForm({ toolOptions: {} }, {});
  assert.strictEqual(elements['minSize'].value, 50);
});
