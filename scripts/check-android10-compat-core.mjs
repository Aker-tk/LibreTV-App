import { parse } from 'acorn';

const COMPAT_LABEL = 'Android System WebView 58';

const RULES = {
  'optional-chaining': `Optional chaining is not supported by ${COMPAT_LABEL}.`,
  'nullish-coalescing': `Nullish coalescing is not supported by ${COMPAT_LABEL}.`,
  'logical-and-assignment': `Logical AND assignment is not supported by ${COMPAT_LABEL}.`,
  'logical-or-assignment': `Logical OR assignment is not supported by ${COMPAT_LABEL}.`,
  'object-spread': `Object spread syntax is not supported by ${COMPAT_LABEL}.`,
};

function getLine(content, lineNumber) {
  return content.split('\n')[lineNumber - 1]?.trim() ?? '';
}

function getNodeType(node) {
  if (node.type === 'ChainExpression') {
    return 'optional-chaining';
  }

  if ((node.type === 'LogicalExpression' && node.operator === '??')
    || (node.type === 'AssignmentExpression' && node.operator === '??=')) {
    return 'nullish-coalescing';
  }

  if (node.type === 'AssignmentExpression' && node.operator === '&&=') {
    return 'logical-and-assignment';
  }

  if (node.type === 'AssignmentExpression' && node.operator === '||=') {
    return 'logical-or-assignment';
  }

  if (node.type === 'SpreadElement' && node.parentType === 'ObjectExpression') {
    return 'object-spread';
  }

  return null;
}

function walk(node, parent = null, parentKey = '', visit = () => {}) {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (parent && node.type && !node.parentType) {
    Object.defineProperty(node, 'parentType', {
      value: parent.type,
      enumerable: false,
      configurable: true,
    });
  }
  if (parentKey && node.type && !node.parentKey) {
    Object.defineProperty(node, 'parentKey', {
      value: parentKey,
      enumerable: false,
      configurable: true,
    });
  }

  visit(node);

  Object.entries(node).forEach(([key, value]) => {
    if (key === 'start' || key === 'end' || key === 'loc') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, node, key, visit));
      return;
    }

    walk(value, node, key, visit);
  });
}

export function collectUnsupportedSyntaxMatches(content, relativePath = '<inline>') {
  const matches = [];

  const parseOptions = {
    ecmaVersion: 'latest',
    locations: true,
    allowHashBang: true,
  };

  function tryParse(sourceType) {
    return parse(content, {
      ...parseOptions,
      sourceType,
    });
  }

  let ast;
  try {
    ast = tryParse('script');
  } catch (scriptError) {
    try {
      ast = tryParse('module');
    } catch (moduleError) {
      const error = moduleError.pos > scriptError.pos ? moduleError : scriptError;
      matches.push({
        file: relativePath,
        line: error.loc?.line ?? 1,
        message: `Unable to parse JavaScript for compatibility analysis: ${error.message}`,
        snippet: getLine(content, error.loc?.line ?? 1),
        type: 'parse-error',
      });
      return matches;
    }
  }

  walk(ast, null, '', (node) => {
    const type = getNodeType(node);
    if (type) {
      const line = node.loc?.start?.line ?? 1;
      matches.push({
        file: relativePath,
        line,
        message: RULES[type],
        snippet: getLine(content, line),
        type,
      });
    }
  });

  return matches;
}
