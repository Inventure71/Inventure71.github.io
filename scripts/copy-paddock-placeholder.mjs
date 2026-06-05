import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = require.resolve('@inventure71/paddockjs/placeholder.css');
const target = join(process.cwd(), 'dist/f1-simulator/paddock-placeholder.css');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
