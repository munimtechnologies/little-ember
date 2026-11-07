// art: every image and sound of "Little Ember", made in code (no asset packs, no image or sound files in).
// Written during GDevelop BIG Game Jam #10 (theme "Keep It Alive") for MV2 of Munim, Inc.
// Made with AI agents (Anthropic Claude). Apache-2.0.
//
// Uses MV2's open-source gdwrite helpers (png.mjs, wav.mjs, pixelart.mjs, tune.mjs; Apache-2.0,
// published before the jam). Pictures are drawn at low resolution and scaled up (pixel art).
// 2026-11-07 (run 120730Z): cover moon moved off the title; the cover's fire glow is a smooth gradient.

import { encodePNG } from "./png.mjs";
import { gridPNG, outline } from "./pixelart.mjs";
import { tuneWAV, noiseWAV } from "./tune.mjs";
import { blipWAV } from "./wav.mjs";

// ---------- a tiny RGBA canvas ----------
export class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Float64Array(w * h * 4); }
  put(x, y, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !(a > 0)) return;
    a = Math.min(1, a);
    const d = this.d, i = (y * this.w + x) * 4, da = d[i + 3], oa = a + da * (1 - a);
    for (let k = 0; k < 3; k++) d[i + k] = (c[k] * a + d[i + k] * da * (1 - a)) / oa;
    d[i + 3] = oa;
  }
  rect(x, y, w, h, c, a = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, c, a); }
  disc(cx, cy, r, c, a = 1) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++)
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.put(x, y, c, a);
  }
  tri(ax, ay, bx, by, cx, cy, c, a = 1) {
    const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx));
    const y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
    const e = (px, py, qx, qy, x, y) => (qx - px) * (y - py) - (qy - py) * (x - px);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = e(bx, by, cx, cy, px, py), w1 = e(cx, cy, ax, ay, px, py), w2 = e(ax, ay, bx, by, px, py);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) this.put(x, y, c, a);
    }
  }
  line(x0, y0, x1, y1, r, c, a = 1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
    for (let k = 0; k <= n; k++) this.disc(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, r, c, a);
  }
  rgba(scale = 1) {
    const s = Math.max(1, Math.floor(scale)), W = this.w * s, H = this.h * s, out = Buffer.alloc(W * H * 4);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      const px = [Math.round(this.d[i]), Math.round(this.d[i + 1]), Math.round(this.d[i + 2]), Math.round(this.d[i + 3] * 255)];
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
        const o = ((y * s + dy) * W + x * s + dx) * 4;
        out[o] = px[0]; out[o + 1] = px[1]; out[o + 2] = px[2]; out[o + 3] = px[3];
      }
    }
    return { w: W, h: H, rgba: out };
  }
  png(scale = 1) { const { w, h, rgba } = this.rgba(scale); return encodePNG(w, h, rgba); }
}

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function grad(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let k = 1; k < stops.length; k++) {
    const [t0, c0] = stops[k - 1], [t1, c1] = stops[k];
    if (t <= t1) return mix(c0, c1, (t - t0) / Math.max(1e-9, t1 - t0));
  }
  return stops[stops.length - 1][1];
}
function sky(c, stops, y0, y1) {
  for (let y = 0; y < c.h; y++) {
    const col = grad(stops, (y - y0) / Math.max(1, y1 - y0 - 1));
    for (let x = 0; x < c.w; x++) c.put(x, y, col);
  }
}

// ---------- palette ----------
const P = {
  pine: [16, 30, 42], trunk: [44, 30, 30], snow: [200, 210, 236], mtn: [40, 46, 86], cap: [176, 184, 222],
  hill: [120, 132, 184], ground0: [210, 218, 240], ground1: [150, 162, 208], star: [232, 238, 255],
};

