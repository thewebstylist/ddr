/**
 * Icon generator — run with `node tools/make-icons.mjs` from the extension
 * folder. Writes icons/icon{16,32,48,128}.png.
 *
 * The icons ship in the repository, so this only needs re-running when the
 * mark itself changes. No dependencies: the PNGs are encoded by hand.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'icons');

const INK = [8, 9, 13];
const INK_TOP = [22, 24, 32];
const WHITE = [255, 255, 255];
const PINK = [255, 46, 136];
const BLUE = [46, 212, 255];

/** Signed distance to a rounded rectangle (negative = inside). */
function sdRoundRect(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius);
  const qy = Math.abs(py - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

/** Colour of one sub-sample, or null where the icon is transparent. */
function sample(x, y, size) {
  const s = size;
  const tile = sdRoundRect(x, y, s / 2, s / 2, s / 2, s / 2, s * 0.225);
  if (tile > 0) return null;

  let colour = mix(INK_TOP, INK, y / s);

  // Phone body: a white outline, thick enough to survive 16px.
  const bodyHalfW = s * 0.2;
  const bodyHalfH = s * 0.33;
  const stroke = Math.max(s * 0.055, 1);
  const body = sdRoundRect(x, y, s / 2, s / 2, bodyHalfW, bodyHalfH, s * 0.085);
  if (body <= 0 && body >= -stroke) colour = WHITE;

  // Dynamic Island, in Sterling pink.
  const island = sdRoundRect(x, y, s / 2, s / 2 - bodyHalfH + s * 0.1, s * 0.075, s * 0.024, s * 0.024);
  if (island <= 0) colour = PINK;

  // Home indicator, in electric blue.
  const home = sdRoundRect(x, y, s / 2, s / 2 + bodyHalfH - s * 0.075, s * 0.065, s * 0.017, s * 0.017);
  if (home <= 0) colour = BLUE;

  return colour;
}

function render(size) {
  const SS = 4; // 4x4 super-sampling
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const colour = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size);
          if (!colour) continue;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          a += 255;
        }
      }

      const hits = a / 255;
      const offset = (y * size + x) * 4;
      if (hits > 0) {
        pixels[offset] = Math.round(r / hits);
        pixels[offset + 1] = Math.round(g / hits);
        pixels[offset + 2] = Math.round(b / hits);
      }
      pixels[offset + 3] = Math.round(a / (SS * SS));
    }
  }

  return pixels;
}

/* --- minimal PNG writer ------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const file = resolve(OUT, `icon${size}.png`);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`wrote ${file}`);
}
