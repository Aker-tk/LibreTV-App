import assert from 'node:assert/strict';
import { transformSourceForWebView74 } from './transpile-webview74.mjs';

const source = `
async function search() {
  return window.foo?.bar ?? 'fallback';
}
`;

const transformed = await transformSourceForWebView74(source);

assert.match(transformed, /async function search\(\)/);
assert.doesNotMatch(transformed, /\?\./);
assert.doesNotMatch(transformed, /\?\?/);
