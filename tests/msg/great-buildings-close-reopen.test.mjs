import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

test('Great Buildings Close -> Reopen Lifecycle & Static Invariants Suite', async (t) => {
  const gbOverviewPkg = await import('../../src/js/ui/gbOverviewCard.js');
  const { renderGbDonorsCard } = gbOverviewPkg.default || gbOverviewPkg;

  const gbInfoPkg = await import('../../src/js/ui/renderGbInfoPanel.js');
  const { renderGbInfoPanel } = gbInfoPkg.default || gbInfoPkg;

  await t.test(
    'renderGbDonorsCard renders valid card even with 0 rankings and handles showGBDonors !== false',
    () => {
      const mockEl = { innerHTML: '', style: {} };
      renderGbDonorsCard({
        GBselected: { name: 'Statue of Zeus', level: 10, max_level: 11 },
        rankings: [],
        showOptions: { showGBDonors: true },
        greatbuilding: mockEl,
      });

      assert.ok(
        mockEl.innerHTML.includes('No contributors yet') ||
          mockEl.innerHTML.includes('no_contributors'),
        'Should display no contributors yet when rankings array is empty',
      );
    },
  );

  await t.test(
    'renderGbInfoPanel unhides container if style.display was none',
    () => {
      const mockEl = {
        innerHTML: '',
        style: { display: 'none' },
        querySelector: () => null,
      };
      renderGbInfoPanel(
        mockEl,
        {
          name: 'The Arc',
          level: 80,
          max_level: 85,
          current: 1000,
          total: 5000,
        },
        'PlayerOne',
        { showGBInfo: true },
      );

      assert.equal(
        mockEl.style.display,
        '',
        'renderGbInfoPanel must clear display none',
      );
      assert.ok(
        mockEl.innerHTML.includes('GB') && mockEl.innerHTML.includes('Info'),
        'renderGbInfoPanel must populate card HTML',
      );
    },
  );

  await t.test(
    'renderGbInfoPanel supports cityentity_id if name/id are missing',
    () => {
      const mockEl = {
        innerHTML: '',
        style: {},
        querySelector: () => null,
      };
      renderGbInfoPanel(
        mockEl,
        { cityentity_id: 'X_FutureEra_Landmark1', level: 10 },
        'PlayerOne',
        { showGBInfo: true },
      );

      assert.ok(
        mockEl.innerHTML.length > 0,
        'Should populate card using cityentity_id',
      );
    },
  );

  await t.test(
    'GreatBuildingsService.js source guarantees fCheckOutput is called first, rankings is safe, and display is unhidden',
    () => {
      const source = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/msg/GreatBuildingsService.js'),
        'utf8',
      );

      // 1. fCheckOutput must be called before renderGbDonorsCard
      const fCheckIdx = source.indexOf('fCheckOutput();');
      const renderDonorsIdx = source.indexOf('renderGbDonorsCard({');
      assert.ok(fCheckIdx !== -1, 'fCheckOutput must be called');
      assert.ok(
        fCheckIdx < renderDonorsIdx,
        'fCheckOutput must be invoked before renderGbDonorsCard in showGreatBuldingDonation',
      );

      // 2. Rankings must fallback to empty array
      assert.match(
        source,
        /!Array\.isArray\(rankings\)/,
        'rankings must fallback to [] if not an array',
      );

      // 3. Container displays must be restored in fCheckOutput
      assert.match(
        source,
        /gbInfoDIV\.style\.display\s*=\s*['"]['"]/,
        'fCheckOutput must reset gbInfoDIV display',
      );
      assert.match(
        source,
        /greatbuilding\.style\.display\s*=\s*['"]['"]/,
        'fCheckOutput must reset greatbuilding display',
      );
      assert.match(
        source,
        /donation2DIV\.style\.display\s*=\s*['"]['"]/,
        'fCheckOutput must reset donation2DIV display',
      );

      // 4. showOptions?.showDonation !== false must be used
      assert.match(
        source,
        /showOptions\?\.showDonation\s*!==\s*false/,
        'showDonation check must use !== false',
      );
    },
  );
});
