import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeHTML,
  escapeHTMLAttribute,
  toDisplayString,
} from '../../src/js/utils/escape.js';
import { evaluateRequestOrigin } from '../../src/js/utils/intakePolicy.js';

describe('escaping core (utils/escape.js)', () => {
  it('escapes every dangerous character & < > " \'', () => {
    assert.equal(escapeHTML('&'), '&amp;');
    assert.equal(escapeHTML('<'), '&lt;');
    assert.equal(escapeHTML('>'), '&gt;');
    assert.equal(escapeHTML('"'), '&quot;');
    assert.equal(escapeHTML("'"), '&#039;');
    assert.equal(escapeHTML('&<>"\''), '&amp;&lt;&gt;&quot;&#039;');
  });

  it('escapeHTMLAttribute escapes the same set', () => {
    assert.equal(escapeHTMLAttribute('&<>"\''), '&amp;&lt;&gt;&quot;&#039;');
  });

  it('returns empty string (not the string "null") for null/undefined', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
    assert.equal(escapeHTMLAttribute(null), '');
    assert.equal(escapeHTMLAttribute(undefined), '');
    assert.equal(toDisplayString(null), '');
    assert.equal(toDisplayString(undefined), '');
  });

  it('coerces numbers, booleans and objects safely', () => {
    assert.equal(escapeHTML(10), '10');
    assert.equal(escapeHTML(0), '0');
    assert.equal(escapeHTML(true), 'true');
    assert.equal(escapeHTML(-1.5), '-1.5');
    assert.equal(escapeHTML({ a: 1 }), '[object Object]');
    assert.equal(escapeHTML([1, 2]), '1,2');
    assert.equal(escapeHTMLAttribute(10 < 20 ? '<' : '>'), '&lt;');
    assert.equal(toDisplayString(42), '42');
    assert.equal(toDisplayString({ a: 1 }), '[object Object]');
  });

  it('does not mutate the input', () => {
    const original = '"><img src=x onerror=alert(1)>';
    const copy = [...original];
    escapeHTML(original);
    escapeHTMLAttribute(original);
    toDisplayString(original);
    assert.deepEqual([...original], copy);
    assert.equal(original, '"><img src=x onerror=alert(1)>');

    const obj = { a: 1 };
    escapeHTML(obj);
    toDisplayString(obj);
    assert.deepEqual(obj, { a: 1 });
  });

  it('renders hostile payload with no live markup after escaping', () => {
    const payload = '"><img src=x onerror=alert(1)>';
    const escaped = escapeHTML(payload);
    // No unescaped `<` or `>` anywhere: nothing can be parsed as a tag.
    assert.ok(!/[<>]/.test(escaped.slice(escaped.indexOf('&quot;&gt;'))));
    assert.equal(escaped, '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    // A browser parsing this into a div would expose only text content.
    const divLike = {
      set innerHTML(html) {
        this._raw = html;
      },
    };
    divLike.innerHTML = escaped;
    // The attribute-closing quote is escaped, so the payload cannot
    // terminate an attribute and inject new tags.
    assert.ok(!divLike._raw.includes('<img'));
  });

  it('attribute injection payload cannot escape a quoted attribute', () => {
    const payload =
      'onmouseover\x00javascript:alert(1)"><script>alert(1)</script>';
    const attr = escapeHTMLAttribute(payload);
    assert.ok(!attr.includes('"') || attr.includes('&quot;'));
    assert.ok(!/[<>]/.test(attr.replace(/&(?:amp|lt|gt|quot);/g, '')));
    assert.equal(
      attr,
      'onmouseover\u0000javascript:alert(1)&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('leaves safe text intact (no over-escaping)', () => {
    assert.equal(escapeHTML('Forge of Empires'), 'Forge of Empires');
    assert.equal(escapeHTML('Rogues: 12, Units: 45'), 'Rogues: 12, Units: 45');
    assert.equal(toDisplayString('plain text'), 'plain text');
  });

  it('escaping is idempotent-safe: escaping already escaped text double-encodes (& stays literal)', () => {
    // This is the documented contract: escape, never strip or decode.
    assert.equal(escapeHTML('&amp;'), '&amp;amp;');
  });

  it('fail-closed consumer appends escaped output, never raw hostile input', async () => {
    const { appendGameVersionStatus } =
      await import('../../src/js/ui/gameVersionStatus.js');
    const container = { innerHTML: '' };
    const ok = appendGameVersionStatus(container, {
      version: '"><img src=x onerror=alert(1)>',
      extName: 'FoE-Info',
      toolVersion: '<script>alert(1)</script>',
    });
    assert.equal(ok, true);
    assert.ok(!container.innerHTML.includes('<img'));
    assert.ok(!container.innerHTML.includes('<script'));
    assert.ok(
      container.innerHTML.includes(
        '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;',
      ),
    );
    assert.ok(
      container.innerHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),
    );
  });
});

