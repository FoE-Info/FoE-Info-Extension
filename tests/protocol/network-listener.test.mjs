import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/networkListener.js';

const {
  handleRawNetworkEntry,
  handleRequestFinished,
  isDuplicatePayload,
  safeProcessContent,
  initNetworkListeners,
  clearDuplicatePayloadCache,
  setGameVersion,
  getType,
} = pkg;

test('networkListener - Payload Deduplication Cache', async (t) => {
  clearDuplicatePayloadCache();

  await t.test('detects duplicate payloads within 3000ms window', () => {
    const url = 'https://en1.forgeofempires.com/game/json';
    const body = JSON.stringify([{ requestClass: 'CityProductionService' }]);

    assert.equal(isDuplicatePayload(url, body), false);
    assert.equal(isDuplicatePayload(url, body), true);

    const diffBody = JSON.stringify([{ requestClass: 'OtherService' }]);
    assert.equal(isDuplicatePayload(url, diffBody), false);

    const diffUrl = 'https://en2.forgeofempires.com/game/json';
    assert.equal(isDuplicatePayload(diffUrl, body), false);
  });

  await t.test('handles empty and null inputs safely', () => {
    assert.equal(isDuplicatePayload('', 'test'), false);
    assert.equal(isDuplicatePayload('https://url', null), false);
    assert.equal(isDuplicatePayload(null, null), false);
  });
});

test('networkListener - handleRawNetworkEntry Origin and World Detection', async (t) => {
  await t.test('detects world and updates origin and storage', async () => {
    let recordedOrigin = null;
    let registeredWorld = null;
    let setWorldVal = null;
    let dispatched = false;

    const mockStorage = {
      getCurrentWorld: () => 'old_world',
      setWorld: (w) => {
        setWorldVal = w;
      },
      getWorldSettings: async () => ({ showOptions: { someOption: true } }),
      registerKnownWorld: (w) => {
        registeredWorld = w;
      },
    };

    const mockDispatcher = {
      dispatchRaw: async () => {
        dispatched = true;
        return { batchResult: { results: [] } };
      },
    };

    handleRawNetworkEntry(
      'https://us12.forgeofempires.com/game/json?h=xyz',
      [],
      '[{"__class__":"ServerRequest"}]',
      '',
      null,
      {
        storage: mockStorage,
        setGameOrigin: (origin) => {
          recordedOrigin = origin;
        },
        messageDispatcher: mockDispatcher,
      },
    );

    assert.equal(recordedOrigin, 'https://us12.forgeofempires.com');
    assert.equal(setWorldVal, 'us12');
    assert.equal(registeredWorld, 'us12');
    assert.equal(dispatched, true);
  });

  await t.test(
    'ignores network entries when inspectedWorldId does not match',
    () => {
      let dispatched = false;
      handleRawNetworkEntry(
        'https://us15.forgeofempires.com/game/json',
        [],
        '[{}]',
        '',
        null,
        {
          inspectedWorldId: 'us12',
          messageDispatcher: {
            dispatchRaw: async () => {
              dispatched = true;
            },
          },
        },
      );
      assert.equal(dispatched, false);
    },
  );

  await t.test('detects client-identification game version', () => {
    let updatedVersion = null;
    setGameVersion('1.00');

    handleRawNetworkEntry(
      'https://en1.forgeofempires.com/game/json',
      [{ name: 'client-identification', value: 'version=1.285.0' }],
      '[{}]',
      '',
      null,
      {
        onGameVersionChange: (v) => {
          updatedVersion = v;
        },
        messageDispatcher: { dispatchRaw: async () => {} },
      },
    );

    assert.equal(updatedVersion, '1.285');
  });
});

test('networkListener - safeProcessContent Handling', async (t) => {
  await t.test('handles promise-based getContent successfully', async () => {
    let processedContent = null;
    let processedEncoding = null;

    const mockRequest = {
      getContent: async () => ['{"data":123}', 'utf-8'],
    };

    safeProcessContent(mockRequest, (content, encoding) => {
      processedContent = content;
      processedEncoding = encoding;
    });

    // Let microtasks flush
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(processedContent, '{"data":123}');
    assert.equal(processedEncoding, 'utf-8');
  });

  await t.test('handles callback-based getContent successfully', () => {
    let processedContent = null;

    const mockRequest = {
      getContent: (cb) => {
        if (typeof cb === 'function') {
          cb('legacy-content', 'base64');
        } else {
          throw new Error('Callback required');
        }
      },
    };

    safeProcessContent(mockRequest, (content) => {
      processedContent = content;
    });

    assert.equal(processedContent, 'legacy-content');
  });
});

test('networkListener - initNetworkListeners and DevTools Bridge', () => {
  let messageListener = null;
  const mockBrowser = {
    runtime: {
      onMessage: {
        addListener: (fn) => {
          messageListener = fn;
        },
      },
    },
    devtools: {
      inspectedWindow: {
        tabId: 42,
      },
    },
  };

  const listeners = initNetworkListeners({
    browser: mockBrowser,
  });

  assert.equal(typeof messageListener, 'function');
  assert.equal(typeof listeners.handleRawNetworkEntry, 'function');
  assert.equal(typeof listeners.handleRequestFinished, 'function');

  // Test sender tabId filter: ignores mismatched tabId
  let dispatched = false;
  messageListener(
    {
      type: 'FOE_INFO_NET_DATA',
      url: 'https://en1.forgeofempires.com/game/json',
      body: '[{}]',
    },
    { tab: { id: 99 } }, // Different tabId than inspectedWindow (42)
  );
  assert.equal(dispatched, false);
});

test('networkListener - handleRequestFinished Routing', async () => {
  let dispatchedUrl = null;

  const mockRequest = {
    request: {
      url: 'https://en1.forgeofempires.com/game/json?h=abc',
      headers: [{ name: 'client-identification', value: 'ident___1.290.0' }],
    },
    response: {
      headers: [
        { name: 'content-type', value: 'application/json; charset=utf-8' },
      ],
    },
    getContent: async () => ['[{"requestClass":"TimeService"}]', ''],
  };

  let capturedVersion = null;
  handleRequestFinished(mockRequest, {
    onGameVersionChange: (v) => {
      capturedVersion = v;
    },
    messageDispatcher: {
      dispatchRaw: async (url) => {
        dispatchedUrl = url;
        return { batchResult: { results: [] } };
      },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(capturedVersion, '1.290');
  assert.equal(dispatchedUrl, 'https://en1.forgeofempires.com/game/json?h=abc');
});

test('networkListener - getType helper', () => {
  assert.equal(getType('application/json; charset=utf-8'), 'json');
  assert.equal(getType('text/javascript'), 'javascript');
  assert.equal(getType(null), '');
});