function pine(c, x, base, h, col = P.pine, snow = P.snow) {
  c.rect(x - 1, base - 4, 2, 4, P.trunk);
  for (let k = 0; k < 4; k++) {
    const wB = h * 0.36 * (1 - k * 0.18), yB = base - 3 - k * h * 0.2, yT = yB - h * 0.36;
    c.tri(x - wB, yB, x + wB, yB, x, yT, col);
    c.tri(x - wB * 0.32, yT + h * 0.36 * 0.32, x + wB * 0.32, yT + h * 0.36 * 0.32, x, yT, snow, 0.9);
    c.rect(Math.round(x - wB + 2), Math.round(yB - 1), Math.max(1, Math.round(wB * 0.7)), 1, snow, 0.55);
  }
}

function stars(c, n, maxY, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * c.w), y = Math.floor(r() * maxY), b = 0.35 + r() * 0.65;
    c.put(x, y, P.star, b);
    if (r() < 0.08) { c.put(x - 1, y, P.star, b * 0.5); c.put(x + 1, y, P.star, b * 0.5); c.put(x, y - 1, P.star, b * 0.5); c.put(x, y + 1, P.star, b * 0.5); }
  }
}

function moon(c, x, y, r) {
  c.disc(x, y, r * 2.2, [200, 210, 255], 0.05);
  c.disc(x, y, r * 1.5, [200, 210, 255], 0.07);
  c.disc(x, y, r, [240, 236, 214]);
  c.disc(x - r * 0.35, y - r * 0.2, r * 0.22, [214, 208, 188]);
  c.disc(x + r * 0.3, y + r * 0.35, r * 0.16, [214, 208, 188]);
  c.disc(x + r * 0.15, y - r * 0.45, r * 0.12, [220, 214, 194]);
}

function nightSky(c, horizon) {
  sky(c, [[0, [8, 12, 34]], [0.6, [24, 28, 70]], [1, [52, 50, 106]]], 0, horizon);
  stars(c, Math.round((c.w * horizon) / 520), horizon - 10, 7);
}

function land(c, ox, oy, seed = 3) {
  // ox, oy shift the 320x180 layout into a canvas of another size (the cover)
  const peaks = [[20, 40, 82], [70, 45, 70], [130, 40, 92], [200, 50, 76], [262, 45, 86], [310, 40, 72], [360, 40, 80]];
  for (const [x, hw, py] of peaks) {
    c.tri(ox + x - hw, oy + 128, ox + x + hw, oy + 128, ox + x, oy + py, P.mtn);
    const k = 0.3;
    c.tri(ox + x - hw * k, oy + py + (128 - py) * k, ox + x + hw * k, oy + py + (128 - py) * k, ox + x, oy + py, P.cap, 0.95);
  }
  for (let x = -ox; x < c.w - ox; x++) {
    const hy = 120 + 5 * Math.sin(x / 19) + 3 * Math.sin(x / 7 + 1);
    for (let y = Math.floor(oy + hy); y < c.h; y++) c.put(ox + x, y, P.hill);
  }
  const r = rng(seed);
  for (let i = 0; i < 22; i++) { const x = r() * 320; pine(c, ox + x, oy + 126 + 5 * Math.sin(x / 19), 14 + r() * 10, [30, 40, 72], [150, 160, 200]); }
  for (let x = -ox; x < c.w - ox; x++) {
    const gy = 138 + 3 * Math.sin(x / 31) + 2 * Math.sin(x / 11);
    for (let y = Math.floor(oy + gy); y < c.h; y++) c.put(ox + x, y, grad([[0, P.ground0], [1, P.ground1]], (y - oy - gy) / 42));
    c.put(ox + x, oy + gy, [236, 242, 255]);
  }
  for (let i = 0; i < 70; i++) c.put(ox + r() * 320, oy + 142 + r() * 38, [255, 255, 255], 0.5 + r() * 0.5);
  for (const [x, b, h] of [[10, 160, 74], [34, 154, 54], [56, 150, 40], [-6, 176, 90], [266, 150, 44], [290, 156, 62], [312, 162, 76], [330, 178, 92]])
    pine(c, ox + x, oy + b, h);
}

