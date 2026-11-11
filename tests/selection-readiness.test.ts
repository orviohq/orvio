import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import {
  EXTENSION_LANES,
  EXTENSION_READINESS_SELECTION,
  chartPreparingLabel,
  planGeneralReadiness,
  type ReadinessCandidate,
} from '../src/selection-readiness';
import { LANGUAGES } from '../src/i18n';

// Babel nodes are traversed generically so TypeScript syntax needs no legacy API.
type AstNode = { type: string; start: number; end: number; [key: string]: any };
function walk(node: AstNode, visit: (node: AstNode, parent?: AstNode) => void, parent?: AstNode) {
  visit(node, parent);
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof child.type === 'string') {
        walk(child, visit, node);
      }
    }
  }
}
function find(root: AstNode, predicate: (node: AstNode) => boolean): AstNode[] {
  const result: AstNode[] = [];
  walk(root, (node) => { if (predicate(node)) result.push(node); });
  return result;
}
function unique(nodes: AstNode[], label: string): AstNode {
  expect(nodes, label).toHaveLength(1);
  return nodes[0];
}
const identifier = (node: AstNode | undefined, name: string) =>
  node?.type === 'Identifier' && node.name === name;
const member = (node: AstNode | undefined, object: string, property: string) =>
  node?.type === 'MemberExpression' && identifier(node.object, object) &&
  (node.computed ? node.property.type === 'StringLiteral' && node.property.value === property : identifier(node.property, property));
const call = (node: AstNode, name: string) =>
  node.type === 'CallExpression' && identifier(node.callee, name);
const statementCall = (node: AstNode, name: string) =>
  node.type === 'ExpressionStatement' && call(node.expression, name);

