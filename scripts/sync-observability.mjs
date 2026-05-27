import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';

const cwd = process.cwd();
const monorepoSource = join(cwd, '..', 'shared', 'observability');
const localSource = join(cwd, 'shared', 'observability');
const target = join(cwd, 'shared', 'observability');

let source = monorepoSource;
if (!existsSync(join(source, 'index.ts'))) {
  if (existsSync(join(localSource, 'index.ts'))) {
    console.log('Observability bundle already present.');
    process.exit(0);
  }
  console.error('Observability source not found.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.log(`Synced observability into ${target}`);
