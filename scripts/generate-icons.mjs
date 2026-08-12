import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'dashboard', 'package.json'));
const sharp = require('sharp');
const svgPath = path.join(root, 'dashboard', 'public', 'icon-512.svg');
const svg = await readFile(svgPath);

const outputs = [
  { file: 'dashboard/public/icon-192.png', size: 192 },
  { file: 'dashboard/public/icon-512.png', size: 512 },
  { file: 'dashboard/public/apple-touch-icon.png', size: 180 },
  { file: 'dashboard/public/favicon.png', size: 48 },
  { file: 'assets/icon.png', size: 1024 },
  { file: 'assets/adaptive-icon.png', size: 1024 },
  { file: 'assets/splash-icon.png', size: 512 },
  { file: 'assets/favicon.png', size: 48 },
];

await mkdir(path.join(root, 'assets'), { recursive: true });

for (const { file, size } of outputs) {
  const outPath = path.join(root, file);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`Created ${file}`);
}

const favicon32 = await sharp(svg).resize(32, 32).png().toBuffer();
await writeFile(path.join(root, 'dashboard', 'public', 'favicon.ico'), favicon32);
console.log('Created dashboard/public/favicon.ico');