export function analyzeReadinessSource(source: string) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] }) as unknown as AstNode;
  const parents = new Map<AstNode, AstNode>();
  walk(ast, (node, parent) => { if (parent) parents.set(node, parent); });
  const declaration = (name: string) => {
    const node = unique(find(ast, (node) => node.type === 'FunctionDeclaration' && identifier(node.id, name)), name);
    expect(node.body.type).toBe('BlockStatement');
    expect(node.body.body.length, `${name} body`).toBeGreaterThan(0);
    return node.body as AstNode;
  };
  const noReadiness = (body: AstNode) => {
    for (const name of ['prepareGeneralReadiness', 'extendGeneralSource', 'refreshGeneralSelection']) {
      expect(find(body, (node) => identifier(node, name)), name).toHaveLength(0);
    }
    expect(find(body, (node) => member(node, 'extensionLibraryPairs', 'generation'))).toHaveLength(0);
    expect(find(body, (node) => call(node, 'queueMicrotask') &&
      node.arguments.some((arg: AstNode) => arg.type === 'Identifier' && arg.name.startsWith('prepare')))).toHaveLength(0);
  };
  const settingsAssignment = (node: AstNode, property: string) =>
    node.type === 'AssignmentExpression' && node.operator === '=' && member(node.left, 'settings', property);
  const checkHandler = (body: AstNode, property: string) => {
    expect(body.type).toBe('BlockStatement');
    expect(body.body.length).toBeGreaterThan(0);
    unique(find(body, (node) => settingsAssignment(node, property)), `settings.${property} assignment`);
    unique(find(body, (node) => call(node, 'syncSettings')), `${property} syncSettings call`);
    noReadiness(body);
  };
  const sync = declaration('syncSettings');
  noReadiness(sync);

  const selectorHandler = (selector: string, property: string) => {
    const selectors = find(ast, (node) => node.type === 'CallExpression' &&
      member(node.callee, 'document', 'querySelectorAll') &&
      node.arguments[0]?.type === 'StringLiteral' && node.arguments[0].value === selector);
    expect(selectors.length, `${selector} selector calls`).toBeGreaterThan(0);
    const handlers: AstNode[] = [];
    for (const selectorCall of selectors) {
      const access = parents.get(selectorCall);
      const each = access && parents.get(access);
      if (access?.type !== 'MemberExpression' || access.object !== selectorCall ||
          !identifier(access.property, 'forEach') || each?.type !== 'CallExpression' || each.callee !== access) continue;
      const callback = each.arguments[0];
      if (!callback || !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type)) continue;
      const assignments = find(callback.body, (node) => node.type === 'AssignmentExpression' &&
        node.operator === '=' && node.left.type === 'MemberExpression' &&
        identifier(node.left.property, 'onclick') &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.right.type));
      if (assignments.length) {
        const assignment = unique(assignments, `${selector} onclick assignment`);
        handlers.push(assignment.right.body);
      }
    }
    const body = unique(handlers, `${selector} forEach handler`);
    checkHandler(body, property);
    return body;
  };
  const lane = selectorHandler('[data-lanes]', 'lanes');
  const difficulty = selectorHandler('[data-diff]', 'difficulty');
  const digitIf = unique(find(ast, (node) => node.type === 'IfStatement' &&
    find(node.test, (child) => child.type === 'RegExpLiteral' && child.pattern === '^Digit[4-8]$').length > 0), 'Digit[4-8] if');
  checkHandler(digitIf.consequent, 'lanes');

  // Keep the restore/source-selection guards, using actual AST references and calls.
  expect(find(ast, (node) => call(node, 'prepareGeneralReadiness')).length).toBeGreaterThan(0);
  expect(find(ast, (node) => call(node, 'queueMicrotask') && identifier(node.arguments[0], 'prepareGeneralReadiness')).length).toBeGreaterThan(0);
  expect(find(ast, (node) => identifier(node, 'EXTENSION_READINESS_SELECTION')).length).toBeGreaterThan(0);
  expect(find(ast, (node) => identifier(node, 'refreshGeneralSelection'))).toHaveLength(0);

  const route = declaration('readRoute');
  expect(find(route, (node) => identifier(node, 'extendGeneralSource'))).toHaveLength(0);
  const top = route.body as AstNode[];
  const routeSync = unique(top.filter((node) => statementCall(node, 'syncSettings')), 'route top-level sync');
  const restore = unique(top.filter((node) => statementCall(node, 'restoreLibraryScroll')), 'route top-level restore');
  const selectIf = unique(top.filter((node) => node.type === 'IfStatement' &&
    node.test.type === 'BinaryExpression' && node.test.operator === '===' &&
    identifier(node.test.left, 'screen') && node.test.right.type === 'StringLiteral' &&
    node.test.right.value === 'select' &&
    find(node.consequent, (child) => call(child, 'queueMicrotask') &&
      identifier(child.arguments[0], 'prepareGeneralReadiness')).length > 0), 'route selection readiness if');
  expect(routeSync.start).toBeLessThan(restore.start);
  expect(restore.start).toBeLessThan(selectIf.start);
  const queue = unique(find(selectIf.consequent, (node) => call(node, 'queueMicrotask') &&
    node.arguments.length === 1 && identifier(node.arguments[0], 'prepareGeneralReadiness')), 'route selection queue');
  expect(find(route, (node) => call(node, 'queueMicrotask') && identifier(node.arguments[0], 'prepareGeneralReadiness'))).toHaveLength(1);
  return { ast, sync, lane, difficulty, digitIf, route, routeSync, restore, selectIf, queue };
}

const sourcePath = process.env.ORV108_MAIN ?? new URL('../src/main.ts', import.meta.url);
const main = readFileSync(sourcePath, 'utf8');
const candidate = (
  id: string,
  overrides: Partial<ReadinessCandidate> = {},
): ReadinessCandidate => ({
  id,
  pending: false,
  deferred: false,
  failed: false,
  ...overrides,
});

