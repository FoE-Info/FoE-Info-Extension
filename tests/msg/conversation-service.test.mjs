import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  conversationService,
  extractRateFromTitle,
  getConversation,
  getLatestMessage,
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

  it('detects target thread from getConversation and selects newest message', () => {
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'getConversation',
      responseData: {
        id: 'conv_456',
        title: '🎯🎯 Battleground TARGETS 🎯🎯',
        messages: [
          {
            id: 80756048,
            text: 'D2A ATTACK (0%) @ NOW (NEWEST)',
            sender: { name: 'General' },
            date: '09:15:00',
          },
          {
            id: 80755000,
            text: 'D4B HOLD @ OLD TIME (OLDEST)',
            sender: { name: 'OldPoster' },
            date: '08:00:00',
          },
        ],
      },
    };

    getConversation(msg);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    assert.ok(container.innerHTML.includes('GBG Targets'));
    assert.ok(container.innerHTML.includes('D2A ATTACK (0%) @ NOW (NEWEST)'));
    assert.ok(container.innerHTML.includes('General'));
    assert.ok(!container.innerHTML.includes('D4B HOLD'));
  });

  it('getLatestMessage selects the newest message by highest id / index 0', () => {
    const msgsDescending = [
      { id: 80756048, text: 'Latest directive', date: 'today at 1:27 am' },
      { id: 80756030, text: 'Middle directive', date: 'today at 1:22 am' },
      { id: 80755233, text: 'Oldest directive', date: 'yesterday at 10:50 pm' },
    ];
    assert.equal(getLatestMessage(msgsDescending).id, 80756048);
    assert.equal(getLatestMessage(msgsDescending).text, 'Latest directive');

    const msgsAscending = [
      { id: 80755233, text: 'Oldest directive' },
      { id: 80756048, text: 'Latest directive' },
    ];
    assert.equal(getLatestMessage(msgsAscending).id, 80756048);
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
    // Strict matching rejects non-matching topics even if they have targets or emoji
    assert.equal(isTargetsTopic('Battleground Targets'), false);
    assert.equal(isTargetsTopic('🎯 Guild Orders'), false);

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
    setTargetsTopic('Targets');
  });

  it('strictly excludes non-target threads even if they contain 🎯 emoji', () => {
    setTargetsTopic('Targets');

    assert.equal(isTargetsTopic('🎯💬 Battleground CHAT 💬🎯'), false);
    assert.equal(isTargetsTopic('🎯 Guild Announcements 🎯'), false);
    assert.equal(isTargetsTopic('🎯 General Chat 🎯'), false);
    assert.equal(isTargetsTopic('Battleground Targets'), true);
    assert.equal(isTargetsTopic('🎯🎯 Battleground TARGETS 🎯🎯'), true);
  });

  it('resolves the teaser with the newest message ID when multiple threads match', () => {
    setTargetsTopic('Targets');
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'getOverview',
      responseData: {
        categories: [
          {
            id: 'guild',
            teasers: [
              {
                id: 'conv_old_targets',
                title: 'Battleground Targets (Archived)',
                lastMessage: {
                  id: 80100000,
                  text: 'OLD TARGET: D1A',
                  sender: { name: 'OldGeneral' },
                  date: 'last month',
                },
              },
              {
                id: 'conv_chat',
                title: '🎯 Battleground Chat 🎯',
                lastMessage: {
                  id: 80900000,
                  text: 'Hello chat!',
                  sender: { name: 'Chatter' },
                  date: 'just now',
                },
              },
              {
                id: 'conv_active_targets',
                title: '🎯🎯 Battleground TARGETS 🎯🎯',
                lastMessage: {
                  id: 80800000,
                  text: 'ACTIVE TARGET: B4B RUSH',
                  sender: { name: 'ActiveLeader' },
                  date: 'today',
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
    assert.ok(container.innerHTML.includes('ACTIVE TARGET: B4B RUSH'));
    assert.ok(container.innerHTML.includes('ActiveLeader'));
    assert.ok(!container.innerHTML.includes('Hello chat!'));
    assert.ok(!container.innerHTML.includes('OLD TARGET: D1A'));
  });

  it('formats numeric Unix epoch timestamps into human-readable times', () => {
    const epochSeconds = 1710000000; // Fixed timestamp
    const msg = {
      requestClass: 'ConversationService',
      requestMethod: 'getTeaser',
      responseData: [
        {
          id: 'conv_timestamp_test',
          title: 'Battleground Targets',
          lastMessage: {
            text: 'B4B RUSH (20%)',
            sender: { name: 'General' },
            date: epochSeconds,
          },
        },
      ],
    };

    conversationService(msg);

    const container = global.document.getElementById('targetsGBG');
    assert.ok(container);
    // Should NOT render raw integer digits "1710000000" as the time
    assert.doesNotMatch(
      container.innerHTML,
      /<strong>GBG Targets<\/strong>\s*1710000000/,
    );
    assert.match(
      container.innerHTML,
      /<strong>GBG Targets<\/strong>\s*\d{2}:\d{2}/,
    );
  });
});
