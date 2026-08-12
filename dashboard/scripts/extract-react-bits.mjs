import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const tmp = process.env.TEMP;
const files = ['rb-fade.json', 'rb-list.json', 'rb-spot.json', 'rb-count.json', 'rb-pill.json', 'rb-step.json'];
const outDir = path.resolve('components/react-bits');
await mkdir(outDir, { recursive: true });

const allDeps = new Set();

for (const f of files) {
  const item = JSON.parse(await readFile(path.join(tmp, f), 'utf8'));
  for (const dep of item.dependencies ?? []) allDeps.add(dep);
  for (const file of item.files) {
    const name = path.basename(file.path);
    await writeFile(path.join(outDir, name), file.content, 'utf8');
    console.log(`${item.title} -> components/react-bits/${name}`);
  }
}

console.log('\nDEPENDENCIES:', [...allDeps].join(' '));
