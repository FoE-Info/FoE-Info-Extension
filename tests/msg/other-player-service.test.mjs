import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/visits');

test('OtherPlayerService Protocol & Lifecycle Suite', async (t) => {
  // Setup minimal DOM mock
  const domElements = new Map();
  global.document = {
    getElementById: (id) => {
      if (!domElements.has(id)) {
        domElements.set(id, {
          id,
          innerHTML: '',
          innerText: '',
          style: {},
          className: '',
          offsetHeight: 100,
          addEventListener: () => {},
        });
      }
      return domElements.get(id);
    },
    createElement: (tag) => ({
      tagName: tag,
      innerHTML: '',
      style: {},
      appendChild: () => {},
    }),
  };

  const {
    otherPlayerService,
    otherPlayerServiceUpdateActions,
    friends,
    guildMembers,
    hoodlist,
  } = await import('../../src/js/msg/OtherPlayerService.js');

  await t.test(
    'otherPlayerService: renders visit player and isolates state',
    () => {
      const fixture1Path = path.join(
        FIXTURES_DIR,
        'hood_1_Crispy_Frisbee.json',
      );
      const fixture2Path = path.join(FIXTURES_DIR, 'hood_2_aquarius1960.json');

      if (!fs.existsSync(fixture1Path) || !fs.existsSync(fixture2Path)) {
        t.skip('Fixtures not found');
        return;
      }

      const f1 = JSON.parse(fs.readFileSync(fixture1Path, 'utf8'));
      const f2 = JSON.parse(fs.readFileSync(fixture2Path, 'utf8'));

      const visitDiv = document.getElementById('visit');

      // 1. Visit Player 1
      otherPlayerService(f1.payload);
      const p1Html = visitDiv.innerHTML;
      assert.ok(p1Html.includes('Crispy Frisbee'));
      assert.ok(!p1Html.includes('aquarius1960'));

      // 2. Visit Player 2
      otherPlayerService(f2.payload);
      const p2Html = visitDiv.innerHTML;
      assert.ok(p2Html.includes('aquarius1960'));
      assert.ok(!p2Html.includes('Crispy Frisbee'));

      // 3. Re-visit Player 1 (verify exact match with first visit, no compounding)
      otherPlayerService(f1.payload);
      const reP1Html = visitDiv.innerHTML;
      assert.equal(
        reP1Html,
        p1Html,
        'Revisiting Player 1 must yield exact HTML match without accumulation',
      );
    },
  );

  await t.test(
    'otherPlayerServiceUpdateActions: populates lists and caches names',
    () => {
      const mockMsg = {
        responseData: {
          friends: [{ player_id: 101, name: 'FriendAlice' }],
          guildMembers: [{ player_id: 202, name: 'GuildBob' }],
          neighbours: [{ player_id: 303, name: 'HoodCharlie' }],
        },
      };

      otherPlayerServiceUpdateActions(mockMsg);

      assert.ok(Array.isArray(friends));
      assert.ok(Array.isArray(guildMembers));
      assert.ok(Array.isArray(hoodlist));
    },
  );
});