// ---------- the flame spirit ----------
export function flameRows(W = 18, H = 24, bend = 0) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    let line = "";
    for (let x = 0; x < W; x++) {
      const cx = (W - 1) / 2 + bend * Math.pow(1 - v, 2) * 4;
      const hw = v < 0.72 ? (W / 2 - 1) * Math.pow(v / 0.72, 0.75)
        : (W / 2 - 1) * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.72) / 0.28, 2) * 0.85));
      const u = Math.abs(x - cx) / Math.max(0.5, hw);
      if (u > 1 || v < 0.04) { line += "."; continue; }
      const heat = (1 - u) * 0.75 + v * 0.55;
      line += heat > 1.0 ? "h" : heat > 0.78 ? "w" : heat > 0.5 ? "y" : "o";
    }
    rows.push(line);
  }
  const pad = ".".repeat(W + 2);
  return outline([pad, ...rows.map((r) => "." + r + "."), pad], "k");
}
const FLAME_PAL = { o: [236, 88, 36], y: [255, 158, 44], w: [255, 224, 90], h: [255, 250, 210], k: [110, 30, 20] };

const FACES = {
  open: [".kk.....kk.", "kwkk...kwkk", "kkkk...kkkk", ".kk.....kk.", "...k...k...", "....kkk...."],
  sad: ["...........", ".kk.....kk.", "kwkk...kwkk", ".kk.....kk.", "....kkk....", "...k...k..."],
  blink: ["...........", "...........", "kkkk...kkkk", "...........", "...k...k...", "....kkk...."],
};
const FACE_PAL = { k: [60, 18, 18], w: [255, 255, 255] };

// ---------- 5x7 pixel font (only the letters the titles use) ----------
const FONT = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};
export function textWidth(s, k = 1) { return (s.length * 6 - 1) * k; }
// Draws text with a 1-cell dark outline; fill(row 0..1) gives the colour per glyph row.
export function drawText(c, s, x0, y0, k, fill, edge = [40, 14, 20]) {
  const W = textWidth(s, k) + 2, H = 7 * k + 2, mask = new Uint8Array(W * H);
  [...s].forEach((ch, n) => {
    const g = FONT[ch];
    if (!g) throw new Error("font: no glyph " + ch);
    for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx] === "#")
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) mask[(1 + gy * k + dy) * W + 1 + (n * 6 + gx) * k + dx] = 1;
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (mask[y * W + x]) { c.put(x0 + x - 1, y0 + y - 1, fill((y - 1) / Math.max(1, 7 * k - 1))); continue; }
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx]) { near = true; break; }
    }
    if (near) c.put(x0 + x - 1, y0 + y - 1, edge);
  }
}
const fireFill = (t) => grad([[0, [255, 246, 190]], [0.45, [255, 196, 70]], [1, [236, 84, 36]]], t);

