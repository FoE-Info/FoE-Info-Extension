import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  buildIncidentMarkup,
  buildIncidentTooltip,
  fIncidentName,
  fShowIncidents,
} from '../../src/js/ui/incidentsPanel.js';

describe('incidentsPanel UI Suite', () => {
  describe('fIncidentName', () => {
    it('maps standard road incident types', () => {
      const tree = fIncidentName('incident_fallen_tree_1x1');
      assert.equal(tree.type, 'r');
      assert.equal(tree.text, 'Fallen Tree');

      const tree2x2 = fIncidentName('incident_fallen_tree_2x2');
      assert.equal(tree2x2.type, '<strong>R</strong>');
      assert.equal(tree2x2.text, 'Fallen Tree 2x2');
    });

    it('maps nature and water incident types', () => {
      const bones = fIncidentName('incident_dinosaur_bones');
      assert.equal(bones.type, '<strong>N</strong>');

      const castaway = fIncidentName('incident_castaway');
      assert.equal(castaway.type, 'w');
      assert.equal(castaway.text, 'Castaway');
    });

    it('handles event incidents with green spans', () => {
      const cherry = fIncidentName('spring_cherry_tree');
      assert.equal(cherry.type, "<span class='green'>E</span>");
      assert.equal(cherry.text, 'Cherry Tree');

      const bday = fIncidentName('ages_birthday_gift_1');
      assert.equal(bday.type, "<span class='green'>E</span>");
      assert.equal(bday.text, 'Paper Money');
    });

    it('falls back to ? for unknown incidents', () => {
      const unknown = fIncidentName('incident_unknown_custom');
      assert.equal(unknown.type, '?');
      assert.equal(unknown.text, 'incident_unknown_custom');
    });
  });

  describe('buildIncidentTooltip', () => {
    it('builds tooltip body with legend and active incidents', () => {
      const html = buildIncidentTooltip('Pothole for 0:10:0<br>');
      assert.ok(html.includes('Pothole for 0:10:0<br>'));
      assert.ok(html.includes('<strong>Legend:</strong>'));
      assert.ok(!html.includes('Coming Soon:'));
    });

    it('includes Coming Soon section when present', () => {
      const html = buildIncidentTooltip(
        'Pothole for 0:10:0<br>',
        'Shipwreck in 1:0:0<br>',
      );
      assert.ok(html.includes('<strong>Coming Soon:</strong>'));
      assert.ok(html.includes('Shipwreck in 1:0:0<br>'));
    });
  });

  describe('buildIncidentMarkup', () => {
    it('creates alert container with collapsible card and data-i18n="incident"', () => {
      const markup = buildIncidentMarkup({
        type: 'r',
        tooltipHTML: '<div>content</div>',
        isCollapsed: true,
      });

      assert.ok(markup.includes('id="incidentsTip"'));
      assert.ok(markup.includes('id="incidentsTextLabel"'));
      assert.ok(markup.includes('data-i18n="incident"'));
      assert.ok(markup.includes('id="incidentsText"'));
    });
  });

  describe('fShowIncidents container rendering', () => {
    let mockContainer;

    beforeEach(() => {
      mockContainer = {
        innerHTML: '',
        querySelector() {
          return null;
        },
      };
    });

    it('renders empty innerHTML when no rewards are present', () => {
      fShowIncidents(mockContainer);
      assert.equal(mockContainer.innerHTML, '');
    });
  });
});
