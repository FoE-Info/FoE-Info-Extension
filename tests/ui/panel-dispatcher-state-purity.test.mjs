import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const PANEL_DISPATCHER_FILES = [
  'src/js/ui/panelDispatcher.js',
  'src/js/ui/panelDispatcher.ts',
];

test('panelDispatcher reads ResourceDefs from state, not msg services', () => {
  for (const file of PANEL_DISPATCHER_FILES) {
    const source = fs.readFileSync(file, 'utf8');

    assert.doesNotMatch(
      source,
      /['"`](?:\.\.\/)+msg\//,
      `${file} must not import from msg/`,
    );
    assert.match(
      source,
      /\.\.\/state\/state\.js/,
      `${file} must read ResourceDefs from state/state.js`,
    );
  }
});
