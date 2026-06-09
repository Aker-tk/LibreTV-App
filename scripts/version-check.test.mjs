import assert from 'node:assert/strict';
import { resolveLatestVersion } from './version-check-core.mjs';

let fetchCalls = 0;

const tauriRequest = async (url) => {
  assert.equal(url, 'https://raw.ihtw.moe/raw.githubusercontent.com/LibreSpark/LibreTV/main/VERSION.txt');
  return '202506090001';
};

const webFetch = async () => {
  fetchCalls += 1;
  return 'should-not-be-used';
};

const latest = await resolveLatestVersion({
  isTauriEnvironment: true,
  tauriRequest,
  webFetch,
});

assert.equal(latest, '202506090001');
assert.equal(fetchCalls, 0, 'tauri environment should not fall back to browser fetch when native request succeeds');
