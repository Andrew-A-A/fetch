// Mark A (cloud + play cut-out) rasterised in code; same geometry as the 64-unit SVG in renderer/index.html.
// Shared by main.js (window/tray icon) and scripts/make-ico.js (installer .ico).

function markPixel(x, y) { // x,y in 0..64 units → 0 transparent, 1 accent, 2 white
  const inCircle = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const cx = Math.min(Math.max(x, 16), 48), cy = Math.min(Math.max(y, 16), 48); // rounded tile, rx 14
  if (x < 2 || x > 62 || y < 2 || y > 62 || (x - cx) ** 2 + (y - cy) ** 2 > 14 * 14) return 0;
  const cloud = y <= 48 && (inCircle(47.75, 36.05, 12) || inCircle(32.85, 30.73, 17) || inCircle(18.69, 37.5, 10.5) || (x >= 18.69 && x <= 47.75 && y >= 36));
  const play = x >= 27.5 && Math.abs(y - 37) <= (41 - x) * (8 / 13.5);
  return cloud && !play ? 2 : 1;
}

// Returns n×n pixels as BGRA (Electron's createFromBitmap order), 4×4 supersampled.
function rasterize(n) {
  const ss = 4, buf = Buffer.alloc(n * n * 4), k = 64 / n;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    let a = 0, w = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const v = markPixel((px + (sx + 0.5) / ss) * k, (py + (sy + 0.5) / ss) * k);
      if (v) a++;
      if (v === 2) w++;
    }
    const i = (py * n + px) * 4, t = a ? w / a : 0; // blend accent #005FB8 → white
    buf[i] = Math.round(184 + 71 * t); buf[i + 1] = Math.round(95 + 160 * t); buf[i + 2] = Math.round(255 * t); buf[i + 3] = Math.round((255 * a) / (ss * ss));
  }
  return buf;
}

module.exports = { markPixel, rasterize };
