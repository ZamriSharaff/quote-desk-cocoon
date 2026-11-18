import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const projectRoot = process.cwd();

const source = resolve(
  projectRoot,
  'data',
  'catalogue.csv'
);

const destination = resolve(
  projectRoot,
  'public',
  'data',
  'catalogue.csv'
);

await mkdir(dirname(destination), {
  recursive: true,
});

await copyFile(source, destination);

console.log('Cloudflare Pages assets prepared successfully.');