// ---------- images ----------
export function makeImages() {
  const img = {};
  const sN = new Canvas(320, 180); nightSky(sN, 140); moon(sN, 262, 30, 10); img["sky-night.png"] = sN.png(4);

  const sD = new Canvas(320, 180);
  sky(sD, [[0, [64, 96, 160]], [0.45, [150, 130, 172]], [0.78, [246, 162, 120]], [1, [255, 216, 150]]], 0, 140);
  sD.disc(160, 128, 34, [255, 230, 170], 0.16); sD.disc(160, 128, 22, [255, 236, 180], 0.25); sD.disc(160, 128, 15, [255, 244, 200]);
  for (const [x, y, n] of [[60, 52, 5], [230, 40, 6], [120, 84, 4], [282, 92, 4]])
    for (let i = 0; i < n; i++) sD.disc(x + i * 5, y + (i % 2) * 2, 4 + (i % 3), [255, 196, 178], 0.55);
  img["sky-dawn.png"] = sD.png(4);

  const L = new Canvas(320, 180); land(L, 0, 0); img["land.png"] = L.png(4);

  const dark = new Canvas(8, 8); dark.rect(0, 0, 8, 8, [6, 8, 22]); img["dark.png"] = dark.png(1);

  const glow = new Canvas(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const r = Math.hypot(x + 0.5 - 128, y + 0.5 - 128) / 128;
    if (r < 1) glow.put(x, y, [255, 164, 72], 0.5 * (1 - r) * (1 - r));
  }
  img["glow.png"] = glow.png(1);

  const hearth = new Canvas(40, 12);
  hearth.rect(13, 5, 14, 4, [255, 120, 40], 0.55);
  hearth.line(7, 9, 33, 3, 1.6, [104, 64, 36]);
  hearth.line(7, 3, 33, 9, 1.6, [126, 80, 46]);
  for (const [x, y] of [[7, 9], [33, 3], [7, 3], [33, 9]]) { hearth.disc(x, y, 1.7, [196, 150, 96]); hearth.put(x, y, [140, 96, 60]); }
  [3, 9, 15, 21, 27, 33, 38].forEach((x, i) => { hearth.disc(x, 10, 2.3, i % 2 ? [96, 100, 118] : [124, 128, 146]); hearth.put(x - 1, 9, [170, 176, 196]); });
  img["hearth.png"] = hearth.png(4);

  img["flame-a.png"] = gridPNG(flameRows(18, 24, 0.7), FLAME_PAL, { scale: 5 });
  img["flame-b.png"] = gridPNG(flameRows(18, 24, -0.7), FLAME_PAL, { scale: 5 });
  img["face.png"] = gridPNG(FACES.open, FACE_PAL, { scale: 5 });
  img["face-sad.png"] = gridPNG(FACES.sad, FACE_PAL, { scale: 5 });
  img["face-blink.png"] = gridPNG(FACES.blink, FACE_PAL, { scale: 5 });

  const flake = ["....w....", ".w..w..w.", "..w.w.w..", "...www...", "wwwwbwwww", "...www...", "..w.w.w..", ".w..w..w.", "....w...."];
  const fp = [".".repeat(11), ...flake.map((r) => "." + r + "."), ".".repeat(11)];
  img["snow.png"] = gridPNG(outline(fp, "n"), { w: [240, 246, 255], b: [150, 190, 255], n: [60, 92, 158] }, { scale: 4 });

  const clump = new Canvas(14, 14);
  clump.disc(7, 7, 6.9, [64, 84, 138]); clump.disc(7, 7, 6.0, [150, 170, 216]); clump.disc(6.4, 6.3, 5.0, [214, 226, 250]);
  clump.disc(5, 5, 2.4, [250, 252, 255]); clump.put(9, 9, [150, 170, 216]); clump.put(4, 9, [180, 196, 236]);
  img["clump.png"] = clump.png(4);

  const gust = new Canvas(44, 12);
  for (let s = 0; s < 3; s++) for (let x = 0; x < 44; x++) {
    const y = 6 + (s - 1) * 3 + 2 * Math.sin(x / 4 + s * 1.7);
    gust.put(x, y, [235, 242, 255], 0.8 * Math.sin((Math.PI * (x + 0.5)) / 44) * (s === 1 ? 1 : 0.7));
  }
  for (let k = 0; k < 10; k++) { const a = (k / 10) * 5; gust.put(37 + 3 * Math.cos(a), 5 + 3 * Math.sin(a), [255, 255, 255], 0.8); }
  img["gust.png"] = gust.png(4);

  const twig = new Canvas(16, 6);
  twig.rect(1, 2, 14, 2, [126, 82, 46]); twig.rect(1, 3, 14, 1, [86, 54, 30]); twig.put(0, 2, [86, 54, 30]); twig.put(15, 3, [86, 54, 30]);
  twig.put(10, 1, [126, 82, 46]); twig.put(11, 0, [126, 82, 46]); twig.rect(3, 1, 4, 1, [236, 242, 255]); twig.rect(12, 1, 2, 1, [236, 242, 255]);
  img["twig.png"] = twig.png(4);

  const cone = new Canvas(9, 12);
  cone.disc(4.5, 6.5, 4.3, [92, 54, 30]); cone.disc(4.5, 5, 3.9, [112, 68, 38]);
  for (let y = 3; y < 11; y += 2) for (let x = 2 + (y % 4 === 1 ? 1 : 0); x < 8; x += 2) cone.put(x, y, [170, 108, 56]);
  cone.rect(4, 0, 1, 2, [70, 44, 24]); cone.rect(3, 1, 3, 1, [236, 242, 255]);
  img["cone.png"] = cone.png(4);

  const spark = new Canvas(2, 2); spark.rect(0, 0, 2, 2, [255, 214, 110]); spark.put(0, 0, [255, 248, 210]); img["spark.png"] = spark.png(3);
  const puff = new Canvas(4, 4); puff.disc(2, 2, 2, [244, 248, 255]); img["puff.png"] = puff.png(3);

  const barBack = new Canvas(82, 7); barBack.rect(0, 0, 82, 7, [240, 222, 200]); barBack.rect(1, 1, 80, 5, [24, 18, 34]); img["bar-back.png"] = barBack.png(4);
  const barFill = new Canvas(1, 5);
  for (let y = 0; y < 5; y++) barFill.put(0, y, grad([[0, [255, 236, 130]], [1, [240, 92, 32]]], y / 4));
  img["bar-fill.png"] = barFill.png(4);

  const eyes = new Canvas(9, 2); eyes.rect(0, 0, 2, 2, [255, 214, 80]); eyes.rect(7, 0, 2, 2, [255, 214, 80]); eyes.put(0, 0, [255, 250, 200]); eyes.put(7, 0, [255, 250, 200]);
  img["eyes.png"] = eyes.png(4);

  const title = new Canvas(textWidth("LITTLE EMBER") + 4, 11);
  drawText(title, "LITTLE EMBER", 2, 2, 1, fireFill);
  img["title.png"] = title.png(8);
  return img;
}

