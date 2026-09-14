import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMockDocument,
  createMockElement,
  setupMockChrome,
  setupMockDOM,
} from './test-mocks.mjs';

test('createMockElement - basics and tag defaults', () => {
  const el = createMockElement();
  assert.equal(el.tagName, 'DIV');
  assert.equal(el.id, '');
  assert.equal(el.className, '');
  assert.deepEqual(el.children, []);
});

test('createMockElement - classList keeps className synchronized', () => {
  const el = createMockElement('span', 'sample');
  el.classList.add('foo', 'bar');
  assert.equal(el.className, 'foo bar');
  assert.equal(el.classList.contains('foo'), true);

  el.classList.remove('foo');
  assert.equal(el.className, 'bar');
  assert.equal(el.classList.contains('foo'), false);

  const toggledOn = el.classList.toggle('baz');
  assert.equal(toggledOn, true);
  assert.equal(el.classList.contains('baz'), true);

  const toggledOff = el.classList.toggle('baz');
  assert.equal(toggledOff, false);
  assert.equal(el.classList.contains('baz'), false);
});

test('createMockElement - tree manipulation and parentNode tracking', () => {
  const parent = createMockElement('div', 'p1');
  const child1 = createMockElement('div', 'c1');
  const child2 = createMockElement('div', 'c2');

  parent.appendChild(child1);
  assert.equal(child1.parentNode, parent);
  assert.equal(parent.children.length, 1);

  // Moving child to new parent
  const parent2 = createMockElement('div', 'p2');
  parent2.appendChild(child1);
  assert.equal(child1.parentNode, parent2);
  assert.equal(parent.children.length, 0);
  assert.equal(parent2.children.length, 1);

  // replaceChildren
  parent2.replaceChildren(child2);
  assert.equal(parent2.children.length, 1);
  assert.equal(parent2.children[0], child2);
  assert.equal(child1.parentNode, null);
});

test('createMockElement - event listeners and dispatching', () => {
  const el = createMockElement('button', 'btn');
  let clicked = 0;
  const handler = () => {
    clicked += 1;
  };

  el.addEventListener('click', handler);
  el.click();
  assert.equal(clicked, 1);

  el.removeEventListener('click', handler);
  el.click();
  assert.equal(clicked, 1);
});

test('createMockElement - attributes and querySelector', () => {
  const root = createMockElement('div', 'root');
  const child = createMockElement('span', 'inner');
  child.classList.add('highlight');
  root.appendChild(child);

  assert.equal(root.querySelector('#inner'), child);
  assert.equal(root.querySelector('.highlight'), child);
  assert.equal(root.querySelector('span'), child);
  assert.equal(root.querySelector('#notfound'), null);

  root.setAttribute('data-test', 'foobar');
  assert.equal(root.getAttribute('data-test'), 'foobar');
  assert.equal(root.hasAttribute('data-test'), true);
  root.removeAttribute('data-test');
  assert.equal(root.getAttribute('data-test'), null);
});

test('createMockElement - cloneNode deep and shallow', () => {
  const parent = createMockElement('div', 'parent');
  const child = createMockElement('span', 'child');
  parent.appendChild(child);

  const shallow = parent.cloneNode(false);
  assert.equal(shallow.id, 'parent');
  assert.equal(shallow.children.length, 0);

  const deep = parent.cloneNode(true);
  assert.equal(deep.id, 'parent');
  assert.equal(deep.children.length, 1);
  assert.equal(deep.children[0].id, 'child');
});

test('createMockDocument - document store and lazy element creation', () => {
  const doc = createMockDocument();
  assert.ok(doc.body);
  assert.ok(doc.head);
  assert.ok(doc.documentElement);

  const el = doc.getElementById('custom-id');
  assert.ok(el);
  assert.equal(el.id, 'custom-id');
  assert.equal(doc.getElementById('custom-id'), el);
  assert.equal(doc.querySelector('#custom-id'), el);
});

test('setupMockDOM - installs and restores globals cleanly', () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  const mockEnv = setupMockDOM();
  assert.ok(globalThis.document);
  assert.ok(globalThis.window);
  assert.equal(typeof globalThis.window.getSelection, 'function');

  mockEnv.restore();
  assert.equal(globalThis.document, prevDoc);
  assert.equal(globalThis.window, prevWin);
});

test('setupMockChrome - storage operations and restore', async () => {
  const prevChrome = globalThis.chrome;

  const { chrome, storageData, restore } = setupMockChrome({
    initialStorage: { foo: 'bar' },
  });
  assert.equal(chrome.runtime.id, 'test-ext-id');

  const get1 = await chrome.storage.local.get('foo');
  assert.deepEqual(get1, { foo: 'bar' });

  await chrome.storage.local.set({ count: 42 });
  assert.equal(storageData.count, 42);

  const getMulti = await chrome.storage.local.get(['foo', 'count']);
  assert.deepEqual(getMulti, { foo: 'bar', count: 42 });

  await chrome.storage.local.remove('foo');
  assert.equal(storageData.foo, undefined);

  await chrome.storage.local.clear();
  assert.deepEqual(storageData, {});

  restore();
  assert.equal(globalThis.chrome, prevChrome);
});
