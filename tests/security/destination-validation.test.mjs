import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  detectServiceType,
  DISCORD_WEBHOOK_HOSTS,
  GOOGLE_SCRIPTS_HOST,
  validateDestinationUrl,
  validateDiscordWebhookUrl,
  validateGoogleSheetUrl,
} from '../../src/js/utils/destinationValidator.js';

// ---------------------------------------------------------------------------
// §2.3 — Destination validation: consumer-visible edge tests
//
// Covers intake-side and consumption-side validation for external publication
// destinations (Discord webhooks, Google Apps Script deployments).
// ---------------------------------------------------------------------------

describe('destinationValidator — Discord webhook URLs', () => {
  test('accepts a valid discord.com webhook URL', () => {
    const result = validateDiscordWebhookUrl(
      'https://discord.com/api/webhooks/123456/abcdef-token',
    );
    assert.deepStrictEqual(result, { valid: true, service: 'discord' });
  });

  test('accepts a valid discordapp.com webhook URL', () => {
    const result = validateDiscordWebhookUrl(
      'https://discordapp.com/api/webhooks/123456/abcdef-token',
    );
    assert.deepStrictEqual(result, { valid: true, service: 'discord' });
  });

  test('rejects http:// scheme', () => {
    const result = validateDiscordWebhookUrl(
      'http://discord.com/api/webhooks/123456/abcdef-token',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'insecure_scheme');
  });

  test('rejects unrecognised host', () => {
    const result = validateDiscordWebhookUrl(
      'https://evil-discord.example.com/api/webhooks/123456/abcdef',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_host');
  });

  test('rejects path without /api/webhooks/ prefix', () => {
    const result = validateDiscordWebhookUrl(
      'https://discord.com/other/path/123456/abcdef',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_path');
  });

  test('rejects empty string', () => {
    const result = validateDiscordWebhookUrl('');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'empty_or_non_string');
  });

  test('rejects non-string input', () => {
    const result = validateDiscordWebhookUrl(null);
    assert.strictEqual(result.valid, false);
  });

  test('rejects unparseable URL', () => {
    const result = validateDiscordWebhookUrl('not a url at all');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unparseable_url');
  });

  test('rejects javascript: protocol', () => {
    // Node URL parser accepts javascript: as a valid protocol with hostname
    // "alert(1)"; it reaches the scheme check, not the parse check.
    const result = validateDiscordWebhookUrl(
      'javascript:alert(1)//discord.com/api/webhooks/1/x',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'insecure_scheme');
  });

  test('rejects data: URI scheme', () => {
    const result = validateDiscordWebhookUrl(
      'data:text/html,<script>alert(1)</script>',
    );
    assert.strictEqual(result.valid, false);
  });

  test('is injectable for testing', () => {
    const fakeURL = class {
      constructor(u) {
        const p = new URL(u);
        this.protocol = p.protocol;
        this.hostname = p.hostname;
        this.pathname = p.pathname;
      }
    };
    const result = validateDiscordWebhookUrl(
      'https://discord.com/api/webhooks/1/x',
      { URL: fakeURL },
    );
    assert.deepStrictEqual(result, { valid: true, service: 'discord' });
  });
});

describe('destinationValidator — Google Apps Script URLs', () => {
  test('accepts a valid Google Apps Script deployment URL', () => {
    const result = validateGoogleSheetUrl(
      'https://script.google.com/macros/s/AKfycbw.../exec',
    );
    assert.deepStrictEqual(result, { valid: true, service: 'sheets' });
  });

  test('rejects URL without /exec suffix', () => {
    const result = validateGoogleSheetUrl(
      'https://script.google.com/macros/s/AKfycbw...',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_path');
  });

  test('rejects URL with wrong path prefix', () => {
    const result = validateGoogleSheetUrl(
      'https://script.google.com/d/e/AKfycbw.../edit',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_path');
  });

  test('rejects http:// scheme', () => {
    const result = validateGoogleSheetUrl(
      'http://script.google.com/macros/s/AKfycbw.../exec',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'insecure_scheme');
  });

  test('rejects different host', () => {
    const result = validateGoogleSheetUrl(
      'https://evil-script.example.com/macros/s/AKfycbw.../exec',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_host');
  });

  test('rejects empty string', () => {
    const result = validateGoogleSheetUrl('');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'empty_or_non_string');
  });
});

describe('destinationValidator — detectServiceType', () => {
  test('detects discord.com as discord', () => {
    assert.strictEqual(
      detectServiceType('https://discord.com/api/webhooks/1/x'),
      'discord',
    );
  });

  test('detects discordapp.com as discord', () => {
    assert.strictEqual(
      detectServiceType('https://discordapp.com/api/webhooks/1/x'),
      'discord',
    );
  });

  test('detects script.google.com as sheets', () => {
    assert.strictEqual(
      detectServiceType('https://script.google.com/macros/s/AKfycbw/exec'),
      'sheets',
    );
  });

  test('returns unknown for unrecognised host', () => {
    assert.strictEqual(
      detectServiceType('https://evil.example.com/api/webhooks/1/x'),
      'unknown',
    );
  });

  test('returns unknown for empty input', () => {
    assert.strictEqual(detectServiceType(''), 'unknown');
    assert.strictEqual(detectServiceType(null), 'unknown');
  });
});

describe('destinationValidator — validateDestinationUrl (combined)', () => {
  test('empty string is always valid (feature not configured)', () => {
    assert.deepStrictEqual(validateDestinationUrl(''), {
      valid: true,
      service: 'none',
    });
  });

  test('whitespace-only string is always valid', () => {
    assert.deepStrictEqual(validateDestinationUrl('   '), {
      valid: true,
      service: 'none',
    });
  });

  test('auto-detects discord from host', () => {
    const result = validateDestinationUrl(
      'https://discord.com/api/webhooks/123456/abcdef-token',
    );
    assert.deepStrictEqual(result, { valid: true, service: 'discord' });
  });

  test('auto-detects sheets from host', () => {
    const result = validateDestinationUrl(
      'https://script.google.com/macros/s/AKfycbw/exec',
    );
    assert.deepStrictEqual(result, { valid: true, service: 'sheets' });
  });

  test('rejects unsupported service', () => {
    const result = validateDestinationUrl(
      'https://evil.example.com/webhook/12345',
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unsupported_service');
  });

  test('serviceHint forces specific validation', () => {
    // A Google Script URL validated as Discord should fail
    const result = validateDestinationUrl(
      'https://script.google.com/macros/s/AKfycbw/exec',
      { serviceHint: 'discord' },
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'unrecognised_host');
  });

  test('serviceHint discord accepts valid discord URL', () => {
    const result = validateDestinationUrl(
      'https://discord.com/api/webhooks/123456/abcdef',
      { serviceHint: 'discord' },
    );
    assert.deepStrictEqual(result, { valid: true, service: 'discord' });
  });

  test('serviceHint sheets accepts valid sheet URL', () => {
    const result = validateDestinationUrl(
      'https://script.google.com/macros/s/AKfycbw/exec',
      { serviceHint: 'sheets' },
    );
    assert.deepStrictEqual(result, { valid: true, service: 'sheets' });
  });
});

describe('destinationValidator — policy invariants', () => {
  test('supported Discord hosts match manifest host_permissions', () => {
    // Manifest: https://discordapp.com/api/webhooks/*, https://discord.com/api/webhooks/*
    assert.deepEqual([...DISCORD_WEBHOOK_HOSTS].sort(), [
      'discord.com',
      'discordapp.com',
    ]);
  });

  test('supported Sheets host matches manifest host_permissions', () => {
    // Manifest: https://script.google.com/macros/s/*
    assert.strictEqual(GOOGLE_SCRIPTS_HOST, 'script.google.com');
  });

  test('all valid discord URLs require HTTPS', () => {
    const tests = [
      'http://discord.com/api/webhooks/1/x',
      'http://discordapp.com/api/webhooks/1/x',
    ];
    for (const url of tests) {
      const result = validateDestinationUrl(url);
      assert.strictEqual(result.valid, false, `Should reject: ${url}`);
    }
  });

  test('all valid sheets URLs require HTTPS', () => {
    const result = validateDestinationUrl(
      'http://script.google.com/macros/s/AKfycbw/exec',
    );
    assert.strictEqual(result.valid, false);
  });

  test('rejects ftp:// scheme', () => {
    const result = validateDestinationUrl('ftp://discord.com/api/webhooks/1/x');
    assert.strictEqual(result.valid, false);
  });

  test('rejects ws:// and wss:// schemes', () => {
    assert.strictEqual(
      validateDestinationUrl('wss://discord.com/api/webhooks/1/x').valid,
      false,
    );
  });
});
