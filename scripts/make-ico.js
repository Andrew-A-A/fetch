// Writes build/icon.ico: mark A drawn natively at each Windows icon size (no resampling), PNG-compressed entries.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { rasterize } = require('../icon');

const SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];

function png(n) {
  const bgra = rasterize(n);
  const raw = Buffer.alloc(n * (n * 4 + 1)); // each row: filter byte 0 + RGBA
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const s = (y * n + x) * 4, d = y * (n * 4 + 1) + 1 + x * 4;
    raw[d] = bgra[s + 2]; raw[d + 1] = bgra[s + 1]; raw[d + 2] = bgra[s]; raw[d + 3] = bgra[s + 3];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function ico(sizes) {
  const imgs = sizes.map(png);
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((n, i) => {
    const e = 6 + 16 * i;
    head[e] = n % 256; head[e + 1] = n % 256; // 256 is stored as 0
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
    off += imgs[i].length;
  });
  return Buffer.concat([head, ...imgs]);
}

const out = path.join(__dirname, '..', 'build');
fs.mkdirSync(out, { recursive: true });
const buf = ico(SIZES);
fs.writeFileSync(path.join(out, 'icon.ico'), buf);
fs.writeFileSync(path.join(out, 'icon.png'), png(512)); // macOS and Linux icon; electron-builder needs >= 512 px for macOS

// self-check: header says icon with every size, and each entry points at a PNG signature
console.assert(buf.readUInt16LE(2) === 1 && buf.readUInt16LE(4) === SIZES.length, 'bad ico header');
SIZES.forEach((_, i) => console.assert(buf.readUInt32BE(buf.readUInt32LE(6 + 16 * i + 12)) === 0x89504e47, `entry ${i} is not a PNG`));
console.log(`build/icon.ico: ${SIZES.join(', ')} px, ${buf.length} bytes`);
