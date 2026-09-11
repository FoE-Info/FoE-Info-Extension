import assert from 'node:assert/strict';
import test from 'node:test';
import copyPkg from '../../src/js/utils/copy.js';

const {
  BattlegroundCopy,
  DonationCopy,
  ExpeditionCopy,
  fCityStatsCopy,
  fFriendsCopy,
  fGuildCopy,
  fHoodCopy,
} = copyPkg.default || copyPkg;

test('Copy Utilities Null-Safety Suite', async (t) => {
  await t.test(
    'ExpeditionCopy handles absent elements without throwing',
    () => {
      const prevDoc = globalThis.document;
      const prevWindow = globalThis.window;
      try {
        globalThis.document = {
          getElementById: () => null,
        };
        globalThis.window = {};
        assert.doesNotThrow(() => {
          ExpeditionCopy('missingId');
        });
      } finally {
        globalThis.document = prevDoc;
        globalThis.window = prevWindow;
      }
    },
  );

  await t.test(
    'ExpeditionCopy selects geChampionshipText when targeted',
    () => {
      const mockElem = { id: 'geChampionshipText' };
      let selectedNode = null;
      let execCommandCalled = false;

      const prevDoc = globalThis.document;
      const prevWindow = globalThis.window;
      try {
        globalThis.document = {
          getElementById: (id) =>
            id === 'geChampionshipText' ? mockElem : null,
          createRange: () => ({
            selectNode: (node) => {
              selectedNode = node;
            },
          }),
          execCommand: (cmd) => {
            if (cmd === 'copy') execCommandCalled = true;
          },
        };
        globalThis.window = {
          getSelection: () => ({
            removeAllRanges: () => {},
            addRange: () => {},
          }),
        };

        ExpeditionCopy('geChampionshipText');
        assert.equal(selectedNode, mockElem);
        assert.equal(execCommandCalled, true);
      } finally {
        globalThis.document = prevDoc;
        globalThis.window = prevWindow;
      }
    },
  );

  await t.test('DonationCopy handles absent copyText safely', () => {
    const prevDoc = globalThis.document;
    try {
      globalThis.document = {
        getElementById: () => null,
      };
      assert.doesNotThrow(() => {
        DonationCopy();
      });
    } finally {
      globalThis.document = prevDoc;
    }
  });

  await t.test('BattlegroundCopy handles absent table safely', () => {
    const prevDoc = globalThis.document;
    try {
      globalThis.document = {
        querySelector: () => null,
      };
      assert.doesNotThrow(() => {
        BattlegroundCopy();
      });
    } finally {
      globalThis.document = prevDoc;
    }
  });

  await t.test(
    'Social lists copy functions handle absent elements safely',
    () => {
      const prevDoc = globalThis.document;
      try {
        globalThis.document = {
          getElementById: () => null,
        };
        assert.doesNotThrow(() => {
          fFriendsCopy();
          fGuildCopy();
          fHoodCopy();
          fCityStatsCopy();
        });
      } finally {
        globalThis.document = prevDoc;
      }
    },
  );
});
