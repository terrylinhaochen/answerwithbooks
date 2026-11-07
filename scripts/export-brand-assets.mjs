import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';

// Resize the approved square master; never regenerate artwork during export.
const root = new URL('../public/', import.meta.url);
const master = new URL('images/brand/book-fan-square.png', root);
const png = size => sharp(master.pathname).resize(size, size).png().toBuffer();
for (const size of [128, 256]) {
  await sharp(master.pathname).resize(size, size).webp({quality: 90})
    .toFile(new URL(`images/brand/book-fan-${size}.webp`, root).pathname);
}
for (const size of [32, 48]) {
  await writeFile(new URL(`favicon-${size}.png`, root), await png(size));
}
await writeFile(new URL('apple-touch-icon.png', root), await png(180));

// ICO directory with PNG payloads (16, 32, and 48 pixels).
const sizes = [16, 32, 48];
const payloads = await Promise.all(sizes.map(png));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
payloads.forEach((data, i) => {
  const entry = 6 + i * 16;
  directory[entry] = sizes[i];
  directory[entry + 1] = sizes[i];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(data.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
await writeFile(new URL('favicon.ico', root), Buffer.concat([directory, ...payloads]));
console.log('Exported header, footer, favicon, and touch-icon assets.');
