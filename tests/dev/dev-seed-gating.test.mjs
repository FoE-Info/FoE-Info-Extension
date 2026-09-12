import assert from 'node:assert/strict';
import test from 'node:test';

const bootstrap = await import('../../src/js/dev/forcedStateBootstrap.js');
const { createForcedStateController } = bootstrap.default || bootstrap;
const buttonModule = await import('../../src/js/dev/devSeedButton.js');
const { mountDevSeedButton, unmountDevSeedButton } =
  buttonModule.default || buttonModule;

function makeHarness({ enabled }) {
  const state = { enabled, subscriber: null };
  const calls = { mount: 0, unmount: 0, apply: 0, errors: [] };
  const controller = createForcedStateController({
    isEnabled: () => state.enabled,
    subscribe: (fn) => {
      state.subscriber = fn;
    },
    mount: () => {
      calls.mount += 1;
    },
    unmount: () => {
      calls.unmount += 1;
    },
    apply: async () => {
      calls.apply += 1;
      return { galaxy: 1, rewards: 1 };
    },
    logger: {
      info() {},
      error(...args) {
        calls.errors.push(args);
      },
      debug() {},
      warn() {},
    },
  });
  return { state, calls, controller };
}

test('activates and seeds when debug is enabled at start', async () => {
  const { calls, controller } = makeHarness({ enabled: true });
  controller.start();
  assert.equal(calls.mount, 1);
  assert.equal(controller.isActive(), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.apply, 1);
});

test('stays dormant when debug is disabled at start', () => {
  const { calls, controller } = makeHarness({ enabled: false });
  controller.start();
  assert.equal(calls.mount, 0);
  assert.equal(calls.apply, 0);
  assert.equal(controller.isActive(), false);
});

test('tears down when debug is toggled off', () => {
  const { state, calls, controller } = makeHarness({ enabled: true });
  controller.start();
  state.enabled = false;
  state.subscriber(false);
  assert.equal(calls.unmount, 1);
  assert.equal(controller.isActive(), false);
});

test('re-activates when debug is toggled back on', async () => {
  const { state, calls, controller } = makeHarness({ enabled: true });
  controller.start();
  state.subscriber(false);
  state.subscriber(true);
  assert.equal(calls.mount, 2);
  assert.equal(controller.isActive(), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.apply, 2);
});

test('does not double-activate while already enabled', async () => {
  const { calls, controller } = makeHarness({ enabled: true });
  controller.start();
  controller.sync(true);
  assert.equal(calls.mount, 1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.apply, 1);
});

test('logs synchronous and asynchronous apply failures', async () => {
  const errors = [];
  const make = (apply) =>
    createForcedStateController({
      isEnabled: () => true,
      subscribe: () => {},
      mount: () => {},
      unmount: () => {},
      apply,
      logger: {
        info() {},
        error: (...args) => errors.push(args),
        debug() {},
        warn() {},
      },
    });
  make(() => {
    throw new Error('sync boom');
  }).start();
  make(() => Promise.reject(new Error('async boom'))).start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(errors.length, 2);
});

function fakeNode(tag) {
  const node = {
    tagName: tag,
    children: [],
    attrs: {},
    listeners: {},
    className: '',
    textContent: '',
    id: '',
    type: '',
    disabled: false,
    parentNode: null,
    firstChild: null,
    appendChild(child) {
      child.parentNode = node;
      node.children.push(child);
      node.firstChild = node.children[0];
      return child;
    },
    insertBefore(child, before) {
      child.parentNode = node;
      const index = before ? node.children.indexOf(before) : -1;
      if (index < 0) node.children.unshift(child);
      else node.children.splice(index, 0, child);
      node.firstChild = node.children[0] || null;
      return child;
    },
    removeChild(child) {
      const index = node.children.indexOf(child);
      if (index >= 0) node.children.splice(index, 1);
      child.parentNode = null;
      node.firstChild = node.children[0] || null;
      return child;
    },
    setAttribute(key, value) {
      node.attrs[key] = value;
    },
    addEventListener(event, handler) {
      (node.listeners[event] ||= []).push(handler);
    },
  };
  return node;
}

test('mountDevSeedButton adds and unmountDevSeedButton removes the control', () => {
  const content = fakeNode('div');
  content.id = 'content';
  const fakeDocument = {
    body: fakeNode('body'),
    createElement: (tag) => fakeNode(tag),
    getElementById: (id) => (id === 'content' ? content : null),
    contains: (node) => content.children.includes(node),
  };

  mountDevSeedButton(() => {}, fakeDocument);
  assert.equal(content.children.length, 1);
  assert.equal(content.children[0].id, 'devSeed');

  unmountDevSeedButton();
  assert.equal(content.children.length, 0);
});
