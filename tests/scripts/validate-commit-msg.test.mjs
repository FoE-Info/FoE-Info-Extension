import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  BANNED_SLOP_WORDS,
  FILLER_ADVERBS,
  NON_IMPERATIVE_WORDS,
  TEMPLATE_PHRASES,
  VALID_TYPES,
  validateCommitMessage,
} from '../../scripts/validate-commit-msg.mjs';

test('validateCommitMessage - accepts valid conventional commits for all types', () => {
  for (const type of VALID_TYPES) {
    const res = validateCommitMessage(`${type}: minimal valid subject`);
    assert.equal(
      res.valid,
      true,
      `Expected type "${type}" to be valid: ${res.errors.join(', ')}`,
    );
  }
});

test('validateCommitMessage - accepts valid variants (scopes, breaking changes, digits)', () => {
  const validMessages = [
    'feat(auth): add login modal',
    'fix(ui/dock): prevent overflow on small screens',
    'chore(deps-dev): bump eslint from 9 to 10',
    'refactor(msg/startup): decouple init lifecycle',
    'perf(calculator): cache city calculation matrix',
    'docs(readme): clarify dev setup instructions',
    'test(storage): add unit tests for indexdb bridge',
    'build(webpack): optimize chunk split configuration',
    'ci(github): add matrix tests for node 20 and 22',
    'revert(auth): rollback experimental oauth flow',
    'feat!: drop support for legacy manifest v2',
    'feat(api)!: rename endpoint to v2',
    'feat: 2fa support for user accounts',
    'fix: 404 handler for missing route',
  ];

  for (const msg of validMessages) {
    const res = validateCommitMessage(msg);
    assert.equal(
      res.valid,
      true,
      `Expected "${msg}" to be valid: ${res.errors.join(', ')}`,
    );
  }
});

test('validateCommitMessage - accepts boundary 72-char subject', () => {
  const subject72 = 'feat: ' + 'a'.repeat(66);
  assert.equal(subject72.length, 72);
  const res = validateCommitMessage(subject72);
  assert.equal(res.valid, true, `72 chars should be valid: ${res.errors}`);
});

test('validateCommitMessage - rejects subject exceeding 72 characters', () => {
  const subject73 = 'feat: ' + 'a'.repeat(67);
  assert.equal(subject73.length, 73);
  const res = validateCommitMessage(subject73);
  assert.equal(res.valid, false);
  assert.match(res.errors[0], /exceeds 72 characters/i);
});

test('validateCommitMessage - rejects subject with trailing period', () => {
  const res = validateCommitMessage('feat: add user profile.');
  assert.equal(res.valid, false);
  assert.match(res.errors[0], /must not end with a period/i);
});

test('validateCommitMessage - rejects uppercase summary', () => {
  const res = validateCommitMessage('feat: Add user profile');
  assert.equal(res.valid, false);
  assert.ok(
    res.errors.some((e) =>
      e.includes('Commit summary must start with a lowercase letter or digit'),
    ),
  );
});

test('validateCommitMessage - rejects invalid types and malformed headers', () => {
  const malformed = [
    'random commit message',
    'foo: add new widget',
    'feat:add without space',
    'feat(): empty scope not allowed',
    'feat: ',
  ];

  for (const msg of malformed) {
    const res = validateCommitMessage(msg);
    assert.equal(res.valid, false, `Expected "${msg}" to be invalid`);
  }
});

test('validateCommitMessage - rejects non-imperative leading verbs', () => {
  const nonImperativeCases = [
    ['feat: added new button', 'added'],
    ['feat: adds new button', 'adds'],
    ['feat: adding new button', 'adding'],
    ['fix: fixed memory leak', 'fixed'],
    ['fix: fixes memory leak', 'fixes'],
    ['fix: fixing memory leak', 'fixing'],
    ['chore: updated dependencies', 'updated'],
    ['chore: updates dependencies', 'updates'],
    ['chore: updating dependencies', 'updating'],
    ['refactor: removed legacy code', 'removed'],
    ['refactor: removes legacy code', 'removes'],
    ['refactor: removing legacy code', 'removing'],
    ['refactor: refactored parser', 'refactored'],
    ['refactor: refactoring parser', 'refactoring'],
    ['feat: implemented dark mode', 'implemented'],
    ['feat: implementing dark mode', 'implementing'],
  ];

  for (const [msg, word] of nonImperativeCases) {
    const res = validateCommitMessage(msg);
    assert.equal(
      res.valid,
      false,
      `Expected "${msg}" to fail imperative check`,
    );
    assert.ok(
      res.errors.some((e) => e.includes(word) && e.includes('imperative mood')),
      `Expected error mentioning "${word}" and "imperative mood", got: ${res.errors.join('; ')}`,
    );
  }
});

test('validateCommitMessage - rejects banned marketing/AI buzzwords', () => {
  for (const word of BANNED_SLOP_WORDS) {
    const resSubject = validateCommitMessage(`feat: add ${word} cache logic`);
    assert.equal(
      resSubject.valid,
      false,
      `Expected slop word "${word}" in subject to be rejected`,
    );
    assert.ok(
      resSubject.errors.some((e) => e.includes(word)),
      `Error should mention "${word}"`,
    );

    const resBody = validateCommitMessage(
      `feat: add cache logic\n\nThis is a ${word} approach to caching.`,
    );
    assert.equal(
      resBody.valid,
      false,
      `Expected slop word "${word}" in body to be rejected`,
    );
    assert.ok(
      resBody.errors.some((e) => e.includes(word)),
      `Error should mention "${word}"`,
    );
  }
});

