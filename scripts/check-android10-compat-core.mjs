import { parse } from 'acorn';

const RULES = {
  'optional-chaining': 'Optional chaining is not supported by Android System WebView 74.',
  'nullish-coalescing': 'Nullish coalescing is not supported by Android System WebView 74.',
  'logical-and-assignment': 'Logical AND assignment is not supported by Android System WebView 74.',
  'logical-or-assignment': 'Logical OR assignment is not supported by Android System WebView 74.',
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

  return null;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') {
    return;
  }

  visit(node);

  Object.entries(node).forEach(([key, value]) => {
    if (key === 'start' || key === 'end' || key === 'loc') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, visit));
      return;
    }

    walk(value, visit);
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

  walk(ast, (node) => {
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
