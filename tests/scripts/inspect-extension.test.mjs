import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync('.agents/scripts/inspect-extension.js', 'utf8');

async function inspect(scenario) {
  const output = [];
  const timers = [];
  const proc = {
    argv: ['node', 'inspect', '10', '--target', 'panel.html'],
    exitCode: 0,
  };
  proc.exit = (code) => {
    proc.exitCode = code;
  };
  class Socket {
    constructor() {
      this.events = new EventEmitter();
      queueMicrotask(() =>
        this.events.emit(scenario === 'disconnected' ? 'error' : 'open', {}),
      );
    }
    addEventListener(event, fn) {
      this.events.on(event, event === 'message' ? (data) => fn({ data }) : fn);
    }
    send(raw) {
      const request = JSON.parse(raw);
      if (scenario === 'unacknowledged') return;
      const reply =
        scenario === 'rejected' ?
          { error: { message: 'denied' } }
        : { result: {} };
      queueMicrotask(() =>
        this.events.emit(
          'message',
          JSON.stringify({ id: request.id, ...reply }),
        ),
      );
      if (scenario === 'exception' && request.method === 'Runtime.enable') {
        queueMicrotask(() =>
          this.events.emit(
            'message',
            JSON.stringify({
              method: 'Runtime.exceptionThrown',
              params: { exceptionDetails: { text: 'broken panel' } },
            }),
          ),
        );
      }
      if (scenario === 'warning' && request.method === 'Log.enable') {
        queueMicrotask(() =>
          this.events.emit(
            'message',
            JSON.stringify({
              method: 'Log.entryAdded',
              params: { entry: { level: 'warning', text: 'panel warning' } },
            }),
          ),
        );
      }
    }
    close() {
      this.events.emit('close', {});
    }
  }
  const http = {
    get(_url, callback) {
      const response = new EventEmitter();
      response.statusCode = 200;
      queueMicrotask(() => {
        callback(response);
        response.emit(
          'data',
          JSON.stringify([
            {
              url:
                scenario === 'wrong-target' ?
                  'chrome-extension://other/sidepanel.html'
                : 'chrome-extension://test/panel.html',
              webSocketDebuggerUrl: 'ws://test',
            },
          ]),
        );
        response.emit('end');
      });
      return {
        on() {
          return this;
        },
        setTimeout() {
          return this;
        },
      };
    },
  };
  vm.runInNewContext(source, {
    require(name) {
      if (name === 'http') return http;
      if (name === 'ws') throw Error('unavailable');
      return {};
    },
    WebSocket: Socket,
    process: proc,
    console: {
      log: (...args) => output.push(args.join(' ')),
      error: (...args) => output.push(args.join(' ')),
    },
    setTimeout: (fn) => {
      timers.push(fn);
    },
    clearTimeout() {},
  });
  await new Promise((resolve) => setImmediate(resolve));
  for (const fn of timers) fn();
  return { code: proc.exitCode, output: output.join('\n') };
}

for (const scenario of [
  'disconnected',
  'unacknowledged',
  'rejected',
  'exception',
  'warning',
  'wrong-target',
]) {
  test(`inspector fails when target is ${scenario}`, async () => {
    const result = await inspect(scenario);
    assert.equal(result.code, 1);
    assert.doesNotMatch(result.output, /0 errors\/warnings captured/);
  });
}

test('inspector succeeds after confirmed subscriptions using native WebSocket API', async () => {
  const result = await inspect('healthy');
  assert.equal(result.code, 0);
  assert.match(result.output, /0 errors\/warnings captured/);
});
