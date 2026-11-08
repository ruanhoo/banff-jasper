// Cartoon sprites for the living Banff & Jasper map.
// Everything draws around (0,0) = the object's footprint on the ground, y negative = up.
window.BJ_SPRITES = function (R) {
  'use strict';
  const g = R.g;
  const TAU = Math.PI * 2;
  const INK = '#2d2a32';
  const FONT = "Fredoka, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";
  const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
  const W = window.BJ_WORLD;

  /* ---------- colour + path helpers ---------- */
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const memo = new Map();
  function shade(c, t) {
    const key = c + '|' + t; let v = memo.get(key);
    if (!v) { const A = hex2rgb(c); const target = t < 0 ? 0 : 255; const a = Math.abs(t); v = `rgb(${A.map((x) => Math.round(x + (target - x) * a)).join(',')})`; memo.set(key, v); }
    return v;
  }
  const mix = (a, b, t) => { const A = hex2rgb(a); const B = hex2rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; };
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function box(x, y, w, h, c, r) { rr(x, y, w, h, r || 0); g.fillStyle = c; g.fill(); g.stroke(); }
  function poly(pts, c) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); g.stroke(); }
  function ell(x, y, rx, ry, c, stroke) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = c; g.fill(); if (stroke) g.stroke(); }
  function emoji(ch, x, y, size) { g.font = `${size}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(ch, x, y); }
  const snowy = () => R.sea.snow > 0.7;
  const winter = () => R.sea.bare > 0.5;
  let cX = 0; let cY = 0; let cK = 1;
  function light(lx, ly, r, col) { R.litList.push([cX + lx * cK, cY + ly * cK, r * cK, col]); }
  // run fn in local coordinates around screen point (X,Y) with scale k
  function at(X, Y, k, fn, a, b, c) {
    cX = X; cY = Y; cK = k;
    g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.min(3, Math.max(1.3, 2.2 * k)) / k; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
    fn(a, b, c); g.restore();
  }

  /* ---------- mountains ---------- */
  function ridgeFor(pk) {
    const r = W.rng(pk.seed * 7 + 3); const n = 8; const s = (r() - 0.5) * 0.22; const pts = [[-0.5, 0]];
    for (let i = 1; i < n * 2; i++) {
      const x = -0.5 + i / (n * 2); let p = 1 - Math.abs(x - s) / (x < s ? 0.5 + s : 0.5 - s); p = Math.pow(Math.max(0, p), 0.85);
      pts.push([x, -p * (i % 2 ? 1 : 0.84) * (0.86 + r() * 0.2)]);
    }
    pts.push([0.5, 0]); pts.push([s, -1]); pts.sort((a, b) => a[0] - b[0]);
    pk.ridge = pts; pk.s = s; pk.warm = r() < 0.38; pk.snowV = r() * 0.12;
  }
  const ROCK = { cool: '#8b9dbd', warm: '#a49a8f' };
  function peakBody(pk, X, Y, k) {
    if (!pk.ridge) ridgeFor(pk);
    const w = pk.w; const h = pk.h; const R_ = pk.ridge; const s = pk.s;
    const base = pk.warm ? ROCK.warm : ROCK.cool;
    const rock = mix(base, '#cfdcf0', pk.far * 0.55);
    const glow = R.env.glow;
    const tiny = w * k < 24 || k < 0.3;
    g.save(); g.translate(X, Y); g.scale(k, k);
    g.lineWidth = Math.min(3, Math.max(1.3, 2.2 * k)) / k; g.strokeStyle = INK; g.lineJoin = 'round';
    g.beginPath(); R_.forEach((p, i) => (i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h))); g.closePath();
    g.fillStyle = rock; g.fill();
    if (!tiny) {
      g.save(); g.clip();
      const snowFrac = 0.52 - R.sea.snow * 0.34 + pk.snowV - (pk.named ? 0.08 : 0) - (1 - R.sea.warm) * 0.04;
      const sy0 = -snowFrac * h; const zig = h * 0.06; const step = w / 9;
      g.beginPath(); g.moveTo(-w * 0.6, -h * 1.3); g.lineTo(w * 0.6, -h * 1.3); g.lineTo(w * 0.6, sy0);
      for (let x = w * 0.6, i = 0; x > -w * 0.6; x -= step, i++) { g.lineTo(x - step / 2, sy0 + (i % 2 ? -zig : zig)); }
      g.closePath(); g.fillStyle = '#ffffff'; g.fill();
      if (glow > 0.05) { // alpenglow on the sun-facing side
        g.beginPath(); R_.filter((p) => p[0] <= s).forEach((p, i) => (i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h))); g.lineTo(s * w, 0); g.closePath();
        g.fillStyle = `rgba(255,120,100,${0.5 * glow})`; g.fill();
      }
      // shadow face
      g.beginPath(); g.moveTo(s * w, -h); R_.filter((p) => p[0] > s).forEach((p) => g.lineTo(p[0] * w, p[1] * h)); g.lineTo(s * w + w * 0.12, 0); g.lineTo(s * w + w * 0.03, -h * 0.5); g.closePath();
      g.fillStyle = 'rgba(52,64,110,.32)'; g.fill();
      // a couple of rock cracks
      g.lineWidth = 1 / k; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(s * w + w * 0.02, -h * 0.82); g.lineTo(s * w + w * 0.08, -h * 0.4); g.moveTo(s * w - w * 0.06, -h * 0.7); g.lineTo(s * w - w * 0.13, -h * 0.28); g.stroke(); g.globalAlpha = 1;
      g.restore();
    }
    if (tiny && w * k >= 10 && R.sea.snow + 0.6 > 0.5) { g.beginPath(); g.moveTo(s * w, -h); g.lineTo(s * w + w * 0.16, -h * 0.62); g.lineTo(s * w - w * 0.16, -h * 0.62); g.closePath(); g.fillStyle = '#fff'; g.fill(); }
    g.beginPath(); R_.forEach((p, i) => (i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h))); g.closePath(); g.stroke();
    g.restore();
  }

  /* ---------- trees ---------- */
  function tree(X, Y, k, tr) {
    const s = tr.s * k; if (s < 0.05) return;
    g.save(); g.translate(X, Y); g.scale(s, s);
    g.lineWidth = Math.min(2.4, Math.max(1.2, 2 * s)) / s; g.strokeStyle = INK; g.lineJoin = 'round';
    const se = R.season; const bare = R.sea.bare; const warm = R.sea.warm;
    if (tr.t === 1) { // aspen
      g.fillStyle = '#efe8d8'; g.fillRect(-1.6, -22, 3.2, 22); g.strokeRect(-1.6, -22, 3.2, 22);
      if (bare > 0.6) { g.beginPath(); g.moveTo(0, -18); g.lineTo(-8, -30); g.moveTo(0, -14); g.lineTo(8, -27); g.moveTo(0, -22); g.lineTo(2, -34); g.stroke(); }
      else {
        const c = se === 'autumn' ? (tr.v ? '#f5c33c' : '#f2a93b') : se === 'spring' ? '#a9e38a' : (tr.v ? '#6cbf5a' : '#5aae55');
        ell(0, -30, 11, 12, c, true); if (s * 11 > 5) ell(-3, -34, 3.5, 4, shade(c, 0.35));
      }
    } else if (tr.t === 2) { // larch: golden in autumn, bare in winter
      g.fillStyle = '#6b4b32'; g.fillRect(-1.6, -8, 3.2, 8);
      const c = se === 'autumn' ? '#f2a93b' : se === 'winter' ? '#8b7a68' : se === 'spring' ? '#b8e08c' : '#4a9a5a';
      for (let i = 0; i < 3; i++) { const y = -8 - i * 10; poly([[-10 + i * 2.6, y], [10 - i * 2.6, y], [0, y - 15]], i % 2 ? shade(c, 0.12) : c); }
    } else { // pine
      g.fillStyle = '#6b4b32'; g.fillRect(-1.8, -8, 3.6, 8);
      const base = tr.v ? '#2f7d5b' : '#276b4e'; const c = se === 'spring' ? mix(base, '#7fcf8a', 0.25) : base;
      for (let i = 0; i < 3; i++) {
        const y = -6 - i * 11; const wd = 12 - i * 2.6;
        poly([[-wd, y], [wd, y], [0, y - 17]], i % 2 ? shade(c, 0.1) : c);
        if (snowy() && s > 0.45) { g.beginPath(); g.moveTo(0, y - 17); g.lineTo(wd * 0.5, y - 8.5); g.lineTo(-wd * 0.5, y - 8.5); g.closePath(); g.fillStyle = '#fff'; g.fill(); }
      }
    }
    g.restore();
  }
  function treeLite(X, Y, k, tr) { // zoomed-out: one coloured blob
    const s = tr.s * k; if (s < 0.02) return;
    const se = R.season;
    g.fillStyle = tr.t === 2 && se === 'autumn' ? '#f2a93b' : tr.t === 1 ? (se === 'autumn' ? '#f2c13c' : se === 'winter' ? '#d7e3dc' : '#6cbf5a') : (snowy() ? '#a5c5b3' : '#2f7d5b');
    g.beginPath(); g.moveTo(X - 9 * s, Y); g.lineTo(X + 9 * s, Y); g.lineTo(X, Y - 34 * s); g.closePath(); g.fill();
  }

  /* ---------- little building blocks ---------- */
  function chalet(x, y, w, h, wall, roof, night, rooftop) {
    ell(x + 3, y + 1, w * 0.62, 4, 'rgba(0,0,0,.16)');
    box(x - w / 2, y - h, w, h, wall);
    poly([[x - w / 2 - 4, y - h + 1], [x + w / 2 + 4, y - h + 1], [x + 3, y - h - w * 0.5], [x - 3, y - h - w * 0.5]], roof);
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 3, y - h - w * 0.5); g.lineTo(x + 3, y - h - w * 0.5); g.lineTo(x + w * 0.3, y - h - w * 0.2); g.lineTo(x - w * 0.3, y - h - w * 0.2); g.closePath(); g.fill(); }
    box(x - 3, y - h * 0.55, 6, h * 0.55, '#7a5436', 1);
    const win = night > 0.2 ? '#ffd873' : '#bfe3f5';
    box(x - w / 2 + 3, y - h * 0.72, 5, 5, win, 1); box(x + w / 2 - 8, y - h * 0.72, 5, 5, win, 1);
    if (night > 0.2) light(x, y - h * 0.5, 22, '255,200,110');
    if (rooftop) { box(x + w / 4, y - h - w * 0.5 - 4, 4, 9, '#7d5a43'); }
  }
  function smoke(x, y) {
    g.save(); g.globalAlpha = 0.65;
    for (let i = 0; i < 3; i++) { const f = ((R.t * 0.5 + i / 3) % 1); ell(x + Math.sin(f * 5 + i) * 4, y - f * 26, 3 + f * 5, 2.5 + f * 3, '#ffffff'); }
    g.restore();
  }
  function steam(x, y, n, sc) {
    g.save(); for (let i = 0; i < (n || 3); i++) { const f = ((R.t * 0.4 + i / (n || 3)) % 1); g.globalAlpha = 0.7 * (1 - f); ell(x + Math.sin(f * 6 + i * 2) * 5 * (sc || 1), y - f * 30 * (sc || 1), (4 + f * 7) * (sc || 1), (3 + f * 4) * (sc || 1), '#ffffff'); } g.restore();
  }
  function redChair(x, y) { box(x - 5, y - 8, 10, 4, '#d9482f', 1.5); box(x - 5, y - 14, 10, 6, '#d9482f', 1.5); g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x - 4, y); g.moveTo(x + 4, y - 4); g.lineTo(x + 4, y); g.stroke(); }
  function flag(x, y, c) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 24); g.stroke(); const w = Math.sin(R.t * 4 + x) * 2; poly([[x, y - 24], [x + 14, y - 21 + w], [x, y - 16]], c); }
  function rockMound(x, y, w, h, c) {
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.8, y - h, x - w * 0.2, y - h * 1.05); g.quadraticCurveTo(x + w * 0.5, y - h * 1.1, x + w, y); g.closePath();
    g.fillStyle = c || '#a8aab5'; g.fill(); g.stroke();
    g.save(); g.globalAlpha = 0.25; g.beginPath(); g.moveTo(x + w * 0.1, y - h); g.quadraticCurveTo(x + w * 0.5, y - h * 0.9, x + w, y); g.lineTo(x + w * 0.3, y); g.closePath(); g.fillStyle = '#2d2a32'; g.fill(); g.restore();
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - w * 0.35, y - h * 0.82); g.quadraticCurveTo(x - w * 0.2, y - h * 1.08, x + w * 0.1, y - h * 1.08); g.quadraticCurveTo(x + w * 0.4, y - h * 0.95, x + w * 0.5, y - h * 0.7); g.lineTo(x, y - h * 0.8); g.closePath(); g.fill(); }
  }
  function sign(x, y, ch) { box(x - 1.5, y - 20, 3, 20, '#7a5436'); box(x - 10, y - 32, 20, 14, '#fff1d6', 3); emoji(ch, x, y - 25, 11); }

  /* ---------- place kinds ---------- */
  const WALLS = ['#fff1d6', '#ffe9c9', '#fde2e4', '#e3f4ec', '#e6f1fb', '#fff6c9'];
  const ROOFS = ['#d9482f', '#8a5a3b', '#3f7a6a', '#b04a3a', '#5a6f9a'];
  const K = {};

  K.town = (b, night) => {
    const big = b.p.id === 'banffave' || b.p.id === 'jasper';
    const spots = [[-46, 8, 26, 17], [-14, 16, 28, 19], [20, 8, 26, 17], [50, 16, 24, 15], [-30, -12, 24, 15], [8, -14, 26, 17], [40, -10, 22, 14]];
    spots.slice(0, big ? 7 : 3).forEach((s, i) => chalet(s[0], s[1], s[2], s[3], WALLS[(i + b.n) % WALLS.length], ROOFS[(i * 2 + b.n) % ROOFS.length], night, i === 2));
    if (big) {
      // clock tower on the main street
      box(-4, -50, 8, 40, '#8a5a3b', 1.5); poly([[-8, -50], [8, -50], [0, -64]], '#d9482f');
      ell(0, -42, 4.5, 4.5, '#fffdf6', true); g.beginPath(); g.moveTo(0, -42); g.lineTo(Math.cos(R.t * 0.6) * 3.5, -42 + Math.sin(R.t * 0.6) * 3.5); g.stroke();
      if (night > 0.2) light(0, -42, 28, '255,230,160');
      smoke(-22, -34);
    }
  };
  K.castle = (b, night) => {
    const chat = b.p.id === 'chateau'; const wall = chat ? '#efe6d2' : '#d8cdb6'; const roof = chat ? '#7fa8a0' : '#3f9b82';
    ell(8, 3, 70, 9, 'rgba(0,0,0,.2)');
    box(-62, -30, 124, 30, wall);
    poly([[62, 0], [72, -6], [72, -36], [62, -30]], shade(wall, -0.2));
    poly([[-66, -30], [66, -30], [52, -48], [-52, -48]], roof);
    [[-44, -1], [0, 0], [44, 1]].forEach(([x], i) => {
      box(x - 14, -62, 28, 34, shade(wall, i === 1 ? 0.05 : 0), 1);
      poly([[x - 17, -60], [x + 17, -60], [x, -92 - (i === 1 ? 10 : 0)]], roof);
      if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, -92 - (i === 1 ? 10 : 0)); g.lineTo(x + 8, -76); g.lineTo(x - 8, -76); g.closePath(); g.fill(); }
      box(x - 4, -52, 8, 12, night > 0.2 ? '#ffd873' : '#bfe3f5', 3);
    });
    for (let x = -54; x <= 54; x += 14) box(x - 3, -24, 6, 8, night > 0.2 ? '#ffd873' : '#bfe3f5', 1.5);
    box(-6, -14, 12, 14, '#5b4a3c', 3);
    g.beginPath(); g.moveTo(0, -102); g.lineTo(0, -116); g.stroke(); poly([[0, -116], [12, -112], [0, -108]], '#d9482f');
    if (night > 0.2) { light(0, -30, 70, '255,200,110'); light(-44, -46, 28, '255,200,110'); light(44, -46, 28, '255,200,110'); }
    if (chat) { redChair(-84, 4); redChair(-72, 8); }
  };
  K.lodge = (b, night) => {
    const jpl = b.p.id === 'jpl'; const s = jpl ? 1.3 : 1;
    ell(6, 3, 52 * s, 8, 'rgba(0,0,0,.2)');
    const logs = '#a8714a';
    box(-40 * s, -26, 80 * s, 26, logs);
    for (let y = -22; y < 0; y += 6) { g.save(); g.globalAlpha = 0.35; g.beginPath(); g.moveTo(-40 * s, y); g.lineTo(40 * s, y); g.stroke(); g.restore(); }
    poly([[-46 * s, -26], [46 * s, -26], [30 * s, -52], [-30 * s, -52]], '#b0392b');
    if (jpl) { box(-62, -20, 24, 20, logs); poly([[-68, -20], [-32, -20], [-42, -38], [-58, -38]], '#b0392b'); }
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-30 * s, -52); g.lineTo(30 * s, -52); g.lineTo(37 * s, -42); g.lineTo(-37 * s, -42); g.closePath(); g.fill(); }
    box(-6, -18, 12, 18, '#6a4128', 2);
    [-26, 20].forEach((x) => box(x * s, -20, 10, 10, night > 0.2 ? '#ffd873' : '#bfe3f5', 2));
    box(24 * s, -62, 8, 16, '#8a8f98'); smoke(28 * s, -62);
    if (night > 0.2) light(0, -16, 55 * s, '255,190,90');
    redChair(52 * s, 6);
  };
  K.lift = (b, night) => { // gondola: base station + cable up the hill with cabins
    ell(6, 3, 40, 7, 'rgba(0,0,0,.2)');
    box(-28, -26, 56, 26, '#c6cbd6'); poly([[-32, -26], [32, -26], [20, -40], [-20, -40]], '#d9482f'); box(-8, -14, 16, 14, '#4a5568', 2);
    const tx = 120; const ty = -150;
    g.save(); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, -34); g.lineTo(tx, ty); g.stroke(); g.restore();
    [[0.4]].forEach(([f]) => { const px = tx * f; const py = -34 + (ty + 34) * f; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 40 * (1 - f * 0.4)); g.stroke(); box(px - 3, py - 3, 6, 5, '#d9482f'); });
    box(tx - 14, ty - 8, 28, 20, '#c6cbd6'); poly([[tx - 18, ty - 8], [tx + 18, ty - 8], [tx + 8, ty - 22], [tx - 8, ty - 22]], '#d9482f');
    for (let i = 0; i < 3; i++) {
      const f = (R.t * 0.04 + i / 3) % 1; const cx = tx * f; const cy = -34 + (ty + 34) * f;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 6); g.stroke(); box(cx - 6, cy + 5, 12, 11, i % 2 ? '#ffc93c' : '#e8503a', 3); box(cx - 4, cy + 7, 8, 4, '#cfeaff', 1);
    }
    if (night > 0.2) light(0, -20, 40, '255,200,110');
  };
  K.chair = (b, night) => { // ski chairlift
    ell(4, 3, 32, 6, 'rgba(0,0,0,.2)');
    box(-24, -20, 48, 20, '#a8714a'); poly([[-28, -20], [28, -20], [18, -34], [-18, -34]], '#3f7a6a');
    const tx = 110; const ty = -120;
    g.beginPath(); g.moveTo(0, -30); g.lineTo(tx, ty); g.stroke();
    [0.35, 0.7].forEach((f) => { const px = tx * f; const py = -30 + (ty + 30) * f; g.beginPath(); g.moveTo(px, py - 8); g.lineTo(px, py + 26); g.stroke(); box(px - 5, py - 9, 10, 3, '#8a8f98'); });
    for (let i = 0; i < 4; i++) { const f = (R.t * 0.05 + i / 4) % 1; const cx = tx * f; const cy = -30 + (ty + 30) * f; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 8); g.stroke(); box(cx - 4, cy + 7, 8, 4, '#e8503a', 1.5); }
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(tx * 0.5, -30 + (ty + 30) * 0.5 + 34, 40, 8, -0.4, 0, TAU); g.fill(); }
    if (night > 0.2) light(0, -16, 32, '255,200,110');
  };
  K.spring = (b, night) => {
    ell(0, 0, 44, 20, '#cdb89a', true); ell(0, -2, 34, 14, winter() ? '#d7f2f6' : '#7fe0e0', true);
    g.save(); g.globalAlpha = 0.6; g.beginPath(); g.ellipse(-8, -3, 12, 4, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.restore();
    [[-12, -3], [4, -1], [16, -4]].forEach(([x, y], i) => { ell(x, y - 3, 4.5, 4.5, ['#ffdcb8', '#e8b48a', '#ffdcb8'][i], true); });
    steam(-10, -6, 3, 1); steam(14, -6, 3, 0.9);
    if (b.p.id === 'upperhot' || b.p.id === 'radium') { box(34, -22, 20, 22, '#a8714a'); poly([[30, -22], [58, -22], [44, -34]], '#8a5a3b'); }
    if (night > 0.2) light(0, -4, 44, '120,230,230');
  };
  K.cave = (b, night) => {
    rockMound(0, 0, 50, 46, '#9a9db0'); g.beginPath(); g.ellipse(2, -8, 16, 14, 0, Math.PI, TAU); g.fillStyle = '#2b2b3a'; g.fill(); g.stroke();
    ell(2, -2, 14, 5, '#7fe0e0', true); steam(2, -14, 4, 1.1);
  };
  K.hoodoo = () => {
    ell(0, 2, 48, 8, 'rgba(0,0,0,.18)');
    [[-34, 56], [-14, 74], [8, 62], [28, 82], [46, 50]].forEach(([x, h], i) => {
      g.beginPath(); g.moveTo(x - 8, 0); g.lineTo(x - 5, -h + 10); g.lineTo(x + 5, -h + 10); g.lineTo(x + 8, 0); g.closePath(); g.fillStyle = i % 2 ? '#c5a47c' : '#bf9a70'; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(x, -h + 7, 11, 7, 0, 0, TAU); g.fillStyle = '#8a7f74'; g.fill(); g.stroke();
    });
  };
  K.rail = () => { // spiral tunnels
    rockMound(0, 0, 52, 52, '#9aa38f');
    for (let i = 0; i < 3; i++) { g.save(); g.globalAlpha = 0.9; g.beginPath(); g.ellipse(0, -10 - i * 11, 36 - i * 6, 8, 0, 0, TAU); g.strokeStyle = '#4a4a55'; g.lineWidth = 3; g.setLineDash([5, 3]); g.stroke(); g.restore(); }
    [[-20, -10], [16, -32]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 8, 7, 0, Math.PI, TAU); g.fillStyle = '#1f1f28'; g.fill(); g.stroke(); });
    const f = (R.t * 0.2) % 1; ell(-26 + f * 40, -12 - f * 22, 7, 3.5, '#d9482f', true);
  };
  K.station = (b, night) => {
    ell(6, 3, 60, 8, 'rgba(0,0,0,.2)');
    box(-54, -4, 108, 6, '#cfd3da');
    box(-44, -28, 88, 24, '#d9c7a1'); poly([[-50, -28], [50, -28], [40, -46], [-40, -46]], '#b0392b');
    for (let x = -34; x <= 34; x += 17) box(x - 4, -20, 8, 12, night > 0.2 ? '#ffd873' : '#bfe3f5', 2);
    box(-8, -64, 16, 18, '#d9c7a1'); ell(0, -56, 5, 5, '#fffdf6', true); poly([[-10, -64], [10, -64], [0, -76]], '#b0392b');
    // a silver passenger train waiting on the platform
    box(-50, 14, 100, 12, '#dfe3ea', 3); box(-46, 17, 14, 5, '#7ccbf5', 1); box(-26, 17, 14, 5, '#7ccbf5', 1); box(-6, 17, 14, 5, '#7ccbf5', 1); box(14, 17, 14, 5, '#7ccbf5', 1);
    box(-52, 24, 104, 3, '#2d5fa8');
    if (night > 0.2) light(0, -20, 60, '255,200,110');
  };
  K.dome = (b, night) => {
    ell(4, 2, 34, 7, 'rgba(0,0,0,.2)');
    box(-24, -20, 48, 20, '#dfe7f0'); g.beginPath(); g.ellipse(0, -20, 22, 24, 0, Math.PI, TAU); g.fillStyle = '#eef3f8'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -44); g.lineTo(0, -20); g.stroke(); box(-3, -44, 6, 26, night > 0.2 ? '#101a40' : '#8aa0c8');
    if (night > 0.2) { g.save(); g.globalAlpha = Math.min(1, night); for (let i = 0; i < 5; i++) { emoji('✨', -30 + i * 15, -60 - (i % 2) * 14, 9); } g.restore(); }
    // telescope on a tripod
    g.beginPath(); g.moveTo(36, 0); g.lineTo(42, -14); g.lineTo(48, 0); g.stroke(); g.save(); g.translate(42, -14); g.rotate(-0.7); box(-3, -14, 6, 16, '#e8503a', 2); g.restore();
  };
  K.center = (b, night) => { // Columbia Icefield Centre
    ell(8, 3, 84, 10, 'rgba(0,0,0,.2)');
    box(-70, -26, 140, 26, '#d8d2c4');
    poly([[-76, -26], [76, -26], [60, -50], [-60, -50]], '#5a6f9a');
    for (let x = -60; x <= 56; x += 14) box(x, -22, 10, 16, night > 0.2 ? '#ffd873' : '#bfe3f5', 1.5);
    box(-12, -16, 24, 16, '#4a5568', 2);
    [-58, 58].forEach((x, i) => flag(x, -48, i ? '#d9482f' : '#fff'));
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-60, -50); g.lineTo(60, -50); g.lineTo(66, -42); g.lineTo(-66, -42); g.closePath(); g.fill(); }
    if (night > 0.2) light(0, -20, 90, '255,200,110');
  };
  K.ice = () => { // Ice Explorer stands on a patch of ice (the moving bus is a vehicle)
    ell(0, 0, 70, 26, '#e6f7ff', true); g.save(); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-30, -4); g.lineTo(-6, 4); g.moveTo(12, -8); g.lineTo(34, 2); g.stroke(); g.restore();
    sign(-50, 10, '🧊');
  };
  K.skywalk = (b, night) => {
    rockMound(-30, 0, 46, 38, '#a39a8f');
    g.save(); g.beginPath(); g.ellipse(20, -34, 44, 18, 0.1, 0, TAU); g.fillStyle = 'rgba(190,235,250,.85)'; g.fill(); g.stroke(); g.restore();
    g.beginPath(); g.ellipse(20, -34, 44, 18, 0.1, 0.2, Math.PI - 0.2); g.stroke();
    [0, 1, 2].forEach((i) => ell(2 + i * 16, -40, 3.4, 3.4, ['#ffdcb8', '#ffdcb8', '#e8b48a'][i], true));
    if (night > 0.2) light(20, -34, 40, '200,235,255');
  };
  K.ochre = () => {
    [[-26, 0, '#f2a93b'], [4, 6, '#e8503a'], [30, -2, '#ffc93c']].forEach(([x, y, c]) => { ell(x, y, 22, 10, '#cdb89a', true); ell(x, y - 1, 16, 6.5, c, true); });
    sign(-46, 14, '🎨');
  };
  K.tea = (b, night) => {
    ell(4, 2, 32, 6, 'rgba(0,0,0,.2)');
    box(-24, -22, 48, 22, '#a8714a'); poly([[-30, -22], [30, -22], [16, -42], [-16, -42]], '#8a3b2b');
    if (snowy()) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-16, -42); g.lineTo(16, -42); g.lineTo(22, -34); g.lineTo(-22, -34); g.closePath(); g.fill(); }
    box(-5, -16, 10, 16, '#5b3a22', 2); emoji('🍵', 0, -30, 13); box(14, -34, 6, 14, '#8a8f98'); smoke(17, -34);
    if (night > 0.2) light(0, -14, 36, '255,190,90');
  };
  K.wild = (b) => {
    ell(0, 2, 46, 8, 'rgba(0,0,0,.18)');
    box(-34, -16, 68, 5, '#a8714a'); [-30, 30].forEach((x) => box(x - 2, -16, 4, 16, '#7a5436'));
    sign(0, 6, b.p.emoji);
    // binoculars on the rail
    g.beginPath(); g.arc(-18, -22, 3.4, 0, TAU); g.arc(-12, -22, 3.4, 0, TAU); g.fillStyle = '#4a5568'; g.fill(); g.stroke();
  };
  K.hike = (b) => {
    ell(0, 2, 36, 7, 'rgba(0,0,0,.16)');
    rockMound(-18, 0, 32, 26, '#a8aab5'); sign(22, 6, b.p.emoji);
    flag(-18, -24, '#e8503a');
    g.save(); g.setLineDash([4, 5]); g.strokeStyle = '#7a5436'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(40, 14); g.quadraticCurveTo(26, 4, 6, 4); g.stroke(); g.restore();
  };
  K.bridge = (b) => {
    const canyon = b.p.id === 'johnston' || b.p.id === 'maligneC';
    if (canyon) { rockMound(-44, 0, 40, 40, '#a39a8f'); rockMound(44, 0, 40, 40, '#a39a8f'); ell(0, 2, 18, 5, '#52c2cf', true); }
    box(-52, -18, 104, 5, '#a8714a'); [-52, -26, 0, 26, 52].forEach((x) => { g.beginPath(); g.moveTo(x, -18); g.lineTo(x, -28); g.stroke(); });
    g.beginPath(); g.moveTo(-52, -28); g.quadraticCurveTo(0, -20, 52, -28); g.stroke();
    ell(-6, -22, 3, 3, '#ffdcb8', true);
    if (!canyon) { ell(0, 4, 40, 7, '#52c2cf', true); }
  };
  K.pools = () => {
    [[-24, 0, '#7fe0e0'], [6, 8, '#4fc0c0'], [30, -4, '#8fe0c0']].forEach(([x, y, c]) => { ell(x, y, 16, 8, '#cdb89a', true); ell(x, y - 1, 11, 5, c, true); });
    sign(-46, 14, '💧');
  };
  K.lake = (b, night) => { // lakeshore: dock, canoes, red chairs
    const a = b.lakeDir || 0; const dx = Math.cos(a); const dy = Math.sin(a) * 0.6;
    ell(0, 2, 30, 6, 'rgba(0,0,0,.14)');
    g.save(); g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, 0); g.lineTo(dx * 54, dy * 54); g.stroke(); g.lineWidth = 3.4; g.strokeStyle = '#c28a58'; g.stroke(); g.restore();
    redChair(-12, 10); redChair(2, 14);
    box(-24, -20, 18, 20, '#a8714a'); poly([[-27, -20], [-3, -20], [-15, -32]], '#b0392b'); smoke(-9, -32);
    // canoe rack
    ell(dx * 30 + 6, dy * 30 - 3, 12, 3, '#d9482f', true);
    sign(26, 8, b.p.emoji);
    if (night > 0.2) light(-15, -10, 28, '255,190,90');
  };
  K.view = (b) => {
    ell(0, 2, 34, 7, 'rgba(0,0,0,.16)');
    box(-28, -8, 56, 8, '#c28a58'); g.beginPath(); g.moveTo(-28, -8); g.lineTo(-28, -22); g.lineTo(28, -22); g.lineTo(28, -8); g.stroke();
    [-14, 0, 14].forEach((x) => { g.beginPath(); g.moveTo(x, -8); g.lineTo(x, -22); g.stroke(); });
    flag(-20, -22, '#d9482f'); sign(34, 6, b.p.emoji); redChair(14, -6);
  };
  K.falls = (b) => {
    rockMound(0, 0, 44, 70, '#8f93a3');
    const frozen = winter();
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = -14 + i * 9; g.lineWidth = 4.4; g.strokeStyle = INK; g.beginPath(); g.moveTo(x, -64 + (i % 2) * 8); g.lineTo(x + (i - 1.5) * 1.5, -4); g.stroke();
      g.lineWidth = 2.6; g.strokeStyle = frozen ? '#bfe8ff' : '#ffffff'; g.setLineDash(frozen ? [] : [9, 5]); g.lineDashOffset = -R.t * 30 - i * 3; g.stroke();
    }
    g.restore();
    ell(0, 2, 30, 8, frozen ? '#d9f2fb' : '#62cbe0', true);
    if (!frozen) { g.save(); g.globalAlpha = 0.55; for (let i = 0; i < 3; i++) { const f = (R.t * 0.7 + i / 3) % 1; ell(Math.sin(i * 2 + f * 5) * 10, -2 - f * 10, 7 + f * 8, 4 + f * 4, '#fff'); } g.restore(); }
    sign(40, 10, b.p.emoji);
  };
  K.cafe = (b, night) => {
    ell(3, 2, 26, 5, 'rgba(0,0,0,.16)');
    const wall = WALLS[b.n % WALLS.length];
    box(-20, -22, 40, 22, wall); poly([[-24, -22], [24, -22], [16, -36], [-16, -36]], ROOFS[b.n % ROOFS.length]);
    for (let i = 0; i < 5; i++) box(-20 + i * 8, -22, 8, 7, i % 2 ? '#fff' : '#e8503a');
    box(-9, -10, 18, 10, night > 0.2 ? '#ffe9a8' : '#fff', 3); emoji(b.p.emoji, 0, -4, 12);
    ell(30, 0, 5, 2.5, '#c28a58', true); ell(-30, 0, 5, 2.5, '#c28a58', true);
    if (night > 0.2) light(0, -12, 32, '255,200,110');
  };
  K.center_default = K.view;

  // draw a place and return its local top (so the caller can place the pin and the hit box)
  const TOPS = { town: 70, castle: 118, lodge: 70, lift: 150, chair: 120, spring: 36, cave: 50, hoodoo: 86, rail: 60, station: 76, dome: 60, center: 56, ice: 24, skywalk: 54, ochre: 20, tea: 44, wild: 34, hike: 36, bridge: 40, pools: 22, lake: 34, view: 34, falls: 78, cafe: 38 };
  const WIDE = { town: 70, castle: 80, lodge: 62, lift: 130, chair: 120, center: 80, station: 60, falls: 50, rail: 52, hoodoo: 52, ice: 70, skywalk: 66, spring: 50 };
  function place(b, X, Y, k, night) {
    const fn = K[b.kind] || K.view;
    at(X, Y, k, fn, b, night);
    const top = TOPS[b.kind] || 40; const wd = WIDE[b.kind] || 40;
    b.top = top; b.hit = { x: X - wd * k, y: Y - (top + 14) * k, w: wd * 2 * k, h: (top + 24) * k };
  }

  /* ---------- people ---------- */
  const SKIN = ['#ffdcb8', '#f1c398', '#d9a066', '#b97a4b', '#8d5a3a'];
  const HAIR = ['#2b2b3a', '#5a3d2b', '#8a5a2b', '#d9a441', '#a33a2b', '#3a3a44'];
  const JACKS = ['#e8503a', '#3a8fc7', '#ffc93c', '#8f7be0', '#3fb68b', '#ff9ebb', '#ff9a4d'];
  function person(p, X, Y, k) {
    at(X, Y, k, () => {
      const sw = p.moving ? Math.sin(p.ph) * 4 : 0; const bob = p.moving ? -Math.abs(Math.sin(p.ph)) * 1.4 : Math.sin(R.t * 2 + p.id) * 0.4;
      const f = p.face; const cold = R.season === 'winter' || R.season === 'autumn' && p.id % 2; const rg = p.owner;
      ell(0, 0, 8, 3, 'rgba(0,0,0,.2)');
      if (p.skate) { g.save(); g.lineWidth = 2; g.beginPath(); g.moveTo(-5 + sw, 0); g.lineTo(5 + sw, 0); g.stroke(); g.restore(); }
      g.save(); g.lineWidth = 3.6; g.strokeStyle = rg ? '#5a4a36' : '#2b2b3a';
      g.beginPath(); g.moveTo(-2.6, -9 + bob); g.lineTo(-2.6 + sw, -0.5); g.moveTo(2.6, -9 + bob); g.lineTo(2.6 - sw, -0.5); g.stroke(); g.restore();
      g.save(); g.fillStyle = '#7a5436'; g.beginPath(); g.ellipse(-2.6 + sw, -0.4, 2.6, 1.5, 0, 0, TAU); g.ellipse(2.6 - sw, -0.4, 2.6, 1.5, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
      if (!rg && p.pack) box(-f * 7 - 3.5, -21 + bob, 7, 12, shade(p.top, -0.2), 2.5);
      const top = rg ? '#3a7a55' : p.top;
      box(-6, -21 + bob, 12, 13, top, 4.5);
      if (rg) { g.fillStyle = '#ffc93c'; g.fillRect(-1, -20 + bob, 2, 10); }
      g.save(); g.lineWidth = 3; g.strokeStyle = shade(top, -0.25); g.beginPath(); g.moveTo(-6, -18 + bob); g.lineTo(-8, -12 + bob - sw * 0.3); g.moveTo(6, -18 + bob); g.lineTo(8, -12 + bob + sw * 0.3); g.stroke(); g.restore();
      if (p.pole) { g.save(); g.lineWidth = 1.3; g.beginPath(); g.moveTo(f * 9, -13 + bob); g.lineTo(f * 12, 0); g.stroke(); g.restore(); }
      const hy = -28 + bob;
      ell(0, hy, 7.6, 7.6, p.skin, true);
      g.beginPath(); g.arc(0, hy, 7.8, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = p.hair; g.fill(); g.stroke();
      if (rg) { box(-10, hy - 5, 20, 3, '#6b4b32', 1.5); box(-5.5, hy - 11, 11, 7, '#6b4b32', 2.5); }
      else if (cold) { g.beginPath(); g.arc(0, hy - 1, 8, Math.PI, TAU); g.closePath(); g.fillStyle = p.top; g.fill(); g.stroke(); box(-8, hy - 3, 16, 3.2, shade(p.top, -0.2), 1.5); ell(0, hy - 10, 2.5, 2.5, '#fff', true); }
      else if (p.hat) { box(-8, hy - 4, 16, 2.6, '#f2e6c4', 1); box(-5, hy - 9, 10, 6, '#f2e6c4', 2.5); }
      g.fillStyle = INK; g.beginPath(); g.arc(f * 2.2 - 2.4, hy + 0.5, 1.2, 0, TAU); g.arc(f * 2.2 + 2.4, hy + 0.5, 1.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,120,120,.45)'; g.beginPath(); g.arc(f * 2.2 - 4.6, hy + 3, 1.7, 0, TAU); g.arc(f * 2.2 + 4.6, hy + 3, 1.7, 0, TAU); g.fill();
      if (p.eatT > 0 && p.eatEmoji) emoji(p.eatEmoji, f * 10, -15 + bob + Math.sin(R.t * 6) * 1.5, 11);
    });
    p.sx = X; p.sy = Y; p.sk = k;
  }

  /* ---------- animals ---------- */
  const SP = {
    elk:   { body: '#a8693c', belly: '#c08a58', rump: '#f1dcb0', size: 1.15, neck: 9, leg: 11, head: '#8a5530' },
    sheep: { body: '#b08a62', belly: '#cfae86', rump: '#fff0d6', size: 0.9, neck: 4, leg: 9, head: '#9a7650' },
    goat:  { body: '#fbfbf4', belly: '#fff', rump: '#fff', size: 0.8, neck: 4, leg: 8, head: '#fbfbf4' },
    bear:  { body: '#3b2f2c', belly: '#4b3e39', rump: '#3b2f2c', size: 1.0, neck: 2, leg: 7, head: '#3b2f2c' },
    moose: { body: '#5a4030', belly: '#6c4f3b', rump: '#5a4030', size: 1.35, neck: 8, leg: 14, head: '#4a3326' },
    deer:  { body: '#b58a5a', belly: '#d4b48a', rump: '#fff0d6', size: 0.95, neck: 7, leg: 10, head: '#a47a4c' },
  };
  function animal(a, X, Y, k) {
    const sp = SP[a.sp]; const s = sp.size * (a.big || 1);
    at(X, Y, k * s, () => {
      const f = a.face; const sw = a.moving ? Math.sin(a.ph) * 3.4 : 0; const bob = a.moving ? -Math.abs(Math.sin(a.ph)) * 1 : 0;
      const bear = a.sp === 'bear';
      ell(0, 0, 15, 4, 'rgba(0,0,0,.2)');
      g.save(); g.lineWidth = 3.4; g.strokeStyle = sp.belly;
      [[-8, 1], [-5, -1], [5, -1], [8, 1]].forEach(([x, d], i) => { const o = (i % 2 ? sw : -sw) * d; g.beginPath(); g.moveTo(f * x, -sp.leg + 2 + bob); g.lineTo(f * x + o, -0.5); g.stroke(); });
      g.restore();
      g.save(); g.lineWidth = 1; g.beginPath(); [[-8, 1], [-5, -1], [5, -1], [8, 1]].forEach(([x, d], i) => { const o = (i % 2 ? sw : -sw) * d; g.moveTo(f * x + o + 2, -0.5); g.lineTo(f * x + o - 2, -0.5); }); g.stroke(); g.restore();
      const by = -sp.leg - 3 + bob; // body centre
      if (a.sp === 'moose') { ell(f * 3, by - 5, 8, 7, sp.body, true); } // shoulder hump
      ell(0, by, bear ? 15 : 13, bear ? 8.5 : 7, sp.body, true);
      if (sp.rump !== sp.body) ell(-f * 10, by - 1, 4, 5, sp.rump);
      // tail
      ell(-f * 14, by - 3, 2.6, 2, sp.rump === sp.body ? sp.body : sp.rump, true);
      // neck + head
      const hx = f * (13 + sp.neck * 0.5); const hy = by - sp.neck - (bear ? 0 : 4);
      g.save(); g.lineWidth = 6 + (bear ? 3 : 0); g.strokeStyle = INK; g.beginPath(); g.moveTo(f * 8, by - 2); g.lineTo(hx, hy); g.stroke(); g.lineWidth = 3.6 + (bear ? 3 : 0); g.strokeStyle = sp.body; g.stroke(); g.restore();
      if (a.sp === 'elk' || a.sp === 'deer' || a.sp === 'moose') {
        const long = a.sp === 'moose' ? 1.4 : 1;
        ell(hx + f * 3 * long, hy + 1, 6.4 * long, 4.2, sp.head, true);
        ell(hx + f * 8 * long, hy + 2.4, 2.4, 2, '#2b2b3a');
      } else { ell(hx + f * 2, hy, bear ? 5.6 : 5, bear ? 5 : 4.4, sp.head, true); if (bear) ell(hx + f * 5.4, hy + 1.6, 3, 2.4, '#c8a67a', true); }
      g.fillStyle = INK; g.beginPath(); g.arc(hx + f * 3, hy - 1, 1, 0, TAU); g.fill();
      // ears
      if (a.sp === 'bear') { ell(hx - f * 1, hy - 5, 2.4, 2.4, sp.body, true); ell(hx + f * 3, hy - 5, 2.4, 2.4, sp.body, true); }
      else { g.beginPath(); g.ellipse(hx - f * 2, hy - 4, 1.8, 3.4, f * 0.6, 0, TAU); g.fillStyle = sp.head; g.fill(); g.stroke(); }
      // headgear
      g.save(); g.lineWidth = 1.8; g.strokeStyle = INK;
      if (a.sp === 'elk' && a.bull) { g.strokeStyle = '#e8d8b0'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx, hy - 4); g.lineTo(hx - f * 3 + f * i * 4, hy - 14 - i * 1.5); g.stroke(); } g.beginPath(); g.moveTo(hx, hy - 4); g.lineTo(hx - f * 7, hy - 15); g.stroke(); }
      if (a.sp === 'moose' && a.bull) { g.fillStyle = '#d9c9a0'; g.beginPath(); g.ellipse(hx - f * 1, hy - 9, 12, 5, 0, 0, TAU); g.fill(); g.stroke(); }
      if (a.sp === 'sheep') { g.strokeStyle = '#e8d8b0'; g.lineWidth = 3; g.beginPath(); g.arc(hx - f * 1, hy - 3, 5, f > 0 ? Math.PI * 1.1 : Math.PI * 1.9, f > 0 ? Math.PI * 0.2 + TAU : Math.PI * 0.8 + TAU * 0, f < 0); g.stroke(); }
      if (a.sp === 'goat') { g.strokeStyle = '#2b2b3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy - 4); g.lineTo(hx - f * 3, hy - 10); g.stroke(); g.beginPath(); g.moveTo(hx + f * 4, hy + 4); g.lineTo(hx + f * 4, hy + 9); g.stroke(); }
      g.restore();
    });
    a.sx = X; a.sy = Y; a.sk = k * s;
  }
  function eagle(e, X, Y, k) { // flying: X,Y already includes altitude
    at(X, Y, k, () => {
      const flap = Math.sin(R.t * 5 + e.id) * 0.7; const f = e.face;
      ell(0, 36 + Math.abs(e.alt) * 0.1, 7, 2, 'rgba(0,0,0,.12)');
      g.scale(f, 1);
      g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(-14, -8 - flap * 9, -26, -2 - flap * 12); g.quadraticCurveTo(-14, 2, -3, 3); g.closePath(); g.fillStyle = '#4a3326'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(3, 0); g.quadraticCurveTo(14, -8 - flap * 9, 26, -2 - flap * 12); g.quadraticCurveTo(14, 2, 3, 3); g.closePath(); g.fill(); g.stroke();
      ell(0, 1, 6, 3.4, '#4a3326', true); ell(6, -1, 3.4, 3.2, '#ffffff', true); poly([[8, -1.5], [12, 0], [8, 0.8]], '#ffc93c'); ell(-6, 2, 3, 2, '#fff');
    });
    e.sx = X; e.sy = Y; e.sk = k;
  }

  /* ---------- vehicles ---------- */
  function car(c, X, Y, k, dir) {
    at(X, Y, k * (dir >= 0 ? 1 : 1), () => {
      g.scale(dir >= 0 ? 1 : -1, 1);
      ell(0, 1, 11, 3, 'rgba(0,0,0,.2)');
      if (c.type === 'bus') { box(-15, -14, 30, 12, '#d9482f', 3); g.fillStyle = '#cfeaff'; g.fillRect(-12, -12, 24, 4); box(-15, -4, 30, 2.5, '#ffc93c'); }
      else if (c.type === 'rv') { box(-13, -15, 26, 13, '#f4f1ea', 3); g.fillStyle = '#cfeaff'; g.fillRect(6, -13, 5, 5); box(-13, -6, 26, 2.5, '#3a8fc7'); }
      else { box(-9, -8, 18, 6, c.col, 2.5); box(-5, -13, 10, 6, shade(c.col, 0.15), 2.5); g.fillStyle = '#cfeaff'; g.fillRect(-3.4, -12, 6.8, 3.4); }
      ell(-5.5, -1, 2.6, 2.6, '#2b2b3a', true); ell(5.5, -1, 2.6, 2.6, '#2b2b3a', true);
      if (R.env.n > 0.3) { g.fillStyle = '#fff3a0'; g.fillRect(c.type === 'bus' ? 14 : 8, -6, 2.5, 2.5); }
      if (c.jam && Math.sin(R.t * 8 + c.id) > 0) { g.fillStyle = '#ffc93c'; g.fillRect(-10, -9, 2.5, 2.5); }
    });
    if (R.env.n > 0.3) R.litList.push([X + 14 * k * (dir >= 0 ? 1 : -1), Y - 5 * k, 22 * k, '255,240,170']);
    c.sx = X; c.sy = Y; c.sk = k;
  }
  function iceBus(c, X, Y, k, dir) {
    at(X, Y, k, () => {
      g.scale(dir >= 0 ? 1 : -1, 1);
      ell(0, 2, 24, 5, 'rgba(0,0,0,.22)');
      box(-22, -22, 44, 16, '#f4f4f0', 4); g.fillStyle = '#cfeaff'; g.fillRect(-18, -19, 36, 6); box(-22, -10, 44, 3, '#d9482f');
      [-14, 0, 14].forEach((x) => { ell(x, -3, 6, 6, '#2b2b3a', true); ell(x, -3, 2.4, 2.4, '#8a8f98'); });
    });
    c.sx = X; c.sy = Y; c.sk = k;
  }
  function canoe(q, X, Y, k, dir, vis) {
    at(X, Y, k, () => {
      g.globalAlpha = vis; g.scale(dir, 1);
      g.save(); g.globalAlpha = 0.45 * vis; ell(0, 3, 16, 3, '#fff'); g.restore();
      g.beginPath(); g.moveTo(-17, 0); g.quadraticCurveTo(0, 6, 17, 0); g.quadraticCurveTo(0, -4, -17, 0); g.fillStyle = '#d9482f'; g.fill(); g.stroke();
      [[-7, '#3a8fc7'], [5, '#ffc93c']].forEach(([x, c]) => { box(x - 3.2, -11, 6.4, 9, c, 3); ell(x, -15, 4.2, 4.2, '#ffdcb8', true); });
      const s = Math.sin(R.t * 3 + q.a * 2) * 3;
      g.save(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-5 + s, -12); g.lineTo(3 + s * 1.2, 2); g.stroke(); g.restore();
    });
  }
  function skater(q, X, Y, k, dir, vis) {
    at(X, Y, k, () => {
      g.globalAlpha = vis; g.scale(dir, 1);
      const lean = Math.sin(R.t * 3 + q.a * 2) * 0.12;
      ell(0, 0, 9, 2.4, 'rgba(0,0,0,.14)');
      g.save(); g.rotate(lean); g.lineWidth = 3.4; g.strokeStyle = '#2b2b3a'; g.beginPath(); g.moveTo(-2, -9); g.lineTo(-5, 0); g.moveTo(2, -9); g.lineTo(5, -1); g.stroke();
      box(-5.5, -20, 11, 12, q.col, 4.5); ell(0, -26, 6.4, 6.4, '#ffdcb8', true); g.beginPath(); g.arc(0, -26, 6.8, Math.PI, TAU); g.fillStyle = '#e8503a'; g.fill(); g.stroke(); ell(0, -33, 2.2, 2.2, '#fff', true);
      g.lineWidth = 1.6; g.strokeStyle = INK; g.beginPath(); g.moveTo(-8, 0.4); g.lineTo(-1, 0.4); g.moveTo(1, 0); g.lineTo(9, 0.4); g.stroke(); g.restore();
    });
  }
  function train(t, X, Y, k, ang) {
    const sz = 1;
    at(X, Y, k * sz, () => {
      g.rotate(0);
      const dir = Math.cos(ang) >= 0 ? 1 : -1; g.scale(dir, 1);
      ell(0, 2, 19, 4, 'rgba(0,0,0,.22)');
      if (t.id === 'rm') {
        box(-18, -16, 36, 14, '#1d3a6e', 4); box(-18, -9, 36, 3, '#ffc93c');
        if (t.car) { g.beginPath(); g.ellipse(0, -16, 15, 7, 0, Math.PI, TAU); g.fillStyle = 'rgba(190,235,250,.9)'; g.fill(); g.stroke(); }
        else { box(4, -23, 14, 8, '#102650', 3); g.fillStyle = '#ffc93c'; g.fillRect(6, -21, 3, 3); }
        if (t.car) { for (let i = -12; i <= 12; i += 8) box(i - 2, -13, 4, 4, R.env.n > 0.3 ? '#ffe9a8' : '#fff', 1); }
      } else if (t.id === 'freight') {
        if (t.car) { box(-18, -18, 36, 16, ['#b0392b', '#6a7a8f', '#c8a050', '#3f7a6a'][t.k % 4], 2); g.save(); g.globalAlpha = 0.3; g.beginPath(); g.moveTo(-9, -18); g.lineTo(-9, -2); g.moveTo(9, -18); g.lineTo(9, -2); g.stroke(); g.restore(); }
        else { box(-18, -16, 36, 14, '#d9482f', 3); box(4, -24, 14, 9, '#a82f1f', 3); box(-18, -9, 36, 3, '#fff'); g.fillStyle = '#ffe9a8'; g.fillRect(16, -12, 2.5, 3); }
      }
      [-12, 12].forEach((x) => ell(x, -1, 3, 3, '#2b2b3a', true));
      if (!t.car && R.env.n > 0.3) R.litList.push([X + dir * 20 * k, Y - 10 * k, 30 * k, '255,240,170']);
    });
  }

  /* ---------- clouds, portal marker, stars ---------- */
  function cloud(X, Y, s, a) {
    g.save(); g.globalAlpha = a; g.fillStyle = '#ffffff';
    [[0, 0, 26, 14], [22, -5, 22, 13], [-22, -3, 20, 11], [8, -12, 18, 11]].forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(X + x * s, Y + y * s, rx * s, ry * s, 0, 0, TAU); g.fill(); });
    g.restore();
  }

  return { at, shade, mix, rr, box, poly, ell, emoji, peakBody, tree, treeLite, place, person, animal, eagle, car, iceBus, canoe, skater, train, cloud, SKIN, HAIR, JACKS, SP, light };
};