test('validateCommitMessage - rejects template phrases', () => {
  for (const phrase of TEMPLATE_PHRASES) {
    const res = validateCommitMessage(
      `feat: add user export\n\nIn ${phrase} we provide data downloads.`,
    );
    assert.equal(
      res.valid,
      false,
      `Expected template phrase "${phrase}" to be rejected`,
    );
    assert.ok(
      res.errors.some((e) => e.includes(phrase)),
      `Error should mention "${phrase}"`,
    );
  }
});

test('validateCommitMessage - rejects filler adverbs', () => {
  for (const adverb of FILLER_ADVERBS) {
    const resSubject = validateCommitMessage(`feat: ${adverb} add login`);
    assert.equal(
      resSubject.valid,
      false,
      `Expected filler "${adverb}" to be rejected`,
    );
    assert.ok(
      resSubject.errors.some((e) => e.includes(adverb)),
      `Error should mention "${adverb}"`,
    );
  }
});

test('validateCommitMessage - validates body line lengths and exemptions', () => {
  const validBody = [
    'feat: add settings toggle',
    '',
    'Allow users to toggle compact mode in the extension drawer.',
    'State is preserved across reload cycles in local storage.',
    '',
    'Closes #123',
  ].join('\n');
  assert.equal(validateCommitMessage(validBody).valid, true);

  const invalidLongBody = [
    'feat: add settings toggle',
    '',
    'This line is intentionally crafted to exceed the maximum allowed length of seventy-two characters in git body paragraphs.',
  ].join('\n');
  const resLong = validateCommitMessage(invalidLongBody);
  assert.equal(resLong.valid, false);
  assert.match(resLong.errors[0], /Body line 3 exceeds 72 characters/);

  const validUrlBody = [
    'feat: add settings toggle',
    '',
    'https://github.com/example/very-long-repository-name/issues/12345678901234567890',
  ].join('\n');
  assert.equal(validateCommitMessage(validUrlBody).valid, true);

  const validMarkdownLink = [
    'feat: add settings toggle',
    '',
    '[Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)',
  ].join('\n');
  assert.equal(validateCommitMessage(validMarkdownLink).valid, true);

  const validBulletUrl = [
    'feat: add settings toggle',
    '',
    '- https://github.com/example/very-long-repository-name/pull/12345678901234567890',
  ].join('\n');
  assert.equal(validateCommitMessage(validBulletUrl).valid, true);
});

test('validateCommitMessage - gracefully permits standard git merge commits', () => {
  const merges = [
    "Merge branch 'feature/awesome-panel' into main",
    "Merge remote-tracking branch 'origin/main'",
    'Merge pull request #123 from user/branch',
    "Merge tag 'v1.0.0'",
  ];

  for (const mergeMsg of merges) {
    const res = validateCommitMessage(mergeMsg);
    assert.equal(
      res.valid,
      true,
      `Expected git merge to be permitted: ${mergeMsg}`,
    );
  }
});

test('validateCommitMessage - gracefully permits standard git revert commits', () => {
  const revertMsg = [
    'Revert "feat(api): add experimental websocket compression"',
    '',
    'This reverts commit a1b2c3d4e5f6.',
  ].join('\n');

  const res = validateCommitMessage(revertMsg);
  assert.equal(res.valid, true);
});

test('validateCommitMessage - handles comment stripping and empty messages', () => {
  const gitTemplateWithComments = [
    '# Please enter the commit message for your changes. Lines starting',
    "# with '#' will be ignored, and an empty message aborts the commit.",
    'feat: update build script',
    '# On branch main',
    '# Changes to be committed:',
    '#   modified: package.json',
  ].join('\n');

  const res = validateCommitMessage(gitTemplateWithComments);
  assert.equal(res.valid, true);

  const onlyComments = ['# Only comments here', '# Nothing else'].join('\n');
  assert.equal(validateCommitMessage(onlyComments).valid, false);

  assert.equal(validateCommitMessage('').valid, false);
  assert.equal(validateCommitMessage('   \n  \n  ').valid, false);
  assert.equal(validateCommitMessage(null).valid, false);
});

test('CLI script execution - validates file input via child_process', async () => {
  const scriptPath = path.resolve('scripts/validate-commit-msg.mjs');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unslop-test-'));

  const validFile = path.join(tempDir, 'valid.txt');
  fs.writeFileSync(validFile, 'feat: add valid cli test\n\nCloses #42\n');

  const invalidFile = path.join(tempDir, 'invalid.txt');
  fs.writeFileSync(invalidFile, 'feat: Added invalid cli test.\n');

  // Test 1: Valid commit file exits 0
  await new Promise((resolve, reject) => {
    execFile('node', [scriptPath, validFile], (err, stdout, stderr) => {
      if (err) return reject(new Error(`Valid commit failed: ${stderr}`));
      assert.equal(stderr, '');
      resolve();
    });
  });

  // Test 2: Invalid commit file exits 1
  await new Promise((resolve) => {
    execFile('node', [scriptPath, invalidFile], (err, stdout, stderr) => {
      assert.ok(err, 'Expected invalid commit file to fail with exit code 1');
      assert.equal(err.code, 1);
      assert.match(stderr, /Commit message rejected/);
      assert.match(stderr, /imperative mood/);
      resolve();
    });
  });

  // Test 3: Missing argument exits 1
  await new Promise((resolve) => {
    execFile('node', [scriptPath], (err, stdout, stderr) => {
      assert.ok(err);
      assert.equal(err.code, 1);
      assert.match(stderr, /argument is required/i);
      resolve();
    });
  });

  // Test 4: Nonexistent file exits 1
  await new Promise((resolve) => {
    execFile(
      'node',
      [scriptPath, path.join(tempDir, 'nonexistent.txt')],
      (err, stdout, stderr) => {
        assert.ok(err);
        assert.equal(err.code, 1);
        assert.match(stderr, /Error reading commit message file/i);
        resolve();
      },
    );
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
});
