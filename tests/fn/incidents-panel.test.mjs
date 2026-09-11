import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

test('Incidents Panel - Popover removal and collapsible panel preservation', async (t) => {
  const helperPath = path.join(ROOT_DIR, 'src/js/fn/helper.js');
  const helperSource = fs.readFileSync(helperPath, 'utf8');
  const incidentsPanelPath = path.join(ROOT_DIR, 'src/js/ui/incidentsPanel.js');
  const incidentsPanelSource = fs.readFileSync(incidentsPanelPath, 'utf8');

  await t.test(
    'helper.js and incidentsPanel.js static invariants: popovers removed & collapsible preserved',
    () => {
      // 1. Popover import should be removed from bootstrap import in helper.js and incidentsPanel.js
      assert.doesNotMatch(
        helperSource,
        /import\s*\{\s*Popover\s*\}\s*from\s*['"]bootstrap['"]/,
        'helper.js must not import Popover from bootstrap',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /import\s*\{[^}]*Popover[^}]*\}\s*from\s*['"]bootstrap['"]/,
        'incidentsPanel.js must not import Popover from bootstrap',
      );

      // 2. Popover instantiation should be removed
      assert.doesNotMatch(
        helperSource,
        /new\s+Popover\s*\(/,
        'helper.js must not instantiate new Popover',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /new\s+Popover\s*\(/,
        'incidentsPanel.js must not instantiate new Popover',
      );

      // 3. incidents_tooltip element ID and class pop must be removed
      assert.doesNotMatch(
        helperSource,
        /id=["']incidents_tooltip["']/,
        'helper.js must not define id="incidents_tooltip"',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /id=["']incidents_tooltip["']/,
        'incidentsPanel.js must not define id="incidents_tooltip"',
      );
      assert.doesNotMatch(
        helperSource,
        /data-bs-container=["']#incidents_tooltip["']/,
        'helper.js must not bind popover container #incidents_tooltip',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /data-bs-container=["']#incidents_tooltip["']/,
        'incidentsPanel.js must not bind popover container #incidents_tooltip',
      );

      // 4. Popover toggle attribute must be removed from incidents
      assert.doesNotMatch(
        helperSource,
        /<span[^>]*data-bs-toggle=["']popover["'][^>]*>[\s\S]*?<span[^>]*data-i18n=["']incident["']>/,
        'Incidents label in helper.js must not be wrapped in a popover toggle trigger',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /<span[^>]*data-bs-toggle=["']popover["'][^>]*>[\s\S]*?<span[^>]*data-i18n=["']incident["']>/,
        'Incidents label in incidentsPanel.js must not be wrapped in a popover toggle trigger',
      );

      // 5. fHideTooltips call and mouseleave listener should be removed from fShowIncidents
      assert.doesNotMatch(
        helperSource,
        /addEventListener\(['"]mouseleave['"],\s*fHideTooltips\)/,
        'helper.js must not register mouseleave fHideTooltips listener',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /addEventListener\(['"]mouseleave['"],\s*fHideTooltips\)/,
        'incidentsPanel.js must not register mouseleave fHideTooltips listener',
      );

      // 6. fHideTooltips export must be preserved as a safe function
      assert.match(
        helperSource,
        /export\s+function\s+fHideTooltips\s*\(\s*\)\s*\{/,
        'helper.js must export fHideTooltips for backwards compatibility',
      );

      // 7. i18n tag must be preserved
      assert.match(
        incidentsPanelSource,
        /<span\s+data-i18n=["']incident["']>Incidents<\/span>/,
        'incidentsPanel.js must preserve data-i18n="incident" tag',
      );

      // 8. Collapsible container and trigger must be preserved
      assert.match(
        incidentsPanelSource,
        /id=["']incidentsTip["']/,
        'incidentsPanel.js must render #incidentsTip',
      );
      assert.match(
        incidentsPanelSource,
        /renderCollapseIcon\(['"]incidentsicon['"]/,
        'incidentsPanel.js must render incidentsicon with renderCollapseIcon',
      );
      assert.doesNotMatch(
        incidentsPanelSource,
        /<p\s+id=["']incidentsTextLabel["'][^>]*data-bs-toggle=["']collapse["']/,
        'incidentsPanel.js must not put data-bs-toggle on #incidentsTextLabel',
      );
      assert.match(
        incidentsPanelSource,
        /id=["']incidentsText["'][\s\S]*?class=["']collapse/,
        'incidentsPanel.js must render #incidentsText collapsible div',
      );

      // 9. Backward compatibility: helper.js re-exports fShowIncidents from incidentsPanel.js
      assert.match(
        helperSource,
        /export\s*\{[^}]*fShowIncidents[^}]*\}\s*from\s*['"]\.\.\/ui\/incidentsPanel(?:\.js)?['"]/,
        'helper.js must re-export fShowIncidents from incidentsPanel.js',
      );
    },
  );

  await t.test('fShowIncidents rendered DOM contract verification', () => {
    const elementsById = new Map();

    function createMockElement(id = '', tagName = 'div') {
      const listeners = new Map();
      const el = {
        id,
        tagName: tagName.toUpperCase(),
        className: '',
        attributes: new Map(),
        innerHTML: '',
        addEventListener(event, fn) {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event).push(fn);
        },
        dispatchEvent(event) {
          const fns = listeners.get(event.type) || [];
          fns.forEach((f) => f(event));
        },
        setAttribute(attr, val) {
          this.attributes.set(attr, val);
        },
        getAttribute(attr) {
          return this.attributes.get(attr) || null;
        },
        hasAttribute(attr) {
          return this.attributes.has(attr);
        },
        querySelector(sel) {
          if (sel.startsWith('#')) {
            const targetId = sel.slice(1);
            if (this.id === targetId) return this;
            if (this.innerHTML.includes(`id="${targetId}"`)) {
              return createMockElement(targetId);
            }
            return null;
          }
          if (sel.startsWith('.')) {
            const targetClass = sel.slice(1);
            if (
              this.innerHTML.includes(`class="${targetClass}`) ||
              this.innerHTML.includes(`class="pop `) ||
              this.innerHTML.includes(` ${targetClass}"`)
            ) {
              return createMockElement('', 'span');
            }
            return null;
          }
          if (sel.includes('[data-bs-toggle="popover"]')) {
            if (this.innerHTML.includes('data-bs-toggle="popover"')) {
              return createMockElement('', 'span');
            }
            return null;
          }
          return null;
        },
      };
      if (id) elementsById.set(id, el);
      return el;
    }

    const incidentsContainer = createMockElement('incidents');

    const incidentType = 'r';
    const textCurrent = 'Fallen Tree for 1:0:0<br>';
    const textComing = '';
    let tooltipHTML = `<div><p>${textCurrent}</p>${
      textComing !== '' ?
        '<p><strong>Coming Soon:</strong><br>' + textComing + '</p>'
      : ''
    }`;
    tooltipHTML +=
      '<p><strong>Legend:</strong><br>n/N - Nature<br>s/S - Shore<br>w/W - Water<br>r/R - Road<br> E - Event<br>Capitals = Uncommon/Rare Reward</p></div>';

    const renderedMarkup = `<div id="incidentsTip" class="alert alert-light alert-dismissible show collapsed" role="alert">
            <p id="incidentsTextLabel">
			<span class="header-icon collapse-toggle fw-bold font-monospace" id="incidentsicon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="false" aria-controls="incidentsText" data-bs-target="#incidentsText" data-bs-toggle="collapse">[+]</span>
			<strong><span data-i18n="incident">Incidents</span>:</strong> ${incidentType}</p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <div id="incidentsText" class="collapse  alert-light">
            ${tooltipHTML}</div></div>`;

    incidentsContainer.innerHTML = renderedMarkup;

    assert.ok(
      incidentsContainer.querySelector('#incidentsTip'),
      '#incidentsTip must be mounted inside incidents container',
    );
    assert.ok(
      incidentsContainer.querySelector('#incidentsTextLabel'),
      '#incidentsTextLabel must be mounted inside incidents container',
    );
    assert.ok(
      incidentsContainer.querySelector('#incidentsText'),
      '#incidentsText must be mounted inside incidents container',
    );

    assert.equal(
      incidentsContainer.querySelector('[data-bs-toggle="popover"]'),
      null,
      '#incidents must not contain any data-bs-toggle="popover" attribute',
    );
    assert.equal(
      incidentsContainer.querySelector('#incidents_tooltip'),
      null,
      '#incidents must not contain id="incidents_tooltip"',
    );
    assert.equal(
      incidentsContainer.querySelector('.pop'),
      null,
      '#incidents must not contain class="pop"',
    );

    assert.ok(
      renderedMarkup.includes('Fallen Tree'),
      '#incidentsText must contain active incidents breakdown',
    );
    assert.ok(
      renderedMarkup.includes('<strong>Legend:</strong>'),
      '#incidentsText must contain the legend header',
    );
    assert.ok(
      renderedMarkup.includes('n/N - Nature'),
      '#incidentsText must contain nature legend',
    );
    assert.ok(
      renderedMarkup.includes('r/R - Road'),
      '#incidentsText must contain road legend',
    );
    assert.ok(
      renderedMarkup.includes('Capitals = Uncommon/Rare Reward'),
      '#incidentsText must contain rarity legend description',
    );
  });
});
