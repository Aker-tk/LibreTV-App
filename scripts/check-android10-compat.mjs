import fs from 'node:fs';
import path from 'node:path';
import { collectUnsupportedSyntaxMatches } from './check-android10-compat-core.mjs';

const repoRoot = process.cwd();

const htmlFiles = [
  'public/index.html',
  'public/player.html',
  'public/about.html',
  'public/privacy.html',
];

const jsFiles = [
  'public/js/api.js',
  'public/js/apiDetailHandlers.js',
  'public/js/apiRequestCore.js',
  'public/js/apiSearchHandlers.js',
  'public/js/apiUtils.js',
  'public/js/api_management.js',
  'public/js/app_event_listeners.js',
  'public/js/app_globals.js',
  'public/js/app_init.js',
  'public/js/app_lifecycle.js',
  'public/js/config.js',
  'public/js/config_io.js',
  'public/js/config_utils.js',
  'public/js/details_modal.js',
  'public/js/details_module.js',
  'public/js/douban.js',
  'public/js/douban_api.js',
  'public/js/douban_filters.js',
  'public/js/douban_logic.js',
  'public/js/douban_ui.js',
  'public/js/password.js',
  'public/js/player.js',
  'public/js/player_core_logic.js',
  'public/js/player_dplayer_handler.js',
  'public/js/player_module.js',
  'public/js/player_navigation.js',
  'public/js/player_ui_helpers.js',
  'public/js/player_utils.js',
  'public/js/player_vars.js',
  'public/js/search_logic.js',
  'public/js/search_module.js',
  'public/js/settings_events.js',
  'public/js/sha256.js',
  'public/js/ui.js',
  'public/js/version-check.js',
  'public/js/version_data.js',
  'public/js/wakelock.js',
];

const htmlForbiddenPatterns = [];

function collectMatches(relativePath, patterns) {
  const absolutePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const matches = [];

  for (const rule of patterns) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        matches.push({
          file: relativePath,
          line: index + 1,
          message: rule.message,
          snippet: line.trim(),
        });
      }
    });
  }

  return matches;
}

function collectJsSyntaxMatches(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  return collectUnsupportedSyntaxMatches(content, relativePath);
}

const failures = [
  ...htmlFiles.flatMap((file) => collectMatches(file, htmlForbiddenPatterns)),
  ...jsFiles.flatMap(collectJsSyntaxMatches),
  ...collectJsSyntaxMatches('public/libs/tailwindcss.min.js'),
];

if (failures.length > 0) {
  console.error('Android 10 compatibility check failed:\n');
  failures.forEach((failure) => {
    console.error(`${failure.file}:${failure.line}`);
    console.error(`  ${failure.message}`);
    console.error(`  ${failure.snippet}`);
  });
  process.exit(1);
}

console.log('Android 10 compatibility check passed.');
