/**
 * Shared Test Mock Utilities
 *
 * Lightweight, headless DOM and Chrome extension API mocks for Node test suites.
 */

const COMMON_HTML_TAGS = new Set([
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr',
]);

/**
 * Creates a mock DOM element with attribute, class, style, event, and traversal APIs.
 * Supports both createMockElement(tag, id, options) and createMockElement(id, options).
 *
 * @param {string} [tag='div'] Element tag name or id if non-HTML tag
 * @param {string} [id=''] Element id attribute
 * @param {object} [options={}] Optional initial properties
 * @returns {object} Mock DOM element
 */
export function createMockElement(tag = 'div', id = '', options = {}) {
  let resolvedTag = tag || 'DIV';
  let resolvedId = id || '';

  if (!id && tag && !COMMON_HTML_TAGS.has(tag.toLowerCase())) {
    resolvedTag = 'DIV';
    resolvedId = tag;
  }

  const tagName = resolvedTag.toUpperCase();
  const attributes = new Map();
  const classNames = new Set();
  const listeners = {};
  const children = [];

  const el = {
    tagName,
    id: resolvedId,
    className: '',
    innerHTML: '',
    innerText: '',
    style: {},
    children,
    parentNode: null,
    listeners,
    ...options,
  };

  const activeDomStore = options.domStore || globalThis.document?.domStore;

  // Sync initial className / id if provided
  if (el.className) {
    el.className
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((cls) => classNames.add(cls));
  }
  if (el.id) {
    attributes.set('id', el.id);
  }
  if (activeDomStore && el.id) {
    activeDomStore.set(el.id, el);
  }

  function syncClassName() {
    el.className = Array.from(classNames).join(' ');
  }

  el.classList = {
    add(...classes) {
      for (const cls of classes) {
        if (cls) classNames.add(cls);
      }
      syncClassName();
    },
    remove(...classes) {
      for (const cls of classes) {
        classNames.delete(cls);
      }
      syncClassName();
    },
    toggle(cls, force) {
      const exists = classNames.has(cls);
      const shouldHave = force !== undefined ? Boolean(force) : !exists;
      if (shouldHave) {
        classNames.add(cls);
      } else {
        classNames.delete(cls);
      }
      syncClassName();
      return shouldHave;
    },
    contains(cls) {
      return classNames.has(cls);
    },
  };

  el.appendChild = function appendChild(child) {
    if (!child) return child;
    if (
      child.parentNode &&
      typeof child.parentNode.removeChild === 'function'
    ) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = el;
    children.push(child);
    if (options.domStore && child.id) {
      options.domStore.set(child.id, child);
    }
    return child;
  };

  el.removeChild = function removeChild(child) {
    const idx = children.indexOf(child);
    if (idx !== -1) {
      children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  };

  el.remove = function remove() {
    if (el.parentNode && typeof el.parentNode.removeChild === 'function') {
      el.parentNode.removeChild(el);
    }
  };

  el.closest = function closest() {
    return null;
  };

  el.focus = function focus() {};

  el.replaceChildren = function replaceChildren(...newChildren) {
    for (const child of [...children]) {
      el.removeChild(child);
    }
    for (const child of newChildren) {
      el.appendChild(child);
    }
  };

  el.addEventListener = function addEventListener(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  };

  el.removeEventListener = function removeEventListener(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((cb) => cb !== fn);
  };

  el.dispatchEvent = function dispatchEvent(event) {
    const eventType = typeof event === 'string' ? event : event?.type;
    const cbs = listeners[eventType] || [];
    const evtObj =
      typeof event === 'string' ?
        { type: event, target: el }
      : { ...event, target: el };
    for (const cb of [...cbs]) {
      cb.call(el, evtObj);
    }
    return true;
  };

  el.click = function click() {
    return el.dispatchEvent('click');
  };

  el.setAttribute = function setAttribute(name, value) {
    const strVal = String(value);
    attributes.set(name, strVal);
    if (name === 'id') {
      el.id = strVal;
      if (options.domStore) options.domStore.set(strVal, el);
    } else if (name === 'class') {
      classNames.clear();
      strVal
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((cls) => classNames.add(cls));
      syncClassName();
    }
  };

  el.getAttribute = function getAttribute(name) {
    return attributes.has(name) ? attributes.get(name) : null;
  };

  el.removeAttribute = function removeAttribute(name) {
    attributes.delete(name);
    if (name === 'id') {
      el.id = '';
    } else if (name === 'class') {
      classNames.clear();
      syncClassName();
    }
  };

  el.hasAttribute = function hasAttribute(name) {
    return attributes.has(name);
  };

  el.querySelector = function querySelector(selector) {
    const matches = el.querySelectorAll(selector);
    if (matches.length > 0) return matches[0];

    // Fallback: inspect raw innerHTML if markup was set as text without DOM parsing
    if (el.innerHTML) {
      if (selector.startsWith('#')) {
        const idTarget = selector.slice(1);
        if (
          el.innerHTML.includes(`id="${idTarget}"`) ||
          el.innerHTML.includes(`id='${idTarget}'`) ||
          el.innerHTML.includes(idTarget)
        ) {
          if (activeDomStore?.has(idTarget)) {
            return activeDomStore.get(idTarget);
          }
          const matched = createMockElement('div', idTarget, options);
          if (activeDomStore) activeDomStore.set(idTarget, matched);
          return matched;
        }
      } else if (selector.startsWith('.')) {
        const clsTarget = selector.slice(1);
        if (
          el.innerHTML.includes(`class="${clsTarget}`) ||
          el.innerHTML.includes(` ${clsTarget}"`) ||
          el.innerHTML.includes(` ${clsTarget} `)
        ) {
          const matched = createMockElement('div', '', options);
          matched.classList.add(clsTarget);
          return matched;
        }
      } else if (selector.startsWith('[')) {
        const clean = selector.replace(/[[\]"]/g, '');
        const [attrName, attrVal] = clean.split('=');
        if (attrVal) {
          if (el.innerHTML.includes(`${attrName}="${attrVal}"`)) {
            const matched = createMockElement('div', '', options);
            matched.setAttribute(attrName, attrVal);
            return matched;
          }
        } else if (el.innerHTML.includes(attrName)) {
          const matched = createMockElement('div', '', options);
          matched.setAttribute(attrName, '');
          return matched;
        }
      }
    }
    return null;
  };

  el.querySelectorAll = function querySelectorAll(selector) {
    if (!selector) return [];
    const results = [];
    function matchNode(node) {
      if (selector.startsWith('#')) {
        const idTarget = selector.slice(1);
        if (node.id === idTarget) return true;
      } else if (selector.startsWith('.')) {
        const clsTarget = selector.slice(1);
        if (node.classList && node.classList.contains(clsTarget)) return true;
      } else if (
        node.tagName &&
        node.tagName.toLowerCase() === selector.toLowerCase()
      ) {
        return true;
      }
      return false;
    }

    function search(node) {
      for (const child of node.children) {
        if (matchNode(child)) {
          results.push(child);
        }
        if (child.children && child.children.length > 0) {
          search(child);
        }
      }
    }
    search(el);
    return results;
  };

  el.cloneNode = function cloneNode(deep = false) {
    const clone = createMockElement(tag, el.id, { ...options });
    clone.className = el.className;
    clone.innerHTML = el.innerHTML;
    clone.innerText = el.innerText;
    clone.style = { ...el.style };
    attributes.forEach((v, k) => clone.setAttribute(k, v));
    if (deep) {
      for (const child of children) {
        if (child.cloneNode) {
          clone.appendChild(child.cloneNode(true));
        }
      }
    }
    return clone;
  };

  el.contains = function contains(target) {
    if (this === target) return true;
    for (const child of children) {
      if (child === target) return true;
      if (typeof child.contains === 'function' && child.contains(target))
        return true;
    }
    return false;
  };

  if (options.domStore && el.id) {
    options.domStore.set(el.id, el);
  }

  return el;
}

/**
 * Creates a mock Document DOM environment.
 *
 * @param {object} [options={}]
 * @returns {object} Mock Document instance
 */
export function createMockDocument(options = {}) {
  const domStore = options.domStore || new Map();
  const body = createMockElement('body', 'body', { domStore });
  const head = createMockElement('head', 'head', { domStore });
  const documentElement = createMockElement('html', '', { domStore });
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const doc = {
    readyState: 'complete',
    body,
    head,
    documentElement,
    domStore,
    getElementById(id) {
      if (!domStore.has(id)) {
        const el = createMockElement('div', id, { domStore });
        domStore.set(id, el);
      }
      return domStore.get(id);
    },
    createElement(tag) {
      return createMockElement(tag, '', { domStore });
    },
    querySelector(selector) {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return doc.getElementById(id);
      }
      return documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return documentElement.querySelectorAll(selector);
    },
    addEventListener() {},
    removeEventListener() {},
  };

  return doc;
}

/**
 * Sets up global mock DOM environment and returns a restore function.
 *
 * @param {object} [options={}]
 * @returns {{ document: object, domStore: Map, restore: Function }}
 */
export function setupMockDOM(options = {}) {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;

  const doc = createMockDocument(options);
  globalThis.document = doc;
  globalThis.window = {
    getSelection: () => ({
      removeAllRanges: () => {},
      addRange: () => {},
    }),
    document: doc,
    addEventListener: doc.addEventListener,
    removeEventListener: doc.removeEventListener,
    ...options.window,
  };

  return {
    document: doc,
    domStore: doc.domStore,
    restore() {
      if (prevDoc === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = prevDoc;
      }
      if (prevWin === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = prevWin;
      }
    },
  };
}

/**
 * Sets up global mock Chrome extension environment and returns a restore function.
 *
 * @param {object} [options={}]
 * @returns {{ chrome: object, storageData: object, restore: Function }}
 */
export function setupMockChrome(options = {}) {
  const prevChrome = globalThis.chrome;
  const storageData = { ...(options.initialStorage || {}) };

  const chromeMock = {
    runtime: {
      id: options.runtimeId || 'test-ext-id',
    },
    storage: {
      local: {
        async get(keys) {
          if (!keys) return { ...storageData };
          if (typeof keys === 'string') {
            return { [keys]: storageData[keys] };
          }
          if (Array.isArray(keys)) {
            const out = {};
            for (const k of keys) {
              if (storageData[k] !== undefined) out[k] = storageData[k];
            }
            return out;
          }
          if (typeof keys === 'object') {
            const out = { ...keys };
            for (const k of Object.keys(keys)) {
              if (storageData[k] !== undefined) out[k] = storageData[k];
            }
            return out;
          }
          return {};
        },
        async set(obj) {
          if (obj && typeof obj === 'object') {
            Object.assign(storageData, obj);
          }
        },
        async remove(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) {
            delete storageData[k];
          }
        },
        async clear() {
          for (const k of Object.keys(storageData)) {
            delete storageData[k];
          }
        },
      },
    },
  };

  globalThis.chrome = chromeMock;

  return {
    chrome: chromeMock,
    storageData,
    restore() {
      if (prevChrome === undefined) {
        delete globalThis.chrome;
      } else {
        globalThis.chrome = prevChrome;
      }
    },
  };
}
