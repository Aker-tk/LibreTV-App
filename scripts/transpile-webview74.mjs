import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'public');
const jsDirs = [
  path.join(publicDir, 'js'),
];
const extraFiles = [
  path.join(publicDir, 'libs', 'tailwindcss.min.js'),
];
const target = 'chrome74';

export async function transformSourceForWebView74(source) {
  const result = await transform(source, {
    charset: 'utf8',
    legalComments: 'inline',
    minify: false,
    sourcemap: false,
    target,
  });

  return result.code;
}

async function collectJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function transpileFile(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const code = await transformSourceForWebView74(source);
  await fs.writeFile(filePath, code, 'utf8');
}

async function main() {
  const collected = await Promise.all(jsDirs.map(collectJsFiles));
  const files = [...new Set([...collected.flat(), ...extraFiles])];

  for (const file of files) {
    await transpileFile(file);
  }

  console.log(`Transpiled ${files.length} files for ${target}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