// itch.io cover, 630x498 (drawn at 210x166, scaled 3x)
export function makeCover() {
  const c = new Canvas(210, 166);
  sky(c, [[0, [8, 12, 34]], [0.55, [26, 30, 74]], [1, [92, 66, 118]]], 0, 120);
  stars(c, 70, 100, 11);
  moon(c, 16, 16, 7); // top-left corner, clear of the title (title spans x 33-177)
  land(c, -55, -24, 5);
  const fx = 105, fy = 136;
  // smooth warm glow around the fire (one soft gradient, no visible rings)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const d = Math.hypot(x + 0.5 - fx, y + 0.5 - (fy - 12)) / 66;
    if (d < 1) c.put(x, y, [255, 164, 72], 0.34 * (1 - d) * (1 - d));
  }
  const rows = flameRows(18, 24, 0.5);
  const fw = rows[0].length, fh = rows.length;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") c.put(fx - fw / 2 + x, fy - fh + y + 2, FLAME_PAL[ch]); }));
  FACES.open.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== ".") c.put(fx - 5.5 + x, fy - 10 + y, FACE_PAL[ch]); }));
  c.line(fx - 13, fy + 4, fx + 13, fy - 1, 1.3, [104, 64, 36]); c.line(fx - 13, fy - 1, fx + 13, fy + 4, 1.3, [126, 80, 46]);
  [-15, -9, -3, 3, 9, 15].forEach((dx, i) => c.disc(fx + dx, fy + 5, 1.8, i % 2 ? [96, 100, 118] : [124, 128, 146]));
  const r = rng(21);
  for (let i = 0; i < 14; i++) {
    const x = 10 + r() * 190, y = 50 + r() * 70;
    if (Math.abs(x - fx) < 24 && y > 90) continue;
    c.put(x, y, [240, 246, 255]); c.put(x - 1, y, [200, 220, 255], 0.7); c.put(x + 1, y, [200, 220, 255], 0.7); c.put(x, y - 1, [200, 220, 255], 0.7); c.put(x, y + 1, [200, 220, 255], 0.7);
  }
  for (let i = 0; i < 12; i++) c.put(fx - 10 + r() * 20, fy - 30 - r() * 22, [255, 214, 110], 0.9);
  drawText(c, "LITTLE EMBER", Math.round((210 - textWidth("LITTLE EMBER", 2)) / 2), 10, 2, fireFill);
  const white = () => [236, 240, 255];
  drawText(c, "KEEP IT ALIVE", Math.round((210 - textWidth("KEEP IT ALIVE")) / 2), 32, 1, white, [20, 18, 40]);
  drawText(c, "TILL DAWN", Math.round((210 - textWidth("TILL DAWN")) / 2), 42, 1, white, [20, 18, 40]);
  return c.png(3);
}

