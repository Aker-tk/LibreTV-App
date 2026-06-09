import assert from 'node:assert/strict';
import { collectUnsupportedSyntaxMatches } from './check-android10-compat-core.mjs';

const regexLiteralMatches = collectUnsupportedSyntaxMatches(
  'const pattern = /[-*+?.^${}(|)[\\]]/;',
);

assert.equal(
  regexLiteralMatches.length,
  0,
  'regex literal text should not be reported as optional chaining',
);

const optionalChainingMatches = collectUnsupportedSyntaxMatches(`
const title = movie?.title;
`);

assert.equal(optionalChainingMatches.length, 1);
assert.equal(optionalChainingMatches[0].type, 'optional-chaining');

const objectSpreadMatches = collectUnsupportedSyntaxMatches(`
const nextState = { ...prevState, ready: true };
`);

assert.equal(objectSpreadMatches.length, 1);
assert.equal(objectSpreadMatches[0].type, 'object-spread');
