import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import inventoryPkg from '../../src/js/msg/InventoryService.js';
import renderLivePkg from '../../src/js/ui/renderLiveCityStats.js';

const { inventoryService } = inventoryPkg;
const { renderLiveCityStats } = renderLivePkg;

test('InventoryService Available FP Dynamic Ingestion Suite', async (t) => {
  // Mock DOM
  const elements = new Map();
  global.document = {
    getElementById: (id) => {
      if (!elements.has(id)) {
        const el = {
          id,
          innerHTML: '',
          style: {},
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
          },
          addEventListener: () => {},
          querySelector: () => ({ addEventListener: () => {} }),
          querySelectorAll: () => [],
          textContent: '',
        };
        elements.set(id, el);
      }
      return elements.get(id);
    },
    querySelectorAll: () => [],
    querySelector: () => ({ addEventListener: () => {} }),
    createElement: (tag) => ({
      tagName: tag,
      innerHTML: '',
      style: {},
      appendChild: () => {},
      addEventListener: () => {},
    }),
  };

  const mockState = {
    availablePacksFP: 0,
  };
  inventoryService.setState(mockState);

  await t.test(
    '1. getItems calculates FP from packages and updates state.availablePacksFP and #availableFPID',
    () => {
      // Simulate login.har entry 563: 31,925 packages of 10 FP
      const mockMsg = {
        requestClass: 'InventoryService',
        requestMethod: 'getItems',
        responseData: [
          {
            id: 1001,
            itemEntity: {
              id: 'fp_pack_10',
              name: '10 Forge Points',
            },
            inStock: 31925,
            item: {
              value: 10,
              type: 'forge_points',
            },
          },
          {
            id: 1002,
            itemEntity: {
              id: 'other_item',
              name: 'Goods Cache',
            },
            inStock: 50,
          },
        ],
      };

      const result = inventoryService.getItems(mockMsg);
      assert.equal(result.totalForgePoints.toString(), '319250');
      assert.equal(mockState.availablePacksFP, 319250);

      const availableEl = global.document.getElementById('availableFPID');
      assert.equal(availableEl.textContent, '319250');
    },
  );

  await t.test(
    '2. renderLiveCityStats dynamically reads updated availablePacksFP',
    () => {
      const stats = renderLiveCityStats({ availablePacksFP: 319250 });
      assert.ok(stats, 'renderLiveCityStats returned stats object');
      assert.equal(stats.availableFP, 319250);
    },
  );

  await t.test(
    '3. state.js and state.d.ts export setAvailablePacksFP mutator',
    () => {
      const stateFile = fs.readFileSync(
        path.resolve('src/js/state/state.js'),
        'utf8',
      );
      assert.match(
        stateFile,
        /export\s+function\s+setAvailablePacksFP\s*\(\s*val\s*\)\s*\{/,
        'state.js must export setAvailablePacksFP',
      );
      assert.match(
        stateFile,
        /availablePacksFP\s*=\s*Number\.isFinite\(num\)\s*\?\s*num\s*:\s*0/,
        'setAvailablePacksFP must sanitize and set availablePacksFP',
      );

      const dtsFile = fs.readFileSync(
        path.resolve('src/types/state.d.ts'),
        'utf8',
      );
      assert.match(
        dtsFile,
        /export\s+function\s+setAvailablePacksFP\s*\(\s*val:\s*number\s*\):\s*number;/,
        'state.d.ts must declare setAvailablePacksFP',
      );
    },
  );

  await t.test(
    '4. simulated Webpack ESM module namespace (getter-only availablePacksFP) updates via setAvailablePacksFP without TypeError',
    () => {
      let internalFP = 0;
      // Replicate Webpack ES module namespace object: getter-only availablePacksFP property
      const esmNamespaceMock = {};
      Object.defineProperty(esmNamespaceMock, 'availablePacksFP', {
        get() {
          return internalFP;
        },
        enumerable: true,
        configurable: false,
      });
      esmNamespaceMock.setAvailablePacksFP = (val) => {
        const num = Number(val);
        internalFP = Number.isFinite(num) ? num : 0;
        return internalFP;
      };

      inventoryService.setState(esmNamespaceMock);
      const originalConsoleError = console.error;
      let errorLogged = false;
      console.error = (...args) => {
        errorLogged = true;
        originalConsoleError(...args);
      };

      try {
        const mockMsg = {
          requestClass: 'InventoryService',
          requestMethod: 'getItems',
          responseData: [
            {
              id: 2001,
              itemEntity: { id: 'fp_pack_5', name: '5 Forge Points' },
              inStock: 10,
              item: { value: 5, type: 'forge_points' },
            },
          ],
        };

        const result = inventoryService.getItems(mockMsg);
        assert.equal(result.totalForgePoints.toString(), '50');
        assert.equal(esmNamespaceMock.availablePacksFP, 50);
        assert.equal(
          errorLogged,
          false,
          'Expected no console.error when using Webpack ESM namespace mock with setAvailablePacksFP',
        );
      } finally {
        console.error = originalConsoleError;
      }
    },
  );

  await t.test(
    '5. backward compatibility: plain state object without setAvailablePacksFP falls back to property assignment',
    () => {
      const plainState = { availablePacksFP: 0 };
      inventoryService.setState(plainState);

      const mockMsg = {
        requestClass: 'InventoryService',
        requestMethod: 'getItems',
        responseData: [
          {
            id: 3001,
            itemEntity: { id: 'fp_pack_2', name: '2 Forge Points' },
            inStock: 5,
            item: { value: 2, type: 'forge_points' },
          },
        ],
      };

      const result = inventoryService.getItems(mockMsg);
      assert.equal(result.totalForgePoints.toString(), '10');
      assert.equal(plainState.availablePacksFP, 10);
    },
  );
});
