/** AST-based signature and caller matching for the default-argument audit. */
import { dirname, resolve } from 'node:path';
import { parse } from 'acorn';
import { ancestor } from 'acorn-walk';

const astOf = (source) =>
  parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  });
const propertyName = (node) => node?.name ?? node?.value;
const scopeOf = (ancestors) =>
  [...ancestors]
    .reverse()
    .find((n) =>
      [
        'Program',
        'BlockStatement',
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
      ].includes(n.type),
    );

export function defaultSignatures(source) {
  const found = new Map();
  ancestor(astOf(source), {
    Function(node, ancestors) {
      const parent = ancestors.at(-2);
      const owner =
        parent?.type === 'MethodDefinition' ?
          [...ancestors]
            .reverse()
            .find((n) =>
              ['ClassDeclaration', 'ClassExpression'].includes(n.type),
            )?.id?.name
        : null;
      const name =
        parent?.type === 'MethodDefinition' ?
          propertyName(parent.key)
        : (node.id?.name ??
          (parent?.type === 'VariableDeclarator' ? parent.id.name : null));
      if (!name) return;
      const params = node.params.map((p) => ({
        text: source.slice(p.start, p.end),
        defaultExpr:
          p.type === 'AssignmentPattern' ?
            source.slice(p.right.start, p.right.end)
          : null,
      }));
      found.set(owner ? `${owner}.${name}` : name, {
        name,
        owner: owner ?? null,
        params,
        line: node.loc.start.line,
      });
    },
  });
  return found;
}

/** Resolve only local declarations, direct imports/requires, aliases and new instances.
 * Unknown receivers stay unresolved instead of being attributed by method name.
 */
export function defaultArgumentCalls(source, file, change) {
  const ast = astOf(source);
  const scopes = new Map();
  const bind = (scope, name, value) => {
    if (!name) return;
    if (!scopes.has(scope)) scopes.set(scope, new Map());
    scopes.get(scope).set(name, value);
  };
  const unknown = { kind: 'unknown' };
  const names = (pattern) => {
    if (!pattern) return [];
    if (pattern.type === 'Identifier') return [pattern.name];
    if (pattern.type === 'AssignmentPattern') return names(pattern.left);
    if (pattern.type === 'RestElement') return names(pattern.argument);
    if (pattern.type === 'ObjectPattern')
      return pattern.properties.flatMap((p) => names(p.value ?? p.argument));
    if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(names);
    return [];
  };
  const modulePath = (specifier) =>
    typeof specifier === 'string' && specifier.startsWith('.') ?
      resolve(dirname(file), specifier)
    : null;
  ancestor(ast, {
    ImportDeclaration(node, ancestors) {
      for (const s of node.specifiers)
        bind(scopeOf(ancestors), s.local.name, {
          kind: 'import',
          file: modulePath(node.source.value),
          name: s.imported?.name ?? 'default',
        });
    },
    ClassDeclaration(node, ancestors) {
      bind(scopeOf(ancestors.slice(0, -1)), node.id?.name, {
        kind: 'class',
        file,
        name: node.id?.name,
      });
    },
    Function(node, ancestors) {
      for (const p of node.params)
        for (const name of names(p)) bind(node, name, unknown);
      if (node.type === 'FunctionDeclaration')
        bind(scopeOf(ancestors.slice(0, -1)), node.id?.name, {
          kind: 'function',
          file,
          name: node.id?.name,
        });
    },
    VariableDeclarator(node, ancestors) {
      const scope = scopeOf(ancestors);
      const init = node.init;
      const required =
        init?.type === 'CallExpression' && init.callee.name === 'require' ?
          modulePath(init.arguments[0]?.value)
        : null;
      if (required && node.id.type === 'ObjectPattern') {
        for (const p of node.id.properties)
          bind(scope, p.value?.name, {
            kind: 'import',
            file: required,
            name: propertyName(p.key),
          });
      } else {
        let value = unknown;
        if (required)
          value = { kind: 'import', file: required, name: 'default' };
        else if (init?.type === 'NewExpression')
          value = { kind: 'instance', expression: init.callee };
        else if (init?.type === 'Identifier')
          value = { kind: 'alias', expression: init };
        else if (
          ['ArrowFunctionExpression', 'FunctionExpression'].includes(init?.type)
        )
          value = { kind: 'function', file, name: node.id.name };
        for (const name of names(node.id)) bind(scope, name, value);
      }
    },
  });
  const lookup = (name, ancestors) => {
    for (const scope of [...ancestors].reverse())
      if (scopes.get(scope)?.has(name)) return scopes.get(scope).get(name);
    return unknown;
  };
  const resolveBinding = (expression, ancestors, seen = new Set()) => {
    if (expression?.type === 'Identifier') {
      if (seen.has(expression.name)) return unknown;
      seen.add(expression.name);
      const binding = lookup(expression.name, ancestors);
      if (binding.kind === 'alias')
        return resolveBinding(binding.expression, ancestors, seen);
      if (binding.kind === 'instance')
        return resolveBinding(binding.expression, ancestors, seen);
      return binding;
    }
    if (expression?.type === 'ThisExpression') {
      const owner = [...ancestors]
        .reverse()
        .find((n) => ['ClassDeclaration', 'ClassExpression'].includes(n.type))
        ?.id?.name;
      return owner ? { kind: 'class', file, name: owner } : unknown;
    }
    return unknown;
  };
  const sites = [];
  let unresolved = 0;
  const targetFile = resolve(change.file);
  const visit = (node, ancestors) => {
    const callee = node.callee;
    const isMethod = callee.type === 'MemberExpression' && !callee.computed;
    const name = isMethod ? propertyName(callee.property) : callee.name;
    const constructor =
      node.type === 'NewExpression' && change.name === 'constructor';
    if (isMethod && name !== change.name) return;
    if (change.owner && !constructor && name !== change.name) return;
    if (change.owner && change.name !== 'constructor' && !isMethod) return;
    const binding = resolveBinding(
      isMethod ? callee.object : callee,
      ancestors,
    );
    if (binding.kind === 'unknown') {
      unresolved++;
      return;
    }
    if (binding.file !== targetFile) return;
    if (binding.kind === 'class' && binding.name !== change.owner) return;
    if (
      !change.owner &&
      binding.name !== change.name &&
      binding.name !== 'default'
    )
      return;
    if (node.arguments.some((arg) => arg.type === 'SpreadElement')) {
      unresolved++;
      return;
    }
    const arg = node.arguments[change.paramIndex];
    if (arg && !(arg.type === 'UnaryExpression' && arg.operator === 'void')) {
      if (
        arg.type !== 'Identifier' ||
        arg.name !== 'undefined' ||
        lookup('undefined', ancestors).kind !== 'unknown'
      )
        return;
    }
    sites.push({
      file,
      line: node.loc.start.line,
      argsPassed: node.arguments.length,
      code: source
        .slice(node.start, node.end)
        .replace(/\s+/g, ' ')
        .slice(0, 120),
    });
  };
  ancestor(ast, { CallExpression: visit, NewExpression: visit });
  return { sites, unresolved };
}