// ---------- sounds ----------
export function makeSounds() {
  const s = {};
  // night: a slow lullaby waltz in A minor (8 bars of 3/4)
  const mel = [[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 1], [72, 1], [74, 1], [76, 3],
    [77, 1], [76, 1], [74, 1], [72, 2], [69, 1], [71, 1], [68, 1], [71, 1], [69, 3]];
  const roots = [45, 38, 43, 48, 38, 45, 40, 45];
  const chord = [[60, 64], [65, 69], [59, 62], [64, 67], [65, 69], [60, 64], [56, 59], [60, 64]];
  s["night.wav"] = tuneWAV({ bpm: 84, voices: [
    { notes: mel, wave: "triangle", volume: 0.2 },
    { notes: roots.map((m) => [m, 3]), wave: "sine", volume: 0.26 },
    { notes: chord.flatMap(([a, b]) => [[null, 1], [a, 1], [b, 1]]), wave: "sine", volume: 0.09 },
  ] });
  // storm: the same tune, faster, over a driving bass
  const smel = [[76, 1], [74, 0.5], [72, 0.5], [71, 1], [72, 1], [69, 2], [null, 1], [64, 1], [71, 1], [72, 0.5], [74, 0.5], [76, 1], [79, 1],
    [76, 3], [null, 1], [77, 1], [76, 0.5], [74, 0.5], [72, 1], [74, 1], [76, 1], [72, 1], [69, 2], [71, 1], [68, 1], [71, 1], [76, 1], [69, 3], [null, 1]];
  const sbass = [45, 41, 43, 40, 38, 45, 40, 45].flatMap((m) => Array(8).fill([m, 0.5]));
  s["storm.wav"] = tuneWAV({ bpm: 120, voices: [
    { notes: smel, wave: "triangle", volume: 0.18 },
    { notes: sbass, wave: "square", volume: 0.07 },
    { notes: [45, 41, 43, 40, 38, 45, 40, 45].map((m) => [m - 12 + 12, 4]), wave: "sine", volume: 0.18 },
  ] });
  s["dawn.wav"] = tuneWAV({ bpm: 100, voices: [
    { notes: [[72, 0.5], [76, 0.5], [79, 0.5], [84, 2.5]], wave: "triangle", volume: 0.3 },
    { notes: [[48, 4]], wave: "sine", volume: 0.3 },
    { notes: [[null, 1.5], [67, 2.5]], wave: "sine", volume: 0.15 },
  ] });
  s["out.wav"] = tuneWAV({ bpm: 90, voices: [{ notes: [[64, 1], [63, 1], [62, 1], [61, 2]], wave: "sine", volume: 0.35 }] });
  s["pop.wav"] = blipWAV({ f0: 900, f1: 1500, ms: 80, volume: 0.35 });
  s["hiss.wav"] = noiseWAV({ ms: 360, volume: 0.32, smooth: 0.15, seed: 5 });
  s["crackle.wav"] = noiseWAV({ ms: 140, volume: 0.5, smooth: 0.0, seed: 7 });
  s["throw.wav"] = blipWAV({ f0: 300, f1: 760, ms: 150, volume: 0.18, wave: "square" });
  s["thud.wav"] = blipWAV({ f0: 220, f1: 110, ms: 120, volume: 0.4 });
  s["gust.wav"] = noiseWAV({ ms: 900, volume: 0.35, smooth: 0.9, seed: 3 });
  s["growl.wav"] = blipWAV({ f0: 96, f1: 70, ms: 650, volume: 0.22, wave: "square" });
  return s;
}
