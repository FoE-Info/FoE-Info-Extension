import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';
import { MessageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';

describe('GBG Signals & MessageDispatcher RPC Suite', () => {
  let dispatcher;
  let signalsState;
  let checkedProvincesCount;

  beforeEach(() => {
    dispatcher = new MessageDispatcher();
    signalsState = [];
    checkedProvincesCount = 0;

    const mockSetSignal = (msg, payload) => {
      let data =
        Array.isArray(payload) && payload.length > 0 ?
          payload
        : msg?.requestData || [];
      const pid = Number(data[0]);
      const stype = data[1];
      if (stype === 'ignore') {
        signalsState = signalsState.filter(
          (p) => Number(p.provinceId ?? p.id) !== pid,
        );
      } else if (stype === 'focus') {
        signalsState = signalsState.filter(
          (p) => Number(p.provinceId ?? p.id) !== pid,
        );
        signalsState.push({
          provinceId: pid,
          signal: 'focus',
          id: pid,
          type: 'focus',
        });
      }
      checkedProvincesCount++;
    };

    const mockRemoveSignal = (msg, payload) => {
      let data =
        Array.isArray(payload) && payload.length > 0 ?
          payload
        : msg?.requestData || [];
      const pid = Number(data[0]);
      signalsState = signalsState.filter(
        (p) => Number(p.provinceId ?? p.id) !== pid,
      );
      checkedProvincesCount++;
    };

    registerLegacyBridge(dispatcher, {
      setSignal: mockSetSignal,
      removeSignal: mockRemoveSignal,
    });
  });

  it('populates requestData when server response has requestData: null and client sent postData', async () => {
    const postBody = JSON.stringify([
      {
        __class__: 'ServerRequest',
        requestData: [13, 'focus'],
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'setSignal',
        requestId: 42,
      },
    ]);

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestData: null,
        responseData: true,
        requestId: 42,
      },
    ]);

    const requestObj = {
      request: {
        method: 'POST',
        postData: { text: postBody },
      },
    };

    const result = await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?h=test',
      responseBody,
      '',
      [],
      requestObj,
    );

    assert.equal(result.handled, true);
    assert.equal(signalsState.length, 1);
    assert.equal(signalsState[0].provinceId, 13);
    assert.equal(signalsState[0].signal, 'focus');
    assert.equal(checkedProvincesCount, 1);
  });

  it('removes signal when removeSignal RPC is dispatched', async () => {
    // Pre-populate with a signal
    signalsState = [{ provinceId: 13, signal: 'focus', id: 13, type: 'focus' }];

    const postBody = JSON.stringify([
      {
        __class__: 'ServerRequest',
        requestData: [13],
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'removeSignal',
        requestId: 43,
      },
    ]);

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestData: null,
        responseData: true,
        requestId: 43,
      },
    ]);

    const requestObj = {
      request: {
        method: 'POST',
        postData: { text: postBody },
      },
    };

    const result = await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?h=test',
      responseBody,
      '',
      [],
      requestObj,
    );

    assert.equal(result.handled, true);
    assert.equal(signalsState.length, 0);
    assert.equal(checkedProvincesCount, 1);
  });

  it('handles postData forwarded as plain request object from devtools.js', async () => {
    const postBody = JSON.stringify([
      {
        __class__: 'ServerRequest',
        requestData: [24, 'focus'],
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'setSignal',
        requestId: 99,
      },
    ]);

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestData: null,
        responseData: true,
        requestId: 99,
      },
    ]);

    // Plain request structure produced by devtools.js extractEntryRequest
    const plainRequest = {
      url: 'https://en7.forgeofempires.com/game/json?h=test',
      method: 'POST',
      headers: [],
      postData: { text: postBody },
      request: {
        url: 'https://en7.forgeofempires.com/game/json?h=test',
        method: 'POST',
        headers: [],
        postData: { text: postBody },
      },
    };

    await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?h=test',
      responseBody,
      '',
      [],
      plainRequest,
    );

    assert.equal(signalsState.length, 1);
    assert.equal(signalsState[0].provinceId, 24);
  });

  it('handles postData when already an object or array instead of a string', async () => {
    const rawItems = [
      {
        __class__: 'ServerRequest',
        requestData: [35, 'focus'],
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'setSignal',
        requestId: 105,
      },
    ];

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestData: null,
        responseData: true,
        requestId: 105,
      },
    ]);

    // Request where postData.text is already an array or object
    const objPayloadRequest = {
      postData: { text: rawItems },
    };

    await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?h=test',
      responseBody,
      '',
      [],
      objPayloadRequest,
    );

    assert.equal(signalsState.length, 1);
    assert.equal(signalsState[0].provinceId, 35);
  });

  it('routes GuildBattlegroundSignalsService.updateSignal with no signal to removeSignal', async () => {
    signalsState = [{ provinceId: 14, signal: 'focus', id: 14, type: 'focus' }];

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'updateSignal',
        responseData: { provinceId: 14 },
      },
    ]);

    const result = await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?source=ws',
      responseBody,
      '',
      [],
      null,
    );

    assert.equal(result.handled, true);
    assert.equal(signalsState.length, 0);
  });

  it('routes GuildBattlegroundSignalsService.updateSignal with focus to setSignal', async () => {
    signalsState = [];

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestClass: 'GuildBattlegroundSignalsService',
        requestMethod: 'updateSignal',
        responseData: { provinceId: 14, signal: 'focus' },
      },
    ]);

    const result = await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?source=ws',
      responseBody,
      '',
      [],
      null,
    );

    assert.equal(result.handled, true);
    assert.equal(signalsState.length, 1);
    assert.equal(signalsState[0].provinceId, 14);
    assert.equal(signalsState[0].signal, 'focus');
  });

  it('routes GuildBattlegroundService.getProvinces to getUpdatedProvinces handler', async () => {
    let updatedCalledWith = null;
    registerLegacyBridge(dispatcher, {
      getUpdatedProvinces: (msg) => {
        updatedCalledWith = msg?.responseData;
      },
    });

    const responseBody = JSON.stringify([
      {
        __class__: 'ServerResponse',
        requestClass: 'GuildBattlegroundService',
        requestMethod: 'getProvinces',
        responseData: [{ id: 14, ownerId: 104382, lockedUntil: 1789125281 }],
      },
    ]);

    const result = await dispatcher.dispatchRaw(
      'https://en7.forgeofempires.com/game/json?source=ws',
      responseBody,
      '',
      [],
      null,
    );

    assert.equal(result.handled, true);
    assert.deepEqual(updatedCalledWith, [
      { id: 14, ownerId: 104382, lockedUntil: 1789125281 },
    ]);
  });
});
