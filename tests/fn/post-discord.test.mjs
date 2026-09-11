import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import postPkg from '../../src/js/fn/post.js';

const {
  postTargetGenToDiscord,
  postTargetList,
  postTargetsToDiscord,
  sanitizeDiscordText,
  setPostContext,
} = postPkg;

describe('Discord Post & Target Sanitization Suite', () => {
  let capturedPayloads = [];

  beforeEach(() => {
    capturedPayloads = [];
    setPostContext({
      url: { discordTargetURL: 'https://discord.test/webhook/123' },
      MyInfo: { name: 'Commander' },
    });

    // Mock global window & document for node test environment
    const domStore = new Map();
    const createEl = (id = '', innerHTML = '') => {
      const listeners = new Map();
      const el = {
        id,
        innerHTML,
        className: '',
        addEventListener(event, fn) {
          if (!listeners.has(event)) listeners.set(event, []);
          listeners.get(event).push(fn);
        },
        querySelector(selector) {
          if (selector === '.text-muted' || selector === 'span') {
            if (this.innerHTML.includes('text-muted')) {
              return createEl('span', 'author');
            }
          }
          return null;
        },
        querySelectorAll(selector) {
          if (selector.includes('.text-muted') || selector.includes('span')) {
            if (this.innerHTML.includes('text-muted')) {
              return [createEl('span', 'author')];
            }
          }
          return [];
        },
        remove() {},
        cloneNode() {
          const clone = createEl(this.id, this.innerHTML);
          clone.querySelectorAll = (sel) => {
            if (clone.innerHTML.includes('text-muted')) {
              return [
                {
                  remove() {
                    clone.innerHTML = clone.innerHTML.replace(
                      /<span class="text-muted">[\s\S]*?<\/span>/gi,
                      '',
                    );
                  },
                },
              ];
            }
            return [];
          };
          return clone;
        },
      };
      domStore.set(id, el);
      return el;
    };

    globalThis.document = {
      getElementById(id) {
        return domStore.get(id) || null;
      },
      createElement(tag) {
        return createEl(tag);
      },
    };

    globalThis.window = {
      getSelection: () => ({
        removeAllRanges: () => {},
      }),
    };

    // Mock XMLHttpRequest
    globalThis.XMLHttpRequest = class MockXMLHttpRequest {
      open(method, targetUrl) {
        this.method = method;
        this.targetUrl = targetUrl;
      }
      setRequestHeader(header, value) {
        this.headers = this.headers || {};
        this.headers[header] = value;
      }
      send(body) {
        this.body = body;
        try {
          capturedPayloads.push(JSON.parse(body));
        } catch {
          capturedPayloads.push(body);
        }
      }
    };
  });

  describe('sanitizeDiscordText', () => {
    it('converts <br>, <br/>, and </p> tags into clean newlines', () => {
      const input =
        'D4A HOLD (20%) @ 08:06<br>D3A HOLD (20%) @ 08:06<br/>D1S (0%)';
      const output = sanitizeDiscordText(input);
      assert.equal(
        output,
        'D4A HOLD (20%) @ 08:06\nD3A HOLD (20%) @ 08:06\nD1S (0%)',
      );
    });

    it('strips HTML markup and decodes common HTML entities', () => {
      const input = '<strong>D4A &amp; D3A</strong><br>Rush &lt;100%&gt;';
      const output = sanitizeDiscordText(input);
      assert.equal(output, 'D4A & D3A\nRush <100%>');
    });

    it('handles empty or non-string inputs safely', () => {
      assert.equal(sanitizeDiscordText(''), '');
      assert.equal(sanitizeDiscordText(null), '');
      assert.equal(sanitizeDiscordText(undefined), '');
    });
  });

  describe('postTargetList', () => {
    it('sanitizes <br> tags before posting to Discord webhook', () => {
      const unlocked = 'D4A HOLD (20%) @ 08:06<br>D3A HOLD (20%) @ 08:06';
      const locked = 'D3B HOLD (20%) @ 08:14<br>D4B HOLD (20%) @ 09:00';

      postTargetList(unlocked, locked);

      assert.equal(capturedPayloads.length, 1);
      const payload = capturedPayloads[0];
      assert.equal(payload.username, 'Commander');
      assert.ok(!payload.content.includes('<br>'));
      assert.ok(!payload.content.includes('<br/>'));
      assert.equal(
        payload.content,
        'D4A HOLD (20%) @ 08:06\nD3A HOLD (20%) @ 08:06\nD3B HOLD (20%) @ 08:14\nD4B HOLD (20%) @ 09:00',
      );
    });
  });

  describe('postTargetsToDiscord (Chat thread view)', () => {
    it('strips author footer span and sends clean content with separator', () => {
      const threadHtml =
        'D4A (20%) @ 08:06<br><span class="text-muted">by Overlord Negan. alert @ 06:25:43</span>';
      document.getElementById = (id) => {
        if (id === 'targetText') {
          const el = {
            id: 'targetText',
            innerHTML: threadHtml,
            cloneNode() {
              return {
                innerHTML: threadHtml,
                querySelectorAll(sel) {
                  const mockClone = this;
                  return [
                    {
                      remove() {
                        mockClone.innerHTML = mockClone.innerHTML.replace(
                          /<span class="text-muted">[\s\S]*?<\/span>/gi,
                          '',
                        );
                      },
                    },
                  ];
                },
              };
            },
          };
          return el;
        }
        return null;
      };

      postTargetsToDiscord();

      assert.equal(capturedPayloads.length, 1);
      const payload = capturedPayloads[0];
      assert.ok(!payload.content.includes('<br>'));
      assert.ok(!payload.content.includes('Overlord Negan'));
      assert.equal(payload.content, 'D4A (20%) @ 08:06\n----------');
    });
  });

  describe('postTargetGenToDiscord (Target generator view)', () => {
    it('posts targetGenText cleanly with separator', () => {
      const genHtml =
        'D4A HOLD (20%) @ 08:06<br>D3A HOLD (20%) @ 08:06<br>D3B HOLD (20%) @ 08:14';
      document.getElementById = (id) => {
        if (id === 'targetGenText') {
          return { id: 'targetGenText', innerHTML: genHtml };
        }
        return null;
      };

      postTargetGenToDiscord();

      assert.equal(capturedPayloads.length, 1);
      const payload = capturedPayloads[0];
      assert.ok(!payload.content.includes('<br>'));
      assert.equal(
        payload.content,
        'D4A HOLD (20%) @ 08:06\nD3A HOLD (20%) @ 08:06\nD3B HOLD (20%) @ 08:14\n----------',
      );
    });
  });
});
