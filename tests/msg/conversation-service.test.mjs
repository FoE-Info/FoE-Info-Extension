import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  conversationService,
  extractRateFromTitle,
  getConversation,
  getNewMessage,
  isTargetsTopic,
  setTargetsTopic,
} from '../../src/js/msg/ConversationService.js';

describe('ConversationService Suite', () => {
  let elementsMap;

  beforeEach(() => {
    elementsMap = new Map();
    const targetsGBG = {
      id: 'targetsGBG',
      innerHTML: '',
      addEventListener: () => {},
    };
    elementsMap.set('targetsGBG', targetsGBG);

    global.document = {
      getElementById: (id) => elementsMap.get(id) || null,
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          innerHTML: '',
          appendChild: () => {},
          addEventListener: () => {},
        };
        return el;
      },
    };
  });

  it('extracts rate correctly from title', () => {
    assert.equal(extractRateFromTitle('190% Great Buildings'), 190);
    assert.equal(extractRateFromTitle('1.9 Arc boost'), 190);
    assert.equal(extractRateFromTitle('1.95 Leveling'), 195);
    assert.equal(extractRateFromTitle('No rate here'), 0);
  });

  it('detects target thread message from teasers in getOverview categories', () => {
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'getOverview',
      responseData: {
        categories: [
          {
            id: 'guild',
            teasers: [
              {
                id: 'conv_123',
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  text: 'D4A HOLD (20%) @ 08:06\nD3A HOLD (20%) @ 08:06',
                  sender: { name: 'Commander' },
                  date: '08:06:00',
                },
              },
            ],
          },
        ],
      },
    };

    conversationService(msg);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('GBG Targets'));
    assert.ok(container.innerHTML.includes('D4A HOLD'));
    assert.ok(container.innerHTML.includes('Commander'));
  });

  it('detects target thread from getConversation when user opens thread', () => {
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'getConversation',
      responseData: {
        id: 'conv_456',
        title: '🎯🎯 Battleground TARGETS 🎯🎯',
        messages: [
          {
            text: 'D2A ATTACK (0%) @ NOW',
            sender: { name: 'General' },
            date: '09:15:00',
          },
        ],
      },
    };

    getConversation(msg);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('GBG Targets'));
    assert.ok(container.innerHTML.includes('D2A ATTACK'));
    assert.ok(container.innerHTML.includes('General'));
  });

  it('updates target thread in real-time via getNewMessage WebSocket event', () => {
    // First open/read conversation to register conversation ID
    getConversation({
      responseData: {
        id: 'conv_789',
        title: '🎯🎯 Battleground TARGETS 🎯🎯',
        messages: [
          {
            text: 'Initial targets',
            sender: { name: 'Officer' },
            date: '09:00:00',
          },
        ],
      },
    });

    // Then receive a new message via WebSocket
    getNewMessage({
      responseData: {
        conversationId: 'conv_789',
        text: 'D1A RUSH NOW',
        sender: { name: 'Leader' },
        date: '09:20:00',
      },
    });

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('D1A RUSH NOW'));
    assert.ok(container.innerHTML.includes('Leader'));
  });

  it('detects and renders target thread when page 2 overview arrives', () => {
    // Arrival of page 2 teasers containing Battleground TARGETS
    const msgPage2 = {
      requestClass: 'ConversationService',
      requestMethod: 'getOverviewForCategory',
      responseData: {
        category: {
          page: 2,
          totalPages: 6,
          teasers: [
            {
              id: 'conv_targets',
              title: '🎯🎯 Battleground TARGETS 🎯🎯',
              lastMessage: {
                text: 'B4B ATTACK @ 12:00',
                sender: { name: 'Overlord Negan' },
                date: 'today at 8:27 am',
              },
            },
          ],
        },
      },
    };

    conversationService(msgPage2);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('GBG Targets'));
    assert.ok(container.innerHTML.includes('B4B ATTACK'));
    assert.ok(container.innerHTML.includes('Overlord Negan'));
  });

  it('detects custom target thread title configured via options panel', () => {
    setTargetsTopic('Different message');

    assert.equal(
      isTargetsTopic('⭐ Guild War Board - Different Message ⭐'),
      true,
    );
    assert.equal(isTargetsTopic('Random Chat'), false);
    // Fallbacks still work
    assert.equal(isTargetsTopic('Battleground Targets'), true);
    assert.equal(isTargetsTopic('🎯 Guild Orders'), true);

    const msgCustom = {
      requestClass: 'ConversationService',
      requestMethod: 'getOverviewForCategory',
      responseData: {
        category: {
          page: 1,
          totalPages: 3,
          teasers: [
            {
              id: 'conv_custom_targets',
              title: '⭐ Guild War Board - Different Message ⭐',
              lastMessage: {
                text: 'A1A TAKE (0%) @ 16:00',
                sender: { name: 'Tactician' },
                date: 'today at 10:00 am',
              },
            },
          ],
        },
      },
    };

    conversationService(msgCustom);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('GBG Targets'));
    assert.ok(container.innerHTML.includes('A1A TAKE'));
    assert.ok(container.innerHTML.includes('Tactician'));

    // Reset back
    setTargetsTopic('targets');
  });
});
