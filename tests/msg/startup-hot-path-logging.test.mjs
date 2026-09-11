import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

test('startup entity loop does not emit per-item diagnostics or evaluate their arguments', () => {
  const source = fs.readFileSync('src/js/msg/StartupService.js', 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  let entityLoop;
  simple(ast, {
    ForStatement(node) {
      if (
        source.slice(node.test.start, node.test.end) ===
        'id < map_entities.length'
      )
        entityLoop = node;
    },
  });
  assert.ok(entityLoop);
  const logs = [];
  simple(entityLoop, {
    CallExpression(node) {
      const callee = node.callee;
      if (
        callee.type === 'MemberExpression' &&
        ['console', 'logger'].includes(callee.object.name)
      )
        logs.push(source.slice(node.start, node.end));
    },
  });
  assert.deepEqual(logs, []);
});
