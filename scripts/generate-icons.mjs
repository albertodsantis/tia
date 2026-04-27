import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'brand', 'isotipo-512.png');
const outDir = path.join(root, 'apps', 'web', 'public', 'icons');
const publicDir = path.join(root, 'apps', 'web', 'public');

const srcBuffer = await readFile(src);

const trimmed = await sharp(srcBuffer).trim({ threshold: 1 }).toBuffer();
const trimmedMeta = await sharp(trimmed).metadata();
console.log(`Trimmed isotipo: ${trimmedMeta.width}x${trimmedMeta.height}`);

async function makeIcon(size, outPath, { padding = 0.12, bg = null } = {}) {
  const innerSize = Math.round(size * (1 - padding * 2));
  const resized = await sharp(trimmed)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const background = bg ?? { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

await makeIcon(192, path.join(outDir, 'icon-192.png'), { padding: 0.05 });
await makeIcon(512, path.join(outDir, 'icon-512.png'), { padding: 0.05 });
await makeIcon(180, path.join(outDir, 'apple-touch-icon.png'), {
  padding: 0.05,
  bg: { r: 24, g: 24, b: 27, alpha: 1 },
});

await makeIcon(192, path.join(outDir, 'icon-192-maskable.png'), {
  padding: 0.05,
  bg: { r: 24, g: 24, b: 27, alpha: 1 },
});
await makeIcon(512, path.join(outDir, 'icon-512-maskable.png'), {
  padding: 0.05,
  bg: { r: 24, g: 24, b: 27, alpha: 1 },
});

const ogSize = { w: 1200, h: 630 };
const ogIconSize = 380;
const ogIcon = await sharp(trimmed)
  .resize(ogIconSize, ogIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({
  create: {
    width: ogSize.w,
    height: ogSize.h,
    channels: 4,
    background: { r: 10, g: 10, b: 11, alpha: 1 },
  },
})
  .composite([{ input: ogIcon, gravity: 'center' }])
  .png()
  .toFile(path.join(publicDir, 'og-image.png'));
console.log(`✓ og-image.png (${ogSize.w}x${ogSize.h})`);

const faviconSvg = await sharp(trimmed)
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(publicDir, 'favicon-256.png'));
console.log(`✓ favicon-256.png`);