// --- Fail-closed renderer defaults -------------------------------------------------
// TODO §2.1 / §2.3: escaping was "opt-in and fail-open by construction" — each render
// path probed an INJECTED helper for escapeHTML and fell back to identity/String() or
// the raw value. These renderers are called with a helper that has NO escaper, which is
// exactly the production path when the injection is missed, so the fallback branch is
// what must be proven safe.
describe('renderers are fail-closed without an injected escaper', () => {
  const HOSTILE = '<img src=x onerror=alert(1)>';
  const ESCAPED = '&lt;img src=x onerror=alert(1)&gt;';

  it('treasuryPanel.buildTreasuryTableHtml escapes era names with a bare helper', async () => {
    const { buildTreasuryTableHtml } =
      await import('../../src/js/ui/treasuryPanel.js');
    const html = buildTreasuryTableHtml({
      resources: new Map([['res_hostile', 5]]),
      rssDefs: [{ id: 'res_hostile', era: 'Modern Era', name: HOSTILE }],
      // No escapeHTML: forces the fallback branch.
      helper: { numAges: 1, fLevelfromAge: () => 1 },
    });
    assert.ok(
      !html.includes('<img'),
      'raw markup reached the treasury table through the fallback',
    );
    assert.ok(
      html.includes(ESCAPED),
      'hostile era name must be escaped, not dropped',
    );
  });

  it('renderGuildPanel escapes member, title and clan names with a bare helper', async () => {
    const { renderGuildPanel } =
      await import('../../src/js/ui/renderGuildPanel.js');
    const guild = { innerHTML: '' };
    renderGuildPanel(
      {
        name: HOSTILE,
        members: [
          {
            name: HOSTILE,
            title: HOSTILE,
            era: 'Modern Era',
            won_battles: 1,
            score: 2,
          },
        ],
      },
      {
        document: { getElementById: () => null },
        guild,
        helper: {},
        element: {},
        collapse: {},
      },
    );
    assert.ok(
      !guild.innerHTML.includes('<img'),
      'raw markup reached the guild table through the fallback',
    );
    assert.ok(
      guild.innerHTML.includes(ESCAPED),
      'hostile member name must be escaped',
    );
  });

  it('quantumPanel escapes network-derived member and clan names', async () => {
    const mod = await import('../../src/js/ui/quantumPanel.js');
    const target = { innerHTML: '' };
    const prev = globalThis.document;
    globalThis.document = {
      getElementById: (id) =>
        id === 'quantumContributions' || id === 'quantumLeaderboard' ?
          target
        : null,
    };
    try {
      // These are the two sinks TODO §2.1 names: rows[].player.name from
      // GuildRaidsService.getMemberActivityOverview, and the sibling clanName.
      mod.renderQuantumContributionsCard(
        [{ name: HOSTILE, progressContribution: 1, actionPoints: 1 }],
        0,
      );
      mod.renderQuantumLeaderboardCard([
        { clanName: HOSTILE, rank: 1, points: 10 },
      ]);
    } finally {
      globalThis.document = prev;
    }
    assert.ok(
      !target.innerHTML.includes('<img'),
      'raw markup reached the Quantum Incursions panel',
    );
    assert.ok(
      target.innerHTML.includes(ESCAPED),
      'hostile member and clan names must be escaped',
    );
  });

  it('gbgPanel.buildLeaderboardHTML escapes clan names', async () => {
    const { buildLeaderboardHTML } =
      await import('../../src/js/ui/gbgPanel.js');
    const html = buildLeaderboardHTML([
      {
        clan: { name: HOSTILE },
        victoryPointsHourly: 10,
        victoryPointsTotal: 100,
      },
    ]);
    assert.ok(
      !html.includes('<img'),
      'raw markup reached the GBG leaderboard through the clan name',
    );
    assert.ok(html.includes(ESCAPED), 'hostile clan name must be escaped');
  });

  it('greatBuildingsPanel escapes donor names in the contributors list', async () => {
    const mod = await import('../../src/js/ui/greatBuildingsPanel.js');
    const greatbuilding = { innerHTML: '', querySelector: () => null };
    mod.renderGbDonorsCard({
      GBselected: { name: 'The Arc', level: 70, max_level: 70 },
      rankings: [
        {
          rank: 1,
          forge_points: 5000,
          player: { name: HOSTILE, player_id: 7 },
        },
      ],
      PlayerID: 99,
      showOptions: { showGBDonors: true },
      greatbuilding,
      element: { close: () => '', copy: () => '', icon: () => '' },
      collapse: { collapseGBDonors: false },
      copy: { DonorCopy: () => {} },
    });
    assert.ok(
      !greatbuilding.innerHTML.includes('<img'),
      'raw markup reached the GB contributors list through the donor name',
    );
    assert.ok(
      greatbuilding.innerHTML.includes(ESCAPED),
      'hostile donor name must be escaped, not dropped',
    );
  });
});

// --- WebSocket intake origin ----------------------------------------------------
// xhrInterceptor.js used to post `location.origin + '/game/json?source=ws'` for
// EVERY socket, so the intake gate's host and path checks were tautological and
// third-party WebSocket traffic was dispatched as trusted game RPC. The real
// socket destination is now carried through, and evaluateRequestOrigin decides.
describe('WebSocket intake is gated on the real socket destination', () => {
  it('admits a wss game API socket on a trusted host', () => {
    const res = evaluateRequestOrigin('wss://en1.forgeofempires.com/game/json');
    assert.equal(res.accepted, true);
    assert.equal(res.kind, 'game');
  });

  it('rejects a socket on an untrusted host even with a game API path', () => {
    const res = evaluateRequestOrigin('wss://evil.example.com/game/json');
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'untrusted_host');
  });

  it('rejects a socket on a suffix-confused host', () => {
    const res = evaluateRequestOrigin(
      'wss://forgeofempires.com.evil.example/game/json',
    );
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'untrusted_host');
  });

  it('rejects an insecure ws:// socket on a trusted host', () => {
    const res = evaluateRequestOrigin('ws://en1.forgeofempires.com/game/json');
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'insecure_scheme');
  });

  it('rejects a trusted-host socket on an unrecognized path', () => {
    const res = evaluateRequestOrigin('wss://en1.forgeofempires.com/analytics');
    assert.equal(res.accepted, false);
    assert.equal(res.reason, 'unrecognized_path');
  });
});
