import { mkdir, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hdriDir = path.join(root, 'public', 'hdri');
const hdriPath = path.join(hdriDir, 'dikhololo_night_1k.hdr');
const url =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr';

try {
  await access(hdriPath);
  console.log('HDRI already present:', hdriPath);
  process.exit(0);
} catch {
  // download below
}

await mkdir(hdriDir, { recursive: true });
console.log('Downloading Dikhololo Night HDRI (CC0, Poly Haven)…');
const res = await fetch(url);
if (!res.ok) throw new Error(`HDRI download failed: ${res.status} ${res.statusText}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(hdriPath));
console.log('Saved', hdriPath);
