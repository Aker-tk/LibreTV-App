import assert from 'node:assert/strict';
import { transformSourceForWebView74 } from './transpile-webview74.mjs';

const source = `
async function search() {
  const payload = { ...window.foo, ok: window.foo?.bar ?? 'fallback' };
  return payload;
}
`;

const transformed = await transformSourceForWebView74(source);

assert.match(transformed, /async function search\(\)/);
assert.doesNotMatch(transformed, /\?\./);
assert.doesNotMatch(transformed, /\?\?/);
assert.doesNotMatch(transformed, /\.\.\./);