it('dedupes and skips unified, pending, deferred, failed while upgrading legacy', () => {
  expect(
    planGeneralReadiness([
      candidate('base-a', { generation: 'legacy' }),
      candidate('base-a', { generation: 'legacy' }),
      candidate('base-b', { generation: 'unified' }),
      candidate('base-c', { pending: true }),
      candidate('base-d', { deferred: true }),
      candidate('base-e', { failed: true }),
      candidate('base-f'),
      candidate('', { generation: 'legacy' }),
    ]),
  ).toEqual(['base-a', 'base-f']);
});

it('all-mode readiness is independent of the current key-count selection', () => {
  expect(EXTENSION_LANES).toEqual([4, 6, 8]);
  expect(EXTENSION_READINESS_SELECTION).toEqual({ lanes: 4, difficulty: 'low' });
  expect(Object.isFrozen(EXTENSION_LANES)).toBe(true);
  expect(Object.isFrozen(EXTENSION_READINESS_SELECTION)).toBe(true);
  const plan = [candidate('base', { generation: 'legacy' })];
  expect(planGeneralReadiness(plan)).toEqual(['base']);
  expect(planGeneralReadiness(plan)).toEqual(['base']);
});

it('syncSettings and key/difficulty routing never start extension or readiness work', () => {
  analyzeReadinessSource(main);
});

it('readiness is hooked at restore and source-selection boundaries, not key sync', () => {
  analyzeReadinessSource(main);
});

it('chart preparation labels exist for every language and never claim audio', () => {
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const label = chartPreparingLabel(language);
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toMatch(/audio|음원|音源|â|ses|áudio|аудио|âm thanh/i);
  }
  expect(chartPreparingLabel('ko')).toBe('차트를 준비하고 있습니다…');
});

it('readRoute returning to selection queues source readiness after route sync', () => {
  analyzeReadinessSource(main);
});

const replaceNode = (source: string, node: AstNode, replacement: string) =>
  source.slice(0, node.start) + replacement + source.slice(node.end);

it('accepts semantically identical source quote and whitespace variants', () => {
  const { ast } = analyzeReadinessSource(main);
  const literals = find(ast, (node) => node.type === 'StringLiteral' &&
    ['[data-lanes]', '[data-diff]', 'select'].includes(node.value));
  expect(literals.length).toBeGreaterThan(0);
  for (const quote of ["'", '"']) {
    let variant = main;
    for (const node of literals.sort((a, b) => b.start - a.start)) {
      variant = replaceNode(variant, node, `  ${quote}${node.value}${quote}  `);
    }
    analyzeReadinessSource(variant);
  }
});

it('rejects a removed lane sync call', () => {
  const { lane } = analyzeReadinessSource(main);
  const sync = unique(find(lane, (node) => statementCall(node, 'syncSettings')), 'lane sync statement');
  expect(() => analyzeReadinessSource(replaceNode(main, sync, ';'))).toThrow();
});

it('rejects extension work inserted in the lane handler', () => {
  const { lane } = analyzeReadinessSource(main);
  const variant = main.slice(0, lane.start + 1) + '\nextendGeneralSource();\n' + main.slice(lane.start + 1);
  expect(() => analyzeReadinessSource(variant)).toThrow();
});

it('rejects a removed route readiness queue', () => {
  const { queue } = analyzeReadinessSource(main);
  expect(() => analyzeReadinessSource(replaceNode(main, queue, 'void 0'))).toThrow();
});

it('rejects the selection queue moved before route sync', () => {
  const { selectIf, routeSync } = analyzeReadinessSource(main);
  const without = replaceNode(main, selectIf, '');
  const variant = without.slice(0, routeSync.start) + main.slice(selectIf.start, selectIf.end) + '\n' + without.slice(routeSync.start);
  expect(() => analyzeReadinessSource(variant)).toThrow();
});

it.each(['sync', 'lane', 'difficulty', 'digitIf', 'route'] as const)('rejects an absent %s AST guard target', (target) => {
  const nodes = analyzeReadinessSource(main);
  const replacement = ['sync', 'lane', 'difficulty', 'route'].includes(target) ? '{}' : ';';
  expect(() => analyzeReadinessSource(replaceNode(main, nodes[target], replacement))).toThrow();
});
