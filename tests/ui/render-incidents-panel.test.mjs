import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildIncidentMarkup,
  buildIncidentTooltip,
  fIncidentName,
  renderIncidentsPanel,
} from '../../src/js/ui/renderIncidentsPanel.js';

describe('renderIncidentsPanel standalone UI module', () => {
  it('correctly looks up known and unknown incident descriptors', () => {
    const tree = fIncidentName('incident_fallen_tree_1x1');
    assert.equal(tree.type, 'r');
    assert.equal(tree.text, 'Fallen Tree');

    const unknown = fIncidentName('unknown_incident_xyz');
    assert.equal(unknown.type, '?');
    assert.equal(unknown.text, 'unknown_incident_xyz');
  });

  it('builds tooltip and markup without throwing', () => {
    const tooltip = buildIncidentTooltip('Fallen Tree for 1:00:00<br>', '');
    assert.ok(tooltip.includes('Fallen Tree'));

    const markup = buildIncidentMarkup({
      type: 'r',
      tooltipHTML: tooltip,
      isCollapsed: false,
    });
    assert.ok(markup.includes('incidentsTip'));
    assert.ok(markup.includes('incidentsText'));
  });

  it('renders into a target DOM mock container', () => {
    const mockContainer = {
      innerHTML: '',
    };
    const now = Date.now();
    const context = {
      showOptions: { showIncidents: true },
      hiddenRewards: [
        {
          type: 'incident_fallen_tree_1x1',
          position: { context: 'city' },
          startTime: now - 10000,
          expireTime: now + 50000,
        },
      ],
      collapseIncidents: false,
    };

    renderIncidentsPanel(mockContainer, context);
    assert.ok(mockContainer.innerHTML.includes('incidentsTip'));
    assert.ok(mockContainer.innerHTML.includes('Fallen Tree'));
  });

  it('clears or does not render when no active rewards or showIncidents is false', () => {
    const mockContainer = {
      innerHTML: 'previous',
    };
    const context = {
      showOptions: { showIncidents: false },
      hiddenRewards: [],
    };

    renderIncidentsPanel(mockContainer, context);
    // When showOptions is false, fShowIncidents doesn't touch or clears
    assert.ok(
      mockContainer.innerHTML === 'previous' || mockContainer.innerHTML === '',
    );
  });
});
