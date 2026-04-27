import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'brand', 'isotipo-1024.png');
const assets = path.join(root, 'assets');

const BRAND_BG_DARK = { r: 12, g: 2, b: 16, alpha: 1 };
const BRAND_BG_LIGHT = { r: 253, g: 243, b: 240, alpha: 1 };

async function loadIsotipoAsTransparent() {
  const { data, info } = await sharp(await readFile(src))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  const bgR = 232, bgG = 236, bgB = 240;
  const softMax = 28;
  const hardMin = 10;

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const dr = Math.abs(r - bgR);
    const dg = Math.abs(g - bgG);
    const db = Math.abs(b - bgB);
    const maxDiff = Math.max(dr, dg, db);
    const minChannel = Math.min(r, g, b);

    if (maxDiff <= hardMin && minChannel > 220) {
      out[i + 3] = 0;
    } else if (maxDiff <= softMax && minChannel > 200) {
      const t = (maxDiff - hardMin) / (softMax - hardMin);
      out[i + 3] = Math.round(t * 255);
    }
  }

  const transparent = await sharp(out, { raw: { width, height, channels } })
    .png()
    .toBuffer();

  return sharp(transparent).trim({ threshold: 10 }).toBuffer();
}

const trimmed = await loadIsotipoAsTransparent();
const meta = await sharp(trimmed).metadata();
console.log(`Trimmed isotipo (transparent): ${meta.width}x${meta.height}`);

async function centered(canvas, innerFraction, bg) {
  const innerSize = Math.round(canvas * innerFraction);
  const resized = await sharp(trimmed)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: canvas, height: canvas, channels: 4, background: bg },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

await sharp(await centered(1024, 0.78, BRAND_BG_DARK)).toFile(path.join(assets, 'icon-only.png'));
console.log('✓ assets/icon-only.png (1024x1024)');

await sharp(await centered(1024, 0.6, { r: 0, g: 0, b: 0, alpha: 0 })).toFile(path.join(assets, 'icon-foreground.png'));
console.log('✓ assets/icon-foreground.png (1024x1024)');

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BRAND_BG_DARK } })
  .png()
  .toFile(path.join(assets, 'icon-background.png'));
console.log('✓ assets/icon-background.png (1024x1024)');

const splashIconSize = Math.round(2732 * 0.22);
const splashIcon = await sharp(trimmed)
  .resize(splashIconSize, splashIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BRAND_BG_LIGHT } })
  .composite([{ input: splashIcon, gravity: 'center' }])
  .png()
  .toFile(path.join(assets, 'splash.png'));
console.log('✓ assets/splash.png (2732x2732, light)');

await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BRAND_BG_DARK } })
  .composite([{ input: splashIcon, gravity: 'center' }])
  .png()
  .toFile(path.join(assets, 'splash-dark.png'));
console.log('✓ assets/splash-dark.png (2732x2732, dark)');

// Also regenerate the transparent PWA icons so the background artifact is gone everywhere.
const pwaOut = path.join(root, 'apps', 'web', 'public', 'icons');
const pwaPublic = path.join(root, 'apps', 'web', 'public');

async function pwaIcon(size, outPath, { padding = 0.1, bg = null } = {}) {
  const innerSize = Math.round(size * (1 - padding * 2));
  const resized = await sharp(trimmed)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const background = bg ?? { r: 0, g: 0, b: 0, alpha: 0 };
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

await pwaIcon(192, path.join(pwaOut, 'icon-192.png'), { padding: 0.05 });
await pwaIcon(512, path.join(pwaOut, 'icon-512.png'), { padding: 0.05 });
await pwaIcon(180, path.join(pwaOut, 'apple-touch-icon.png'), { padding: 0.05, bg: BRAND_BG_DARK });
await pwaIcon(192, path.join(pwaOut, 'icon-192-maskable.png'), { padding: 0.05, bg: BRAND_BG_DARK });
await pwaIcon(512, path.join(pwaOut, 'icon-512-maskable.png'), { padding: 0.05, bg: BRAND_BG_DARK });

const ogSize = { w: 1200, h: 630 };
const ogIconSize = 380;
const ogIcon = await sharp(trimmed)
  .resize(ogIconSize, ogIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
await sharp({ create: { width: ogSize.w, height: ogSize.h, channels: 4, background: BRAND_BG_DARK } })
  .composite([{ input: ogIcon, gravity: 'center' }])
  .png()
  .toFile(path.join(pwaPublic, 'og-image.png'));
console.log(`✓ og-image.png`);

await sharp(trimmed)
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(pwaPublic, 'favicon-256.png'));
console.log(`✓ favicon-256.png`);
