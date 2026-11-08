// Living cartoon map of Banff & Jasper: canvas engine + UI wiring.
(() => {
  'use strict';
  const W = window.BJ_WORLD; const LI = window.BJ_LIVING_I18N; const I18N = window.BJ_I18N;
  const { HUBS, ROADS, LAKES, RIVERS, RAIL, GLACIERS, WORLD, PEAKS, PLACES, P, WALK, byHub } = W;
  const QS = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const INK = '#2d2a32';
  const FONT = "Fredoka, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = Math.random;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- language ---------- */
  const LANGS = ['en', 'zh'];
  let lang = LANGS.includes(QS.get('lang')) ? QS.get('lang') : LANGS.includes(store.get('bj-lang')) ? store.get('bj-lang') : ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const tx = (k) => (LI[lang][k] !== undefined ? LI[lang][k] : LI.en[k]);
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  const nameOf = (p) => (lang === 'zh' ? p.zh : p.name);
  const subOf = (p) => (lang === 'zh' ? p.name : p.zh);
  const ptext = (p, f) => (I18N.places[lang] && I18N.places[lang][p.id] && I18N.places[lang][p.id][f]) || p[f];
  const catName = (c) => I18N.ui[lang]['cat_' + c];
  const personName = (p) => tx('names')[p.ni % tx('names').length];

  /* ---------- areas ---------- */
  const AREA_ORDER = ['banff', 'bow', 'louise', 'parkway', 'jasper'];
  const AREA_COL = { banff: '#f2a93b', bow: '#e8503a', louise: '#46d3cc', parkway: '#7ccbf5', jasper: '#8f7be0' };
  const HUB_AREA = { banff: 'banff', minne: 'banff', sunshine: 'banff', bvp: 'bow', kootenay: 'bow', louise: 'louise', yoho: 'louise', bowlake: 'parkway', crossing: 'parkway', icefield: 'parkway', sunwapta: 'parkway', jasper: 'jasper', cavell: 'jasper', maligne: 'jasper' };
  const CAT_COL = { lake: '#46d3cc', view: '#8f7be0', falls: '#7ccbf5', hike: '#3fb68b', wild: '#ff9a4d', fun: '#ff9ebb', food: '#ffc93c' };
  const areaOf = (p) => HUB_AREA[p.hub];
  const placeById = P;

  /* ---------- canvas + camera ---------- */
  const cv = $('cv'); const g = cv.getContext('2d');
  let Wc = 0; let Hc = 0; let dpr = 1;
  const ZMIN = 0.06; const ZMAX = 3;
  const cam = { x: 0, y: 0, z: 0.8, tx: 0, ty: 0, tz: 0.8, tilt: 0.58, ttilt: 0.58 };
  const sx = (x) => (x - cam.x) * cam.z + Wc / 2;
  const sy = (y, z) => (y - cam.y) * cam.z * cam.tilt + Hc / 2 - (z || 0) * cam.z;
  const toWorld = (px, py) => [(px - Wc / 2) / cam.z + cam.x, (py - Hc / 2) / (cam.z * cam.tilt) + cam.y];
  const BOUNDS = (() => { const ks = Object.keys(HUBS); return { x0: Math.min(...ks.map((k) => HUBS[k].x)) - 700, x1: Math.max(...ks.map((k) => HUBS[k].x)) + 700, y0: Math.min(...ks.map((k) => HUBS[k].y)) - 800, y1: Math.max(...ks.map((k) => HUBS[k].y)) + 700 }; })();
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); Wc = window.innerWidth; Hc = window.innerHeight;
    cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr);
  }
  function setCam(x, y, z, snap) { cam.tx = x; cam.ty = y; cam.tz = clamp(z, ZMIN, ZMAX); if (snap) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; } }
  function fitBox(x0, y0, x1, y1, maxZ, padX) {
    const dx = Math.max(200, x1 - x0); const dy = Math.max(200, y1 - y0); const avail = Wc - (padX || 0) - 120;
    const z = clamp(Math.min(avail / dx, (Hc - 220) / (dy * cam.ttilt)), ZMIN, maxZ || 1.2);
    setCam((x0 + x1) / 2 - (padX || 0) / 2 / z, (y0 + y1) / 2 + 20, z);
  }
  const overview = () => fitBox(BOUNDS.x0 + 400, BOUNDS.y0 + 500, BOUNDS.x1 - 400, BOUNDS.y1 - 300, 0.5, 0);

  /* ---------- runtime shared with sprites ---------- */
  const SEA = {
    spring: { tint: [246, 255, 244], ground: [172, 222, 126], snow: 0.35, warm: 0.6, bare: 0, part: 1 },
    summer: { tint: [255, 255, 255], ground: [146, 210, 104], snow: 0, warm: 1, bare: 0, part: 0 },
    autumn: { tint: [255, 238, 214], ground: [204, 184, 98], snow: 0.12, warm: 0.7, bare: 0, part: 1 },
    winter: { tint: [226, 238, 255], ground: [238, 245, 250], snow: 1, warm: 0, bare: 1, part: 1 },
  };
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const SEASON_ICON = { auto: '🔄', spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
  const sea = { tint: [255, 255, 255], ground: [146, 210, 104], snow: 0, warm: 1, bare: 0, part: 0 };
  const env = { m: [255, 255, 255], n: 0, glow: 0 };
  const R = { g, t: 0, env, sea, season: 'summer', litList: [] };
  const S = window.BJ_SPRITES(R);
  let seasonMode = QS.get('season') || store.get('bj-season', 'summer'); if (![...SEASONS, 'auto'].includes(seasonMode)) seasonMode = 'summer';
  let todMode = QS.get('tod') !== null ? clamp(parseInt(QS.get('tod'), 10) || 0, 0, 3) : 4;
  let phase = 0.28; let time = 0; let paused = false;

  const KF = [[0, [255, 208, 196], 0.3, 1], [0.1, [255, 240, 228], 0.06, 0.4], [0.18, [255, 255, 255], 0, 0], [0.55, [255, 255, 255], 0, 0], [0.68, [255, 205, 170], 0.25, 1], [0.78, [172, 150, 190], 0.7, 0.4], [0.88, [78, 92, 150], 1, 0], [0.97, [78, 92, 150], 1, 0], [1, [255, 208, 196], 0.3, 1]];
  const FIXED_PHASE = [0.02, 0.35, 0.68, 0.92];
  function envAt(p) {
    for (let i = 1; i < KF.length; i++) {
      if (p <= KF[i][0]) { const a = KF[i - 1]; const b = KF[i]; const t = (p - a[0]) / (b[0] - a[0] || 1); return { m: a[1].map((v, k) => lerp(v, b[1][k], t)), n: lerp(a[2], b[2], t), glow: lerp(a[3], b[3], t) }; }
    }
    return { m: KF[0][1], n: KF[0][2], glow: KF[0][3] };
  }
  let seasonAuto = 1; // index into SEASONS while in auto mode
  const curSeason = () => (seasonMode === 'auto' ? SEASONS[seasonAuto % 4] : seasonMode);
  function updateEnv(dt, snap) {
    const e = envAt(todMode === 4 ? phase : FIXED_PHASE[todMode]); const k = snap ? 1 : 1 - Math.exp(-dt * 2.5);
    for (let i = 0; i < 3; i++) env.m[i] = lerp(env.m[i], e.m[i], k);
    env.n = lerp(env.n, e.n, k); env.glow = lerp(env.glow, e.glow, k);
    const s = curSeason(); R.season = s; const T = SEA[s]; const k2 = snap ? 1 : 1 - Math.exp(-dt * 1.6);
    for (let i = 0; i < 3; i++) { sea.tint[i] = lerp(sea.tint[i], T.tint[i], k2); sea.ground[i] = lerp(sea.ground[i], T.ground[i], k2); }
    ['snow', 'warm', 'bare', 'part'].forEach((f) => { sea[f] = lerp(sea[f], T[f], k2); });
  }

  /* ---------- world objects ---------- */
  const hubGate = (h) => ({ x: HUBS[h].x, y: HUBS[h].y });
  const buildings = PLACES.map((p, i) => {
    const b = { p, n: i, kind: W.kindOf(p), x: p.x, y: p.y, lakeDir: 0, hit: null, top: 50 };
    const L = LAKES.find((q) => q.place === p); if (L) b.lakeDir = Math.atan2(L.y - p.y, L.x - p.x);
    p.b = b; return b;
  });
  // the portal sits in open ground near Banff
  const PORTAL = (() => {
    for (let r = 250; r < 800; r += 30) for (let a = 0; a < TAU; a += 0.3) {
      const x = HUBS.banff.x + Math.cos(a + r) * r; const y = HUBS.banff.y + Math.sin(a + r) * r * 0.8;
      if (!W.maskAt(x, y) && !W.inLake(x, y, 60) && !PLACES.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.2) < 140)) return { x, y };
    }
    return { x: HUBS.banff.x + 300, y: HUBS.banff.y + 200 };
  })();

  // lakes and glaciers get lumpy outlines
  function blob(cx, cy, rx, ry, rot, seed, n, amp) {
    const pts = []; const c = Math.cos(rot); const s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU; const f = 1 + (W.vnoise(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7 + seed * 0.7, seed) - 0.5) * 2 * amp;
      const lx = Math.cos(a) * rx * f; const ly = Math.sin(a) * ry * f; pts.push([cx + lx * c - ly * s, cy + lx * s + ly * c]);
    }
    return pts;
  }
  LAKES.forEach((L, i) => {
    L.shape = blob(L.x, L.y, L.rx, L.ry, L.rot, i * 3.1 + 1, 56, 0.1);
    L.rim = blob(L.x, L.y, L.rx + 16, L.ry + 12, L.rot, i * 3.1 + 1, 56, 0.1);
    L.cracks = Array.from({ length: 5 }, (_, k) => { const a = W.h2(i, k, 5) * TAU; const b = a + 1.2 + W.h2(i, k, 6) * 2; return [Math.cos(a) * 0.7, Math.sin(a) * 0.7, Math.cos(b) * 0.6, Math.sin(b) * 0.6]; });
    L.spark = Array.from({ length: 9 }, (_, k) => [W.h2(i, k, 7) * TAU, Math.sqrt(W.h2(i, k, 8)) * 0.8, W.h2(i, k, 9) * 6]);
  });
  GLACIERS.forEach((G, i) => { G.shape = blob(G.x, G.y, G.rx, G.ry, G.rot, i * 2.3 + 40, 34, 0.16); });

  // statics (y sorted): peaks, trees, places, portal
  const statics = [];
  PEAKS.forEach((pk) => statics.push({ x: pk.x, y: pk.y, m: pk.h + 40, wide: pk.w / 2 + 10, type: 1, pk }));
  buildings.forEach((b) => statics.push({ x: b.x, y: b.y, m: 190, wide: b.kind === 'center' ? 320 : 130, type: 2, b }));
  statics.push({ x: PORTAL.x, y: PORTAL.y, m: 110, wide: 90, type: 3 });
  (() => {
    const step = 62;
    for (let j = 0; WORLD.y0 + j * step < WORLD.y1; j++) {
      for (let i = 0; WORLD.x0 + i * step < WORLD.x1; i++) {
        const x = WORLD.x0 + i * step + W.h2(i, j, 42) * step; const y = WORLD.y0 + j * step + W.h2(i, j, 43) * step;
        if (x < BOUNDS.x0 - 300 || x > BOUNDS.x1 + 300 || y < BOUNDS.y0 - 300 || y > BOUNDS.y1 + 300) continue;
        const f = W.vnoise(x / 520, y / 520, 9); if (W.h2(i, j, 41) > 0.12 + f * 0.62) continue;
        if (W.maskAt(x, y)) continue;
        const rd = W.roadDist(x, y); const hh = W.h2(i, j, 44);
        const t = rd < 520 && hh < 0.22 ? 1 : rd > 420 && hh > 0.62 ? 2 : 0;
        statics.push({ x, y, m: 56, wide: 16, type: 0, tr: { t, s: 0.8 + W.h2(i, j, 45) * 0.55, v: W.h2(i, j, 46) < 0.5 ? 1 : 0 } });
      }
    }
  })();
  statics.sort((a, b) => a.y - b.y);
  statics.forEach((s, i) => { s.k = i; });
  function lowerBound(arr, y) { let lo = 0; let hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].y < y) lo = m + 1; else hi = m; } return lo; }

  /* ---------- jam zones + road adjacency ---------- */
  const radj = {}; ROADS.forEach((r, i) => { (radj[r.a] = radj[r.a] || []).push([i, 1, r.b]); (radj[r.b] = radj[r.b] || []).push([i, -1, r.a]); });
  const JAMS = [];
  ['bvpwild', 'malignewild', 'elk', 'goats', 'vermilion', 'peyto', 'bowlake'].forEach((id) => {
    const p = P[id]; if (!p) return;
    let best = null;
    ROADS.forEach((r, ri) => { for (let s = 0; s <= r.line.len; s += 25) { const q = W.posAt(r.line, s); const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (!best || d < best.d) best = { d, x: q[0], y: q[1], ri, s }; } });
    if (best && best.d < 700) JAMS.push({ x: best.x, y: best.y, r: 80, ri: best.ri, s: best.s, id });
  });
  const jamAt = (x, y) => { for (const j of JAMS) if (Math.hypot(j.x - x, j.y - y) < j.r) return j; return null; };

  /* ---------- people ---------- */
  const people = []; let uid = 100;
  const hubKeys = Object.keys(HUBS);
  const HUB_PEOPLE = { banff: 7, minne: 2, sunshine: 2, bvp: 3, kootenay: 2, louise: 7, yoho: 3, bowlake: 3, crossing: 2, icefield: 5, sunwapta: 3, jasper: 7, cavell: 2, maligne: 5 };
  function mkPerson(hub, owner) {
    const list = byHub[hub] || []; const start = list.length ? pick(list) : null; const H = HUBS[hub];
    const p = {
      id: uid++, ni: people.length * 7 + 3, hub, x: start ? start.x : H.x, y: start ? start.y : H.y, node: start ? start.id : '@gate', st: 'stay', t: rnd() * 6, path: [], pi: 0,
      spd: 40 + rnd() * 22, face: rnd() < 0.5 ? 1 : -1, ph: rnd() * 6, moving: false, owner: !!owner, dest: start,
      skin: pick(S.SKIN), hair: pick(S.HAIR), top: pick(S.JACKS), hat: rnd() < 0.3, pack: rnd() < 0.55, pole: rnd() < 0.2, eatT: 0, eatEmoji: null, visits: 0,
    };
    if (owner) { p.ni = 0; p.spd = 52; }
    return p;
  }
  hubKeys.forEach((h) => { for (let i = 0; i < (HUB_PEOPLE[h] || 2); i++) { if (byHub[h]) people.push(mkPerson(h, false)); } });
  const aspen = mkPerson('banff', true); people.push(aspen);
  const truck = { type: 'car', col: '#2f7d5b', id: 7, jam: false };

  /* ---------- logs, bubbles, decree ---------- */
  const logsEl = $('logs'); let lastLog = -9;
  function addLog(html, own) {
    if (time - lastLog < 1.1 && !own) return; lastLog = time;
    const d = document.createElement('div'); if (own) d.className = 'own'; d.innerHTML = html;
    logsEl.insertBefore(d, logsEl.firstChild); while (logsEl.childNodes.length > 40) logsEl.removeChild(logsEl.lastChild);
  }
  const bubbles = [];
  function bubble(o, text, dur, delay) { bubbles.push({ o, text, t: dur || 3.6, d: delay || 0 }); if (bubbles.length > 14) bubbles.shift(); }
  let decreeFn = () => tx('decreeFirst');
  function setDecree(fn, own) { decreeFn = fn; $('decreeTx').textContent = fn(); if (own) addLog(fmt(tx('logDecree'), { t: esc(fn()) }), true); }
  const seasonLine = () => pick([...tx('declGen').all, ...(tx('declGen')[curSeason()] || [])]);

  function arrive(p) {
    if (p.after === 'drive') { startDrive(p); return; }
    const d = p.dest; p.node = d.id; p.st = 'stay'; p.moving = false; p.t = 4 + rnd() * 6; p.visits++;
    const food = d.type === 'food'; p.eatT = food ? p.t : 0; p.eatEmoji = food ? d.emoji : null;
    const nm = nameOf(d);
    if (p.owner) {
      setDecree(() => fmt(pick(food ? tx('declFood') : tx('declSight')), { s: nameOf(d) }), true);
    } else if (rnd() < 0.5 && !hidden(p)) {
      addLog(fmt(tx(food ? 'logEat' : 'logSee'), { e: d.emoji, n: personName(p), s: esc(nm) }));
      if (rnd() < 0.5) bubble(p, fmt(pick(tx(food ? 'eatFood' : 'seeSight')), { s: nm }), 3.2);
    }
  }
  function pickDest(p) {
    const list = (byHub[p.hub] || []).filter((q) => q.id !== p.node);
    if (!list.length) { p.t = 4; return; }
    const d = rnd() < 0.8 ? pick(list.filter((q) => !q.far).length ? list.filter((q) => !q.far) : list) : pick(list);
    p.dest = d; p.path = W.walkPath(p.hub, p.node, d.id); p.pi = 1; p.st = 'walk';
    if (p.path.length < 2) { p.st = 'stay'; p.t = 1; }
  }
  function startDrive(p) {
    const nb = (radj[p.hub] || []).map((e) => e[2]); const to = rnd() < 0.7 && nb.length ? pick(nb) : pick(hubKeys.filter((h) => h !== p.hub));
    const pts = W.roadPoints(W.hubRoute(p.hub, to)); if (pts.length < 2) { p.after = null; p.st = 'stay'; p.t = 2; return; }
    p.line = W.mkLine(pts); p.s = 0; p.st = 'drive'; p.toHub = to; p.after = null; p.moving = false;
    addLog(fmt('🚙 <b>{n}</b> → <b>{h}</b>', { n: tx('rangerName'), h: HUBS[to][lang] || HUBS[to].en }), true);
  }
  function stepPath(o, dt, spd) {
    let rem = spd * dt;
    while (rem > 0 && o.pi < o.path.length) {
      const tp = o.path[o.pi]; const dx = tp[0] - o.x; const dy = tp[1] - o.y; const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) o.face = dx > 0 ? 1 : -1;
      if (d <= rem) { o.x = tp[0]; o.y = tp[1]; o.pi++; rem -= d; } else { o.x += (dx / d) * rem; o.y += (dy / d) * rem; rem = 0; }
    }
    return o.pi >= o.path.length;
  }
  function updPerson(p, dt) {
    if (p.st === 'drive') {
      const jm = jamAt(p.x, p.y); truck.jam = !!jm; p.s += dt * 320 * (jm ? 0.15 : 1);
      const q = W.posAt(p.line, p.s); const off = 7; p.x = q[0] - Math.sin(q[2]) * off; p.y = q[1] + Math.cos(q[2]) * off;
      if (Math.abs(Math.cos(q[2])) > 0.12) p.face = Math.cos(q[2]) > 0 ? 1 : -1;
      if (p.s >= p.line.len) { p.hub = p.toHub; p.x = HUBS[p.hub].x; p.y = HUBS[p.hub].y; p.node = '@gate'; p.st = 'stay'; p.t = 1; p.visits = 0; }
      return;
    }
    p.ph += dt * (p.moving ? 9 : 0);
    if (p.st === 'walk') { p.moving = true; if (stepPath(p, dt, p.spd)) arrive(p); } else {
      p.moving = false; p.t -= dt; if (p.eatT > 0) p.eatT -= dt;
      if (p.t <= 0) {
        if (p.owner && p.visits >= 3) { p.after = 'drive'; p.dest = { id: '@gate', type: 'gate' }; p.path = W.walkPath(p.hub, p.node, '@gate'); p.pi = 1; p.st = 'walk'; if (p.path.length < 2) startDrive(p); } else pickDest(p);
      }
    }
  }

  /* ---------- animals ---------- */
  const animals = [];
  function mkAnimal(sp, near, r) {
    if (!near) return;
    let x = near.x; let y = near.y;
    for (let k = 0; k < 24; k++) { const a = rnd() * TAU; const d = 40 + rnd() * r; x = near.x + Math.cos(a) * d; y = near.y + Math.sin(a) * d * 0.8; if (!W.inLake(x, y, 24)) break; }
    animals.push({ id: uid++, sp, x, y, hx: near.x, hy: near.y, r, face: rnd() < 0.5 ? 1 : -1, ph: rnd() * 6, moving: false, t: rnd() * 5, tx: x, ty: y, big: 0.92 + rnd() * 0.18, bull: rnd() < 0.5, spd: { elk: 22, sheep: 18, goat: 14, bear: 26, moose: 18, deer: 28 }[sp] });
  }
  [['elk', 'elk', 4, 190], ['elk', 'jasper', 3, 210], ['elk', 'jpl', 2, 160], ['elk', 'vermilion', 2, 180], ['sheep', 'malignewild', 3, 120], ['sheep', 'wilcox', 3, 120], ['sheep', 'radium', 2, 100], ['sheep', 'abraham', 2, 130],
    ['goat', 'goats', 3, 90], ['goat', 'tangle', 2, 80], ['goat', 'sixglaciers', 2, 80], ['bear', 'bvpwild', 2, 240], ['bear', 'malignewild', 1, 200], ['bear', 'larch', 1, 160], ['bear', 'sunwapta', 1, 160],
    ['moose', 'waterfowl', 1, 140], ['moose', 'medicine', 1, 160], ['moose', 'vermilion', 1, 150], ['moose', 'annette', 1, 140], ['deer', 'banffave', 2, 220], ['deer', 'jasper', 2, 240], ['deer', 'lakelouise', 1, 160]].forEach(([sp, id, n, r]) => { for (let i = 0; i < n; i++) mkAnimal(sp, P[id], r); });
  function updAnimal(a, dt) {
    if (a.moving) {
      a.ph += dt * 7; const dx = a.tx - a.x; const dy = a.ty - a.y; const d = Math.hypot(dx, dy);
      if (d < 3) { a.moving = false; a.t = 3 + rnd() * 8; } else { a.x += (dx / d) * a.spd * dt; a.y += (dy / d) * a.spd * dt; if (Math.abs(dx) > 0.5) a.face = dx > 0 ? 1 : -1; }
    } else {
      a.t -= dt;
      if (a.t <= 0) {
        for (let k = 0; k < 8; k++) { const ang = rnd() * TAU; const d = rnd() * a.r; const x = a.hx + Math.cos(ang) * d; const y = a.hy + Math.sin(ang) * d * 0.8; if (!W.inLake(x, y, 24)) { a.tx = x; a.ty = y; a.moving = true; break; } }
        if (!a.moving) a.t = 2;
      }
    }
  }
  const eagles = Array.from({ length: 5 }, (_, i) => { const h = HUBS[['banff', 'louise', 'icefield', 'jasper', 'maligne'][i]]; return { id: uid++, cx: h.x + (rnd() - 0.5) * 200, cy: h.y - 120, r: 220 + rnd() * 160, a: rnd() * TAU, w: (rnd() < 0.5 ? 1 : -1) * (0.22 + rnd() * 0.14), alt: 46 + rnd() * 16, x: 0, y: 0, face: 1 }; });
  function updEagle(e, dt) { e.a += e.w * dt; e.x = e.cx + Math.cos(e.a) * e.r; e.y = e.cy + Math.sin(e.a) * e.r * 0.7; e.face = -Math.sin(e.a) * e.w > 0 ? 1 : -1; }

  /* ---------- cars, trains, ice explorer ---------- */
  const cars = [];
  const CAR_COLS = ['#e8503a', '#3a8fc7', '#ffc93c', '#3fb68b', '#8f7be0', '#f4f1ea', '#ff9a4d', '#2b6cb0'];
  // the traffic mix on the parkway: campers, Wranglers (some lifted), pickups, a convertible, SUVs, muscle cars and coaches
  const JEEP_COLS = ['#26262e', '#f4f4f0', '#ffd23c', '#3a8f4a'];
  function carSpec() {
    const r = rnd();
    if (r < 0.14) return { type: 'rv', col: pick(['#3a8fc7', '#d9482f', '#3fb68b', '#ffc93c', '#8f7be0']) };
    if (r < 0.34) { const col = pick(JEEP_COLS); return { type: 'jeep', col, lift: rnd() < 0.45, top: col === '#26262e' ? '#3a3a46' : rnd() < 0.5 ? '#26262e' : undefined }; }
    if (r < 0.48) return rnd() < 0.5 ? { type: 'pickup', model: 'raptor', col: pick(['#ff7a1a', '#6e7480', '#2b5fbf', '#f4f4f0']) } : { type: 'pickup', model: 'tundra', col: pick(['#f4f4f0', '#aeb4be', '#c0392b', '#26262e']) };
    if (r < 0.56) return { type: 'm4', col: pick(['#2f6fe0', '#ffd23c', '#e8303a', '#f4f4f0', '#8f7be0']) };
    if (r < 0.70) return { type: 'x5', col: pick(['#26262e', '#f4f4f0', '#8a909c', '#2b4a7a', '#7a4a3a']) };
    if (r < 0.78) return { type: 'gls', col: pick(['#26262e', '#c9ced6', '#f4f4f0', '#3a3a46']) };
    if (r < 0.90) return { type: 'muscle', col: pick(['#ff7a1a', '#ffd23c', '#e8303a', '#26262e', '#2f6fe0', '#3fb68b']) };
    return { type: 'tourbus', col: pick(['#3a8fc7', '#d9482f', '#2f7d5b', '#8f7be0']) };
  }
  for (let i = 0; i < 40; i++) {
    const ri = Math.floor(rnd() * ROADS.length); const sp = carSpec();
    cars.push({ id: uid++, ri, dir: rnd() < 0.5 ? 1 : -1, s: rnd() * ROADS[ri].line.len, v: 105 + rnd() * 55, ...sp, len: S.VLEN[sp.type] * 0.78, x: 0, y: 0, ang: 0, jam: false, jt: 0 });
  }
  function updCar(c, dt) {
    const line = ROADS[c.ri].line; const q = W.posAt(line, c.s); const jm = jamAt(q[0], q[1]); c.jam = !!jm;
    let v = c.v * (jm ? 0.12 : 1);
    for (const o of cars) { if (o !== c && o.ri === c.ri && o.dir === c.dir) { const gap = (o.s - c.s) * c.dir; if (gap > 0 && gap < (c.len + o.len) / 2 + 14) v = Math.min(v, o.v * 0.8); } }
    c.s += c.dir * v * dt;
    if (jm && time - c.jt > 40) { c.jt = time; if (rnd() < 0.5) addLog(tx('logJam')); }
    if (c.s > line.len || c.s < 0) {
      const hub = c.s > line.len ? ROADS[c.ri].b : ROADS[c.ri].a; const opts = radj[hub].filter((e) => e[0] !== c.ri); const e = opts.length ? pick(opts) : radj[hub][0];
      c.ri = e[0]; c.dir = e[1]; c.s = c.dir > 0 ? 1 : ROADS[c.ri].line.len - 1;
    }
    const q2 = W.posAt(ROADS[c.ri].line, c.s); const a = q2[2] + (c.dir < 0 ? Math.PI : 0); const off = 7;
    c.x = q2[0] - Math.sin(a) * off; c.y = q2[1] + Math.cos(a) * off; c.ang = a;
  }
  const railLine = RAIL[0].line;
  const trains = [
    { id: 'rm', n: 4, s: railLine.len * 0.3, dir: 1, v: 120, wait: 0, cars: [] },
    { id: 'freight', n: 8, s: railLine.len * 0.75, dir: -1, v: 95, wait: 0, cars: [] },
  ];
  trains.forEach((t) => { for (let i = 0; i < t.n; i++) t.cars.push({ id: t.id, car: i > 0, k: i, x: 0, y: 0, ang: 0, tr: t, sx: 0, sy: 0, sk: 1 }); });
  function updTrain(t, dt) {
    if (t.wait > 0) t.wait -= dt; else {
      t.s += t.dir * t.v * dt;
      if (t.s > railLine.len + t.n * 34 || t.s < -t.n * 34) { t.dir *= -1; t.s = clamp(t.s, -t.n * 34, railLine.len + t.n * 34); t.wait = 7; }
    }
    t.cars.forEach((c, i) => { const s = clamp(t.s - t.dir * i * 36, 0, railLine.len); const q = W.posAt(railLine, s); c.x = q[0]; c.y = q[1]; c.ang = q[2] + (t.dir < 0 ? Math.PI : 0); });
  }
  const iceLine = P.icefield && P.athglacier ? W.mkLine([[P.icefield.x + 40, P.icefield.y + 30], [(P.icefield.x + P.athglacier.x) / 2, (P.icefield.y + P.athglacier.y) / 2 + 30], [P.athglacier.x - 30, P.athglacier.y + 8]]) : null;
  // the icefield is closed to visitors in winter: no hikers, no Ice Explorer
  const winterEmpty = (x, y) => sea.bare > 0.5 && Math.hypot(x - HUBS.icefield.x, (y - HUBS.icefield.y) * 1.3) < HUBS.icefield.R + 320;
  const hidden = (p) => !p.owner && p.st !== 'drive' && winterEmpty(p.x, p.y);
  const iceBus = { id: 'ice', s: 0, dir: 1, v: 38, wait: 3, x: 0, y: 0, ang: 0, sx: 0, sy: 0, sk: 1 };
  function updBus(b, dt) {
    if (!iceLine) return;
    if (b.wait > 0) b.wait -= dt; else { b.s += b.dir * b.v * dt; if (b.s > iceLine.len || b.s < 0) { b.dir *= -1; b.s = clamp(b.s, 0, iceLine.len); b.wait = 6; } }
    const q = W.posAt(iceLine, b.s); b.x = q[0]; b.y = q[1]; b.ang = q[2] + (b.dir < 0 ? Math.PI : 0);
  }

  // canoes (warm months) and skaters (winter) on the lakes
  const lakeFolk = [];
  LAKES.forEach((L, i) => { const n = L.rx > 400 ? 4 : 3; for (let k = 0; k < n; k++) lakeFolk.push({ L, a: rnd() * TAU, r: 0.2 + rnd() * 0.5, w: (rnd() < 0.5 ? 1 : -1) * (0.05 + rnd() * 0.07), skate: k === n - 1 ? false : null, col: pick(S.JACKS), x: 0, y: 0, dir: 1, kind: k % 2 ? 'canoe' : 'both' }); });
  function updFolk(q, dt) {
    q.a += q.w * dt; const L = L_(q); const lx = Math.cos(q.a) * L.rx * q.r; const ly = Math.sin(q.a) * L.ry * q.r; const c = Math.cos(L.rot); const s = Math.sin(L.rot);
    q.x = L.x + lx * c - ly * s; q.y = L.y + lx * s + ly * c; q.dir = -Math.sin(q.a) * q.w > 0 ? 1 : -1;
  }
  const L_ = (q) => q.L;

  /* ---------- clouds, particles ---------- */
  const clouds = Array.from({ length: 26 }, () => ({ x: BOUNDS.x0 + rnd() * (BOUNDS.x1 - BOUNDS.x0), y: BOUNDS.y0 + rnd() * (BOUNDS.y1 - BOUNDS.y0), s: 0.8 + rnd() * 1.3, v: 7 + rnd() * 9, a: 0.55 + rnd() * 0.3 }));
  const parts = Array.from({ length: 150 }, () => ({ x: rnd(), y: rnd(), v: 0.5 + rnd(), p: rnd() * 6, s: 0.6 + rnd() * 0.9, c: rnd() }));
  const stars = Array.from({ length: 150 }, () => ({ x: rnd(), y: rnd() * 0.7, r: 0.6 + rnd() * 1.4, p: rnd() * 6 }));

  /* ---------- selection, follow ---------- */
  let sel = null; // {type:'place', p} | {type:'train', id}
  let followT = null; let followIsPerson = false;
  const favs = new Set((() => { try { return JSON.parse(store.get('bj-fav', '[]')); } catch (e) { return []; } })());
  const saveFavs = () => store.set('bj-fav', JSON.stringify([...favs]));
  let labelsOn = true; let emperor = false; let planRoute = null;
  const selPlaceId = () => (sel && sel.type === 'place' ? sel.p.id : null);

  function showCard(html, color, emojiSign) {
    const c = $('card');
    c.innerHTML = `<div class="sign" style="background:${color}">${emojiSign}</div><div class="body">${html}</div><button class="x" type="button" aria-label="${esc(tx('close'))}">×</button>`;
    c.classList.add('show'); c.querySelector('.x').addEventListener('click', clearSel);
    return c;
  }
  function placeCard(p) {
    const area = areaOf(p); const col = AREA_COL[area];
    const c = showCard(
      `<h3>${esc(nameOf(p))}</h3><div class="sub" lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(p))}</div>` +
      `<div class="tags"><span class="tag" style="background:${CAT_COL[p.cat]}">${p.emoji} ${esc(catName(p.cat))}</span><span class="tag" style="background:${col}">${esc(tx('areas')[area])}${p.far ? esc(tx('dayTrip')) : ''}</span></div>` +
      `<p>${esc(ptext(p, 'blurb'))}</p><div class="tip">💡 ${esc(ptext(p, 'tip'))}</div>` +
      `<div class="acts"><button class="btn" data-a="fav" type="button">${favs.has(p.id) ? tx('saved') : tx('save')}</button>` +
      `<button class="btn" data-a="route" type="button">${planSel.has(p.id) ? tx('inRoute') : tx('addRoute')}</button>` +
      `<a class="btn" href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}" target="_blank" rel="noopener">${esc(tx('osm'))}</a></div>`, col + '99', p.emoji);
    c.querySelector('[data-a="fav"]').addEventListener('click', () => { if (favs.has(p.id)) favs.delete(p.id); else favs.add(p.id); saveFavs(); placeCard(p); renderList(); renderPlanList(); });
    c.querySelector('[data-a="route"]').addEventListener('click', () => { if (planSel.has(p.id)) planSel.delete(p.id); else planSel.add(p.id); placeCard(p); renderPlanList(); updPlanCount(); });
  }
  function trainCard(id) {
    const T = tx('trains')[id]; const emo = { rm: '🚂', freight: '🚃', ice: '🚌' }[id];
    const c = showCard(`<h3>${esc(T.name)}</h3><div class="sub">${esc(T.route)}</div><div class="tags"><span class="tag">${emo} ${esc(tx('trainTag'))}</span></div><p>${esc(T.blurb)}</p><div class="tip">💡 ${esc(T.tip)}</div><div class="acts"><button class="btn" data-a="ride" type="button">${esc(tx('rideTrain'))}</button></div>`, '#7ccbf599', emo);
    c.querySelector('[data-a="ride"]').addEventListener('click', () => { followTarget(id === 'ice' ? iceBus : trains.find((t) => t.id === id).cars[0]); });
  }
  function select(id, fly) {
    const p = P[id]; if (!p) return; sel = { type: 'place', p }; placeCard(p);
    if (fly !== false) { followT = null; updFollowUI(); setCam(p.x, p.y - 20, clamp(cam.tz, 0.8, 1.2)); }
    document.querySelectorAll('.it').forEach((e) => e.classList.toggle('sel', e.dataset.id === id));
  }
  function clearSel() { sel = null; $('card').classList.remove('show'); document.querySelectorAll('.it.sel').forEach((e) => e.classList.remove('sel')); }

  const followBar = $('follow');
  function followTarget(o, isPerson) { followT = o; followIsPerson = !!isPerson; if (!isPerson) $('bFollow').classList.remove('on'); updFollowUI(); }
  function stopFollow() { followT = null; emperor = false; $('bEmperor').classList.remove('on'); $('bFollow').classList.remove('on'); $('bEmperor').setAttribute('aria-pressed', 'false'); $('bFollow').setAttribute('aria-pressed', 'false'); updFollowUI(); }
  let lastFollowKey = '';
  function updFollowUI() {
    if (!followT) { followBar.classList.remove('show'); lastFollowKey = ''; return; }
    let name; let dest = '';
    if (followIsPerson) { name = followT.owner ? tx('rangerName') : personName(followT); if (followT.st === 'walk' && followT.dest && followT.dest.name) dest = nameOf(followT.dest); else if (followT.st === 'drive') dest = HUBS[followT.toHub][lang] || HUBS[followT.toHub].en; } else if (followT.id === 'ice') name = tx('trains').ice.short; else name = tx('trains')[followT.id].short;
    const key = name + '|' + dest + lang; if (key === lastFollowKey) return; lastFollowKey = key;
    followBar.innerHTML = `<span>${esc(tx('followingPre'))} <b>${esc(name)}</b>${dest ? ' ' + esc(tx('followingTo')) + ' <b>' + esc(dest) + '</b>' : ''}</span>` + (followIsPerson ? `<button type="button" data-a="next">${esc(tx('followingNext'))}</button>` : '') + `<button type="button" data-a="stop">${esc(tx('followingStop'))}</button>`;
    followBar.classList.add('show');
    const nx = followBar.querySelector('[data-a="next"]'); if (nx) nx.addEventListener('click', () => followTarget(pick(people.filter((q) => !q.owner && q !== followT)), true));
    followBar.querySelector('[data-a="stop"]').addEventListener('click', stopFollow);
  }

  /* ---------- panels, list ---------- */
  const PANELS = { drawer: { el: $('drawer'), btn: $('bList') }, plan: { el: $('plan'), btn: $('bPlan') }, log: { el: $('log'), btn: $('bLog') } };
  function openPanel(name) {
    Object.keys(PANELS).forEach((k) => { const on = k === name; PANELS[k].el.classList.toggle('show', on); PANELS[k].btn.classList.toggle('on', on); PANELS[k].btn.setAttribute(k === 'drawer' ? 'aria-expanded' : 'aria-pressed', String(on)); });
  }
  function closePanel(name) { PANELS[name].el.classList.remove('show'); PANELS[name].btn.classList.remove('on'); PANELS[name].btn.setAttribute(name === 'drawer' ? 'aria-expanded' : 'aria-pressed', 'false'); }
  function togglePanel(name) { if (PANELS[name].el.classList.contains('show')) closePanel(name); else openPanel(name); }

  let catFilter = 'all'; let query = '';
  function renderChips() {
    const wrap = $('cats'); const items = [['all', tx('chipAll'), null], ['fav', tx('chipFav'), null], ...AREA_ORDER.map((a) => [a, tx('areas')[a], AREA_COL[a]])];
    wrap.innerHTML = items.map(([k, label, col]) => `<button type="button" class="chip${catFilter === k ? ' on' : ''}" data-k="${k}">${col ? `<i style="background:${col}"></i>` : ''}${esc(label)}</button>`).join('');
    wrap.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { catFilter = b.dataset.k; renderChips(); renderList(); }));
  }
  function matches(p) {
    if (catFilter === 'fav' && !favs.has(p.id)) return false;
    if (catFilter !== 'all' && catFilter !== 'fav' && areaOf(p) !== catFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase(); return (p.name + ' ' + p.zh + ' ' + ptext(p, 'blurb') + ' ' + ptext(p, 'tip') + ' ' + p.emoji + ' ' + catName(p.cat)).toLowerCase().includes(q);
  }
  function renderList() {
    const list = $('list'); const out = [];
    AREA_ORDER.forEach((a) => {
      const items = PLACES.filter((p) => areaOf(p) === a && matches(p)); if (!items.length) return;
      out.push(`<div class="grp" style="border-color:${AREA_COL[a]}">${esc(tx('areas')[a])}</div>`);
      items.forEach((p) => out.push(`<button type="button" class="it${selPlaceId() === p.id ? ' sel' : ''}" data-id="${p.id}"><span class="em" style="background:${CAT_COL[p.cat]}55">${p.emoji}</span><span class="tx">${esc(nameOf(p))}<small lang="${lang === 'zh' ? 'en' : 'zh'}">${esc(subOf(p))}</small></span>${favs.has(p.id) ? '<span class="star">⭐</span>' : ''}</button>`));
    });
    list.innerHTML = out.length ? out.join('') : `<div class="empty">${esc(tx('noMatches'))}</div>`;
    list.querySelectorAll('.it').forEach((b) => b.addEventListener('click', () => select(b.dataset.id)));
  }

  /* ---------- route planner ---------- */
  const planSel = new Set();
  const STARTS = { banff: { lat: 51.178, lng: -115.571, hub: 'banff' }, louise: { lat: 51.425, lng: -116.18, hub: 'louise' }, jasper: { lat: 52.873, lng: -118.08, hub: 'jasper' } };
  const MODES = { walk: [4.5, 0], bike: [12, 3], shuttle: [30, 10], car: [60, 6] };
  const PACE = { fast: 0.7, normal: 1, slow: 1.4 };
  const STAY = { lake: 60, view: 40, falls: 30, hike: 180, wild: 45, fun: 120, food: 45 };
  function renderPlanLists() {
    const sel_ = (id, opts, cur) => { const e = $(id); const v = e.value || cur; e.innerHTML = opts.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join(''); e.value = v; if (e.value !== v) e.value = cur; };
    sel_('pFrom', [['banff', tx('fromBanff')], ['louise', tx('fromLouise')], ['jasper', tx('fromJasper')], ['first', tx('fromFirst')]], 'banff');
    sel_('pMode', Object.keys(MODES).map((k) => [k, tx('modes')[k]]), 'car');
    sel_('pPace', Object.keys(PACE).map((k) => [k, tx('paces')[k]]), 'normal');
    renderPlanList(); updPlanCount();
  }
  function renderPlanList() {
    const box = $('pList'); const out = [];
    AREA_ORDER.forEach((a) => PLACES.filter((p) => areaOf(p) === a).forEach((p) => out.push(`<label class="pi"><input type="checkbox" data-id="${p.id}"${planSel.has(p.id) ? ' checked' : ''}><span>${p.emoji} ${esc(nameOf(p))}</span></label>`)));
    box.innerHTML = out.join('');
    box.querySelectorAll('input').forEach((i) => i.addEventListener('change', () => { if (i.checked) planSel.add(i.dataset.id); else planSel.delete(i.dataset.id); updPlanCount(); }));
  }
  const updPlanCount = () => { $('pCount').textContent = fmt(tx('selected'), { n: planSel.size }); };
  function hav(a, b) { const r = Math.PI / 180; const dLat = (b.lat - a.lat) * r; const dLng = (b.lng - a.lng) * r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); }
  const hhmm = (m) => { m = Math.round(m) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function legPath(a, b) { // a, b are places; a may be {hub, start:true}
    const ha = a.hub; const hb = b.hub; const pts = [];
    if (ha === hb) return W.walkPath(ha, a.start ? '@gate' : a.id, b.id);
    W.walkPath(ha, a.start ? '@gate' : a.id, '@gate').forEach((q) => pts.push(q));
    W.roadPoints(W.hubRoute(ha, hb)).forEach((q) => pts.push(q));
    W.walkPath(hb, '@gate', b.id).forEach((q) => pts.push(q));
    return pts;
  }
  function planGo() {
    const out = $('pOut'); const chosen = PLACES.filter((p) => planSel.has(p.id));
    if (chosen.length < 2) { out.innerHTML = `<div class="muted">${esc(tx('needTwo'))}</div>`; planRoute = null; return; }
    const from = $('pFrom').value; const mode = $('pMode').value; const pace = PACE[$('pPace').value]; const [spd, ovh] = MODES[mode];
    const tparts = ($('pTime').value || '09:30').split(':'); let clock = (parseInt(tparts[0], 10) || 9) * 60 + (parseInt(tparts[1], 10) || 0); const t0 = clock;
    let cur = from === 'first' ? null : { ...STARTS[from], start: true };
    const left = [...chosen]; const order = [];
    if (!cur) { cur = left.shift(); order.push(cur); }
    while (left.length) { let bi = 0; let bd = 1e9; left.forEach((p, i) => { const d = hav(cur, p); if (d < bd) { bd = d; bi = i; } }); cur = left.splice(bi, 1)[0]; order.push(cur); }
    let prev = from === 'first' ? null : { ...STARTS[from], start: true }; let km = 0; const rows = []; const segs = []; let late = false;
    order.forEach((p, i) => {
      let leg = null;
      if (prev) { const d = hav(prev, p) * 1.3; km += d; const m = (d / spd) * 60 + ovh; clock += m; leg = { d, m }; segs.push(legPath(prev, p)); }
      const stay = Math.round((p.mins || STAY[p.cat] || 45) * pace); const arrive_ = clock; clock += stay; const isLate = arrive_ > 20.5 * 60 || clock > 21 * 60; if (isLate) late = true;
      rows.push({ p, leg, arrive: arrive_, stay, isLate, i }); prev = p;
    });
    const legKey = { walk: 'legWalk', bike: 'legBike', shuttle: 'legShuttle', car: 'legCar' }[mode];
    const warns = [];
    if (km > 220) warns.push(tx('tripBlock')); if (order.some((p) => p.far)) warns.push(tx('farWarn')); if (clock - t0 > 600) warns.push(tx('longDay')); if (late) warns.push(tx('late'));
    out.innerHTML = `<div class="sum">${esc(fmt(tx('summary'), { n: order.length, km: Math.round(km), t: hhmm(clock) }))}</div>` + warns.map((w) => `<div class="warn">⚠️ ${esc(w)}</div>`).join('') +
      `<ul class="tl">${rows.map((r) => `${r.leg ? `<li class="leg">${tx(legKey)} ${Math.round(r.leg.m)} min · ${Math.round(r.leg.d)} km</li>` : ''}<li class="stop"><span class="no">${r.i + 1}</span><div><div class="tm">${hhmm(r.arrive)} <small>· ${esc(tx('stay'))} ${r.stay} min</small></div><div class="nm${r.isLate ? ' late' : ''}">${r.p.emoji} ${esc(nameOf(r.p))}</div><a href="https://www.openstreetmap.org/?mlat=${r.p.lat}&mlon=${r.p.lng}#map=17/${r.p.lat}/${r.p.lng}" target="_blank" rel="noopener">${esc(tx('osm'))}</a></div></li>`).join('')}</ul>`;
    planRoute = { stops: order, segs };
    let x0 = 1e9; let y0 = 1e9; let x1 = -1e9; let y1 = -1e9; const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    order.forEach((p) => add(p.x, p.y)); segs.forEach((s) => s.forEach((q) => add(q[0], q[1])));
    followT = null; updFollowUI(); fitBox(x0 - 150, y0 - 200, x1 + 150, y1 + 150, 1, window.innerWidth > 800 ? 440 : 0);
  }

  /* ---------- drawing: ground layers ---------- */
  const rgb = (a) => `rgb(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])})`;
  function pathPts(pts, close) { g.beginPath(); for (let i = 0; i < pts.length; i++) { const X = sx(pts[i][0]); const Y = sy(pts[i][1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); } if (close) g.closePath(); }
  function inView(x, y, m) { const X = sx(x); const Y = sy(y); return X > -m && X < Wc + m && Y > -m && Y < Hc + m; }

  function drawTufts() {
    if (cam.z < 0.38) return;
    const step = 78; const [wx0, wy0] = toWorld(0, 0); const [wx1, wy1] = toWorld(Wc, Hc);
    const i0 = Math.floor(wx0 / step); const i1 = Math.floor(wx1 / step); const j0 = Math.floor(wy0 / step); const j1 = Math.floor(wy1 / step);
    if ((i1 - i0) * (j1 - j0) > 2600) return;
    g.strokeStyle = sea.bare > 0.5 ? 'rgba(150,185,205,.5)' : 'rgba(60,120,60,.32)'; g.lineWidth = Math.max(1, 1.6 * cam.z); g.lineCap = 'round'; g.beginPath();
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (W.h2(i, j, 61) < 0.55) continue; const x = (i + W.h2(i, j, 62)) * step; const y = (j + W.h2(i, j, 63)) * step; if (W.maskAt(x, y)) continue;
      const X = sx(x); const Y = sy(y); const s = 7 * cam.z; g.moveTo(X - s, Y); g.lineTo(X - s * 0.6, Y - s); g.moveTo(X, Y); g.lineTo(X, Y - s * 1.3); g.moveTo(X + s, Y); g.lineTo(X + s * 0.6, Y - s);
    }
    g.stroke();
  }
  function drawGlaciers() {
    GLACIERS.forEach((G) => {
      if (!inView(G.x, G.y, Math.max(G.rx, G.ry) * cam.z + 40)) return;
      pathPts(G.shape, true); g.fillStyle = '#eaf8ff'; g.fill(); g.lineWidth = Math.max(1.5, 2.6 * cam.z); g.strokeStyle = INK; g.stroke();
      if (cam.z > 0.25) {
        g.save(); pathPts(G.shape, true); g.clip(); g.strokeStyle = 'rgba(110,170,210,.55)'; g.lineWidth = Math.max(1, 2 * cam.z); g.beginPath();
        for (let k = -4; k <= 4; k++) { const ox = k * G.rx * 0.2; g.moveTo(sx(G.x + ox - G.rx * 0.1), sy(G.y - G.ry)); g.lineTo(sx(G.x + ox + G.rx * 0.1), sy(G.y + G.ry)); }
        g.stroke(); g.restore();
      }
    });
    drawMelt();
  }
  // meltwater from the Columbia Icefield: three streams into a pond, then a channel to the Athabasca River
  function drawMelt() {
    const M = W.MELT; if (!M || !inView(M.pond.x, M.pond.y, 700 * cam.z + 200)) return;
    const frozen = sea.bare > 0.5; const wc = frozen ? '#f4fbff' : '#4cc3e0'; const z = cam.z;
    const flow = (pts, w0) => {
      pathPts(pts, false); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = Math.max(2.5, (w0 + 5) * z); g.stroke();
      g.strokeStyle = wc; g.lineWidth = Math.max(1.4, w0 * z); g.stroke();
      if (z > 0.3 && !frozen) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1, 2.2 * z); g.setLineDash([10 * z, 16 * z]); g.lineDashOffset = -time * 40 * z; g.stroke(); g.setLineDash([]); }
    };
    flow(M.out, 12); M.streams.forEach((st) => flow(st, 9));
    const px = sx(M.pond.x); const py = sy(M.pond.y);
    g.beginPath(); g.ellipse(px, py, M.pond.rx * z, M.pond.ry * z * cam.tilt * 1.4, 0, 0, TAU); g.fillStyle = frozen ? '#ffffff' : '#59c6dc'; g.fill(); g.lineWidth = Math.max(1.6, 3 * z); g.strokeStyle = INK; g.stroke();
    if (z > 0.3) {
      g.save(); g.beginPath(); g.ellipse(px, py, M.pond.rx * z, M.pond.ry * z * cam.tilt * 1.4, 0, 0, TAU); g.clip(); g.strokeStyle = frozen ? 'rgba(150,200,225,.7)' : 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, 2 * z);
      for (let i = 0; i < 3; i++) { const o = frozen ? 0 : Math.sin(time * 1.6 + i * 2) * 5 * z; g.beginPath(); g.moveTo(px - 38 * z + o + i * 6 * z, py + (i - 1) * 9 * z * cam.tilt); g.quadraticCurveTo(px + i * 8 * z, py + (i - 1) * 9 * z * cam.tilt - 5 * z, px + 38 * z + o, py + (i - 1) * 9 * z * cam.tilt); g.stroke(); }
      g.restore();
    }
  }
  function drawLakes() {
    const frozen = sea.bare;
    LAKES.forEach((L) => {
      if (!inView(L.x, L.y, Math.max(L.rx, L.ry) * cam.z + 60)) return;
      pathPts(L.rim, true); g.fillStyle = sea.bare > 0.5 ? '#ffffff' : '#e8dcb4'; g.fill(); g.lineWidth = Math.max(1.5, 2.8 * cam.z); g.strokeStyle = INK; g.stroke();
      pathPts(L.shape, true);
      g.fillStyle = frozen > 0.5 ? '#d8f1fa' : L.col; g.fill();
      g.lineWidth = Math.max(1, 1.8 * cam.z); g.stroke();
      if (cam.z < 0.2) return;
      g.save(); pathPts(L.shape, true); g.clip();
      // lighter shallows
      g.globalAlpha = 0.28; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(sx(L.x - L.rx * 0.18), sy(L.y - L.ry * 0.2), L.rx * 0.55 * cam.z, L.ry * 0.5 * cam.z * cam.tilt, L.rot, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (frozen > 0.5) {
        g.strokeStyle = 'rgba(110,160,200,.6)'; g.lineWidth = Math.max(1, 1.8 * cam.z); g.beginPath();
        L.cracks.forEach((c) => { g.moveTo(sx(L.x + c[0] * L.rx), sy(L.y + c[1] * L.ry)); g.lineTo(sx(L.x + c[2] * L.rx), sy(L.y + c[3] * L.ry)); }); g.stroke();
      } else {
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, 1.8 * cam.z); g.lineCap = 'round'; g.beginPath();
        L.spark.forEach((s) => { const tw = Math.sin(time * 1.6 + s[2]); if (tw < 0.1) return; const x = L.x + Math.cos(s[0]) * L.rx * s[1]; const y = L.y + Math.sin(s[0]) * L.ry * s[1]; const X = sx(x); const Y = sy(y); const w = 9 * cam.z * tw; g.moveTo(X - w, Y); g.quadraticCurveTo(X, Y - w * 0.5, X + w, Y); });
        g.stroke();
      }
      g.restore();
    });
  }
  function drawRivers() {
    const wc = sea.bare > 0.5 ? '#cfeef7' : '#59c6dc';
    RIVERS.forEach((r) => {
      pathPts(r.pts, false); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = Math.max(3, (r.w + 7) * cam.z); g.stroke();
      g.strokeStyle = wc; g.lineWidth = Math.max(1.5, r.w * cam.z); g.stroke();
      if (cam.z > 0.35 && sea.bare < 0.5) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1, 2 * cam.z); g.setLineDash([12 * cam.z, 20 * cam.z]); g.lineDashOffset = -time * 22 * cam.z; g.stroke(); g.setLineDash([]); }
    });
  }
  function drawPaths() {
    if (cam.z < 0.3) return;
    const edges = []; Object.keys(WALK).forEach((h) => { const Wk = WALK[h]; Wk.edges.forEach(([i, j]) => edges.push([Wk.nodes[i], Wk.nodes[j]])); });
    g.lineCap = 'round'; g.beginPath(); edges.forEach(([a, b]) => { g.moveTo(sx(a.x), sy(a.y)); g.lineTo(sx(b.x), sy(b.y)); });
    g.strokeStyle = 'rgba(122,92,58,.55)'; g.lineWidth = Math.max(3, 12 * cam.z); g.stroke();
    g.strokeStyle = sea.bare > 0.5 ? '#f7fbfd' : '#ecd9a8'; g.lineWidth = Math.max(2, 8 * cam.z); g.stroke();
  }
  function drawRoads() {
    const lines = ROADS.map((r) => r.line.pts);
    const stroke = (col, w) => { g.beginPath(); lines.forEach((pts) => pts.forEach((q, i) => { const X = sx(q[0]); const Y = sy(q[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); })); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
    g.lineJoin = 'round'; g.lineCap = 'round';
    stroke(INK, Math.max(4, 38 * cam.z + 3)); stroke(sea.bare > 0.5 ? '#8c93a3' : '#6e7280', Math.max(2.4, 31 * cam.z));
    if (cam.z > 0.3) { g.setLineDash([16 * cam.z, 14 * cam.z]); g.lineCap = 'butt'; stroke('#ffd84a', Math.max(1, 2.6 * cam.z)); g.setLineDash([]); }
    // hub plazas
    Object.keys(HUBS).forEach((h) => { const H = HUBS[h]; if (!inView(H.x, H.y, 140 * cam.z + 40)) return; g.beginPath(); g.ellipse(sx(H.x), sy(H.y), 52 * cam.z, 52 * cam.z * cam.tilt, 0, 0, TAU); g.fillStyle = '#7b7f8c'; g.fill(); g.lineWidth = Math.max(1.5, 3 * cam.z); g.strokeStyle = INK; g.stroke(); });
  }
  // Highway 93 (Icefields Parkway): painted lettering that follows the road, plus highway shields
  const HWY93 = (() => {
    const order = ['louise', 'bowlake', 'crossing', 'icefield', 'sunwapta', 'jasper']; const pts = [];
    for (let i = 0; i + 1 < order.length; i++) {
      const r = ROADS.find((q) => (q.a === order[i] && q.b === order[i + 1]) || (q.b === order[i] && q.a === order[i + 1])); if (!r) continue;
      const seg = r.a === order[i] ? r.line.pts : r.line.pts.slice().reverse(); seg.forEach((q, j) => { if (i && !j) return; pts.push(q); });
    }
    return pts;
  })();
  function hwyShield(X, Y, sz) {
    g.save(); g.translate(X, Y); g.scale(sz, sz); g.lineJoin = 'round'; g.lineWidth = 0.1;
    g.beginPath(); g.moveTo(-0.5, -0.5); g.quadraticCurveTo(0, -0.62, 0.5, -0.5); g.lineTo(0.5, 0.1); g.quadraticCurveTo(0.5, 0.42, 0, 0.62); g.quadraticCurveTo(-0.5, 0.42, -0.5, 0.1); g.closePath();
    g.fillStyle = '#fffdf6'; g.fill(); g.strokeStyle = INK; g.stroke();
    g.save(); g.clip(); g.fillStyle = '#d8202f'; g.fillRect(-0.6, -0.7, 1.2, 0.3); g.restore();
    g.beginPath(); g.moveTo(-0.5, -0.5); g.quadraticCurveTo(0, -0.62, 0.5, -0.5); g.lineTo(0.5, 0.1); g.quadraticCurveTo(0.5, 0.42, 0, 0.62); g.quadraticCurveTo(-0.5, 0.42, -0.5, 0.1); g.closePath(); g.stroke();
    g.fillStyle = INK; g.font = `700 0.52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('93', 0, 0.12);
    g.restore();
  }
  function drawHwy() {
    const z = cam.z; if (z < 0.16 || HWY93.length < 2) return;
    const P2 = HWY93.map((q) => [sx(q[0]), sy(q[1])]); const cum = [0];
    for (let i = 1; i < P2.length; i++) cum.push(cum[i - 1] + Math.hypot(P2[i][0] - P2[i - 1][0], P2[i][1] - P2[i - 1][1]));
    const Ls = cum[cum.length - 1];
    const at2 = (s) => { s = clamp(s, 0, Ls); let lo = 0; let hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const a = P2[lo]; const b = P2[hi]; const t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; };
    const onScreen = (p, m) => p[0] > -m && p[0] < Wc + m && p[1] > -m && p[1] < Hc + m;
    const sz = clamp(26 * z, 9, 58); const label = tx('hwyName'); const chars = [...label];
    g.font = `700 ${sz}px ${FONT}`; const gap = sz * (lang === 'zh' ? 0.5 : 0.22); const ws = chars.map((ch) => g.measureText(ch).width + gap); const Tw = ws.reduce((a, b) => a + b, 0) - gap;
    const step = Math.max(Tw * 2.6, 380); const n = Math.max(1, Math.floor(Ls / step)); const sh = clamp(36 * z, 14, 64);
    for (let i = 0; i < n; i++) {
      const c0 = (i + 0.5) * Ls / n; const cp = at2(c0); if (!onScreen(cp, Tw)) continue;
      if (Ls / n < Tw * 1.3) continue;
      const dir = Math.cos(cp[2]) >= 0 ? 1 : -1; let off = -Tw / 2;
      g.save(); g.font = `700 ${sz}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      chars.forEach((ch, ci) => {
        const mid = off + (ws[ci] - gap) / 2; off += ws[ci]; const p = at2(c0 + dir * mid);
        g.save(); g.translate(p[0], p[1]); g.rotate(p[2] + (dir < 0 ? Math.PI : 0));
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(ch, 0, sz * 0.12);
        g.lineWidth = sz * 0.3; g.strokeStyle = INK; g.strokeText(ch, 0, 0);
        const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#ffd23c'); gr.addColorStop(1, '#ff8a2a');
        g.fillStyle = gr; g.fillText(ch, 0, 0); g.restore();
      });
      g.restore();
    }
    // shields between the lettering (and near both ends)
    const sp = []; for (let i = 0; i <= n; i++) sp.push(clamp(i * Ls / n, Ls * 0.06, Ls * 0.94));
    sp.forEach((s0) => { const p = at2(s0); if (onScreen(p, sh)) hwyShield(p[0], p[1] - sh * 0.25, sh); });
  }
  function drawRail() {
    const pts = railLine.pts; g.lineCap = 'butt';
    pathPts(pts, false); g.strokeStyle = INK; g.lineWidth = Math.max(3, 12 * cam.z); g.stroke();
    g.strokeStyle = '#9c8a6a'; g.lineWidth = Math.max(1.5, 8 * cam.z); g.stroke();
    if (cam.z > 0.3) { g.setLineDash([3 * cam.z, 9 * cam.z]); g.strokeStyle = '#4a3a2a'; g.lineWidth = Math.max(2, 12 * cam.z); g.stroke(); g.setLineDash([]); }
  }

  /* ---------- drawing: y-sorted world ---------- */
  const dyn = [];
  const boost = () => (cam.z < 0.6 ? Math.min(2.2, Math.sqrt(0.6 / cam.z)) : 1);
  function collect() {
    dyn.length = 0; const z = cam.z; const B = boost();
    const vis = (x, y) => { const X = sx(x); const Y = sy(y); return X > -70 && X < Wc + 70 && Y > -60 && Y < Hc + 130; };
    people.forEach((p) => { if (vis(p.x, p.y) && !hidden(p)) dyn.push({ y: p.y, t: 0, o: p }); });
    animals.forEach((a) => { if (vis(a.x, a.y)) dyn.push({ y: a.y, t: 1, o: a }); });
    cars.forEach((c) => { if (vis(c.x, c.y)) dyn.push({ y: c.y, t: 2, o: c }); });
    trains.forEach((t) => t.cars.forEach((c) => { if (vis(c.x, c.y)) dyn.push({ y: c.y, t: 3, o: c }); }));
    if (iceLine && sea.bare < 0.5 && vis(iceBus.x, iceBus.y)) dyn.push({ y: iceBus.y, t: 4, o: iceBus });
    const vc = 1 - sea.snow; const vs = sea.bare;
    lakeFolk.forEach((q) => {
      if (!vis(q.x, q.y)) return;
      if (q.kind === 'canoe' ? vc > 0.05 : (vc > 0.05 || vs > 0.05)) dyn.push({ y: q.y, t: 5, o: q, vis: vs > 0.5 ? vs : vc });
    });
    return B;
  }
  function drawDyn(d, B) {
    const o = d.o; const z = cam.z; const X = sx(o.x); const Y = sy(o.y); const k = z * B;
    switch (d.t) {
      case 0: if (o.st === 'drive') { S.car(truck, X, Y, k, o.face); o.sx = X; o.sy = Y; o.sk = k; } else S.person(o, X, Y, k); break;
      case 1: S.animal(o, X, Y, k); break;
      case 2: S.car(o, X, Y, k, Math.abs(Math.cos(o.ang)) > 0.1 ? Math.cos(o.ang) : 1); o.sk = k; break;
      case 3: S.train(o, X, Y, k, o.ang); if (!o.car) { o.sx = X; o.sy = Y; o.sk = k; } break;
      case 4: S.iceBus(o, X, Y, k, Math.cos(o.ang) >= 0 ? 1 : -1); break;
      case 5: { const warm = o.kind === 'canoe' || !o.skate; if (sea.bare > 0.5 && o.kind !== 'canoe') S.skater(o, X, Y, k * 0.9, o.dir, d.vis); else if (sea.snow < 0.7) S.canoe(o, X, Y, k, o.dir, 1 - sea.snow); void warm; break; }
      default:
    }
  }
  function drawWorld() {
    const z = cam.z; const ts = cam.tilt; const B = collect();
    dyn.sort((a, b) => a.y - b.y);
    const ymin = cam.y - (Hc / 2 + 30) / (z * ts); const ymax = cam.y + (Hc / 2 + 820 * z) / (z * ts);
    let i = lowerBound(statics, ymin); let di = 0; const n = statics.length; const night = env.n;
    while (true) {
      const s = i < n && statics[i].y <= ymax ? statics[i] : null; const d = di < dyn.length ? dyn[di] : null;
      if (!s && !d) break;
      if (s && (!d || s.y <= d.y)) {
        i++;
        const X = sx(s.x); if (X < -s.wide * z - 30 || X > Wc + s.wide * z + 30) continue;
        const Y = sy(s.y);
        if (s.type === 0) { if (z < 0.1 || (z < 0.2 && s.k % 4) || (z < 0.3 && s.k % 2)) continue; if (z < 0.46 || z * s.tr.s < 0.2) S.treeLite(X, Y, z, s.tr); else S.tree(X, Y, z, s.tr); } else if (s.type === 1) { if (z < 0.14 && !s.pk.named && s.k % 2) continue; S.peakBody(s.pk, X, Y, z); }
        else if (s.type === 2) S.place(s.b, X, Y, z, night);
        else if (window.TELE) window.TELE.draw(g, X, Y, z, time, night);
      } else { di++; drawDyn(d, B); }
    }
  }
  function drawSky() { // eagles and clouds
    const z = cam.z; const B = boost();
    eagles.forEach((e) => { const X = sx(e.x); const Y = sy(e.y, e.alt); if (X > -60 && X < Wc + 60 && Y > -60 && Y < Hc + 60) { S.eagle(e, X, Y, z * B * 1.1); } });
    clouds.forEach((c) => { const X = sx(c.x); const Y = sy(c.y, 560); if (X > -200 && X < Wc + 200 && Y > -120 && Y < Hc + 120) S.cloud(X, Y, c.s * Math.max(z, 0.25) * 1.4, c.a * (0.7 + 0.3 * (1 - env.n))); });
  }

  /* ---------- drawing: lighting, sky, particles ---------- */
  function drawTint() {
    g.save(); g.globalCompositeOperation = 'multiply';
    const m = [env.m[0] * sea.tint[0] / 255, env.m[1] * sea.tint[1] / 255, env.m[2] * sea.tint[2] / 255];
    g.fillStyle = rgb(m); g.fillRect(0, 0, Wc, Hc); g.restore();
    if (env.n > 0.12) {
      g.save(); g.globalCompositeOperation = 'lighter'; const a = Math.min(1, env.n * 0.95); let cnt = 0;
      for (const l of R.litList) {
        if (l[0] < -l[2] || l[0] > Wc + l[2] || l[1] < -l[2] || l[1] > Hc + l[2]) continue; if (cnt++ > 160) break;
        const gr = g.createRadialGradient(l[0], l[1], 0, l[0], l[1], l[2]); gr.addColorStop(0, `rgba(${l[3]},${0.55 * a})`); gr.addColorStop(1, `rgba(${l[3]},0)`); g.fillStyle = gr; g.fillRect(l[0] - l[2], l[1] - l[2], l[2] * 2, l[2] * 2);
      }
      g.restore();
    }
  }
  function drawNightSky() {
    const n = env.n; if (n < 0.3) return;
    g.save(); g.fillStyle = '#ffffff';
    stars.forEach((s) => { g.globalAlpha = clamp((n - 0.3) * 1.4, 0, 1) * (0.5 + 0.5 * Math.sin(time * 1.5 + s.p)) * 0.9; g.beginPath(); g.arc(s.x * Wc, s.y * Hc, s.r, 0, TAU); g.fill(); });
    g.restore();
    if (n > 0.6) {
      g.save(); g.globalCompositeOperation = 'lighter'; const a = (n - 0.6) * 1.8 * 0.5;
      for (let k = 0; k < 3; k++) {
        const col = ['80,255,170', '120,200,255', '190,130,255'][k]; g.beginPath(); g.moveTo(0, 0);
        for (let x = 0; x <= Wc; x += 24) { const y = Hc * (0.1 + k * 0.045) + Math.sin(x * 0.006 + time * 0.4 + k * 1.7) * Hc * 0.05 + Math.sin(x * 0.015 - time * 0.3) * Hc * 0.015; g.lineTo(x, y); }
        g.lineTo(Wc, 0); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, Hc * 0.4); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.7, `rgba(${col},${a * 0.5})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fill();
      }
      g.restore();
    }
  }
  function drawParts(dt) {
    if (sea.part < 0.04) return; const s = R.season; g.save();
    parts.forEach((p) => {
      const sp = s === 'winter' ? 0.06 : s === 'autumn' ? 0.045 : 0.035; p.y += p.v * sp * dt; p.x += Math.sin(time * 0.8 + p.p) * 0.02 * dt + 0.005 * dt;
      if (p.y > 1.05) { p.y = -0.05; p.x = rnd(); } if (p.x > 1.05) p.x = -0.05;
      const X = p.x * Wc; const Y = p.y * Hc; g.globalAlpha = sea.part * 0.9;
      if (s === 'winter') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X, Y, 1.6 + p.s * 1.8, 0, TAU); g.fill(); } else if (s === 'autumn') { g.fillStyle = p.c < 0.5 ? '#f2a93b' : p.c < 0.8 ? '#d9482f' : '#ffc93c'; g.save(); g.translate(X, Y); g.rotate(time * 1.4 + p.p); g.beginPath(); g.ellipse(0, 0, 5 * p.s, 2.6 * p.s, 0, 0, TAU); g.fill(); g.restore(); } else { g.fillStyle = p.c < 0.5 ? '#ffd0e0' : '#ffffff'; g.save(); g.translate(X, Y); g.rotate(time + p.p); g.beginPath(); g.ellipse(0, 0, 4 * p.s, 2.2 * p.s, 0, 0, TAU); g.fill(); g.restore(); }
    });
    g.restore();
  }

  /* ---------- drawing: labels, pins, bubbles ---------- */
  let placed = [];
  function rectFree(r) { for (const q of placed) if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) return false; placed.push(r); return true; }
  function pill(txt, X, Y, o) {
    o = o || {}; const size = o.size || 13; g.font = `600 ${size}px ${FONT}`; const w = g.measureText(txt).width + 16; const h = size + 9;
    const r = { x: X - w / 2, y: Y - h, w, h }; if (!o.force && !rectFree(r)) return false;
    g.save(); g.globalAlpha = o.alpha === undefined ? 1 : o.alpha; g.fillStyle = o.bg || '#fffdf6'; g.strokeStyle = INK; g.lineWidth = 2.4;
    S.rr(r.x, r.y, w, h, h / 2); g.fill(); g.stroke(); g.fillStyle = o.fg || INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, X, r.y + h / 2 + 0.5); g.restore(); return true;
  }
  function outlined(txt, X, Y, size, col, alpha) {
    g.save(); g.font = `700 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = alpha; g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.92)'; g.strokeText(txt, X, Y); g.fillStyle = col; g.fillText(txt, X, Y); g.restore();
  }
  let hover = null;
  function drawPins() {
    const z = cam.z; if (z < 0.1) return; const r = clamp(8 + z * 12, 9, 17); const sId = selPlaceId();
    PLACES.forEach((p) => {
      const b = p.b; const X = sx(p.x); if (X < -30 || X > Wc + 30) return; const top = (b.top || 50) * z; const baseY = sy(p.y);
      const bob = Math.sin(time * 2.2 + p.x * 0.01) * 2.2; const isSel = sId === p.id; const rr_ = isSel ? r * 1.25 : r;
      const Y = baseY - top - rr_ - 6 + bob - (isSel ? Math.abs(Math.sin(time * 5)) * 6 : 0); if (Y < -30 || Y > Hc + 40) return;
      p.pin = { x: X, y: Y, r: rr_ + 3 };
      if (!labelsOn && !isSel && !(hover && hover.p === p)) return;
      g.save(); g.beginPath(); g.arc(X, Y, rr_, 0, TAU); g.fillStyle = CAT_COL[p.cat]; g.fill(); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
      if (isSel) { g.beginPath(); g.arc(X, Y, rr_ + 5, 0, TAU); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke(); }
      g.beginPath(); g.moveTo(X - 4, Y + rr_ - 1); g.lineTo(X, Y + rr_ + 6); g.lineTo(X + 4, Y + rr_ - 1); g.fillStyle = CAT_COL[p.cat]; g.fill(); g.stroke();
      g.font = `${rr_ * 1.15}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(p.emoji, X, Y + 1); g.restore();
    });
  }
  function drawLabels() {
    placed = []; const z = cam.z; const sId = selPlaceId();
    if (z < 0.62) {
      const a = clamp((0.62 - z) / 0.12, 0, 1);
      Object.keys(HUBS).forEach((h) => { const H = HUBS[h]; const X = sx(H.x); const Y = sy(H.y) - 34 * z; if (X > -120 && X < Wc + 120 && Y > -30 && Y < Hc + 60) pill(H[lang] || H.en, X, Y, { bg: H.c, size: clamp(11 + (0.4 - z) * 16, 12, 20), alpha: a, force: true }); });
    }
    if (labelsOn && z > 0.1 && z < 0.9) {
      const a = clamp((0.9 - z) / 0.2, 0, 1) * clamp((z - 0.1) / 0.1, 0, 1);
      PEAKS.forEach((pk) => { if (!pk.named) return; const X = sx(pk.x); const Y = sy(pk.y, pk.h * 1.0) - 8; if (X < -80 || X > Wc + 80 || Y < -10 || Y > Hc + 20) return; const t = tx('peaks')[pk.key]; if (!t) return; const sz = clamp(11 + z * 6, 11, 16); g.font = `700 ${sz}px ${FONT}`; const w = g.measureText(t).width; if (rectFree({ x: X - w / 2, y: Y - sz, w, h: sz + 4 })) outlined(t, X, Y - sz / 2, sz, '#3b3b6a', a); });
    }
    if (z > 0.4 || sId || hover) {
      const list = []; if (sId) list.push(P[sId]); if (hover && hover.p) list.push(hover.p);
      if (labelsOn && z > 0.4) PLACES.forEach((p) => list.push(p));
      let cnt = 0;
      list.forEach((p) => { const X = sx(p.x); const Y = sy(p.y) + 20 + 4 * z; if (X < -80 || X > Wc + 80 || Y < -10 || Y > Hc + 40) return; const imp = p.id === sId || (hover && hover.p === p); if (!imp && cnt > 70) return; if (pill(nameOf(p), X, Y + 20, { size: clamp(11 + z * 2, 12, 14), bg: imp ? '#fff3c4' : '#fffdf6', force: imp })) cnt++; });
    }
    JAMS.forEach((j) => { if (z > 0.3 && inView(j.x, j.y, 40)) { g.font = `${clamp(20 * z, 14, 22)}px 'Apple Color Emoji','Segoe UI Emoji',sans-serif`; g.textAlign = 'center'; g.fillText('📷', sx(j.x), sy(j.y) - 24 * z + Math.sin(time * 4) * 2); } });
  }
  function wrapText(t, maxW) {
    const out = []; let line = ''; const isZh = lang === 'zh'; const toks = isZh ? [...t] : t.split(' ');
    toks.forEach((w) => { const test = line ? line + (isZh ? '' : ' ') + w : w; if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; });
    if (line) out.push(line); return out;
  }
  function drawBubbles(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; if (b.d > 0) { b.d -= dt; continue; } b.t -= dt; if (b.t <= 0) { bubbles.splice(i, 1); continue; }
      const o = b.o; if (!o.sx || (people.includes(o) && hidden(o))) continue; const X = o.sx; const Y = o.sy - 56 * (o.sk || 1) - 4; if (X < -100 || X > Wc + 100 || Y < -20 || Y > Hc + 40) continue;
      g.save(); g.font = `600 13px ${FONT}`; const lines = wrapText(b.text, 170); const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 18; const h = lines.length * 17 + 12;
      g.globalAlpha = Math.min(1, b.t * 2); g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 2.4; S.rr(X - w / 2, Y - h, w, h, 12); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(X - 6, Y - 1); g.lineTo(X, Y + 7); g.lineTo(X + 6, Y - 1); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.moveTo(X - 6, Y - 1.5); g.lineTo(X, Y + 7); g.lineTo(X + 6, Y - 1.5); g.stroke();
      g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, k) => g.fillText(l, X, Y - h + 6 + 8.5 + k * 17)); g.restore();
    }
  }
  function drawPlanRoute() {
    if (!planRoute) return; const z = cam.z;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    planRoute.segs.forEach((seg) => { if (seg.length < 2) return; pathPts(seg, false); g.strokeStyle = INK; g.lineWidth = clamp(11 * z, 5, 11); g.stroke(); g.strokeStyle = '#ff5a3c'; g.lineWidth = clamp(6 * z, 3, 6.5); g.setLineDash([clamp(14 * z, 8, 16), clamp(12 * z, 6, 12)]); g.lineDashOffset = -time * 24; g.stroke(); g.setLineDash([]); });
    planRoute.stops.forEach((p, i) => { const X = sx(p.x); const Y = sy(p.y, (p.b.top || 50) + 8); g.beginPath(); g.arc(X, Y, 13, 0, TAU); g.fillStyle = '#e8503a'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.fillStyle = '#fff'; g.font = `700 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), X, Y + 1); });
    g.restore();
  }
  function drawPortalLabel() {
    if (!window.TELE) return; const z = cam.z; const X = sx(PORTAL.x); const Y = sy(PORTAL.y, 92 + 14 / z); if (z < 0.3 || X < -100 || X > Wc + 100 || Y < -30 || Y > Hc + 40) return;
    pill('🌀 ' + window.TELE.portalLabel(), X, Y, { bg: '#e9e1ff', size: 13, force: true });
  }

  /* ---------- frame ---------- */
  function render(dt) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); R.litList.length = 0; R.t = time;
    g.fillStyle = rgb(sea.ground); g.fillRect(0, 0, Wc, Hc);
     const TT = (n, f) => f();
    TT('tufts', drawTufts); TT('gl', drawGlaciers); TT('lakes', drawLakes); TT('riv', drawRivers); TT('paths', drawPaths); TT('roads', drawRoads); TT('hwy', drawHwy); TT('rail', drawRail);
    TT('world', drawWorld); TT('sky', drawSky); TT('tint', drawTint); TT('ns', drawNightSky); TT('parts', () => drawParts(dt));
    TT('plan', drawPlanRoute); TT('pins', drawPins); TT('labels', drawLabels); TT('portal', drawPortalLabel); TT('bub', () => drawBubbles(dt));
    if (QS.has('perf')) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, Hc - 30, 150, 22); g.fillStyle = '#fff'; g.font = '12px monospace'; g.textAlign = 'left'; g.fillText(`${fps.toFixed(0)} fps  z ${cam.z.toFixed(2)}`, 14, Hc - 15); }
  }
  let fps = 60; let lastT = performance.now(); let chatT = 0; let decreeT = 0; let autoSeasonT = 0;
  function update(dt) {
    time += dt;
    people.forEach((p) => updPerson(p, dt)); animals.forEach((a) => updAnimal(a, dt)); eagles.forEach((e) => updEagle(e, dt)); cars.forEach((c) => updCar(c, dt));
    trains.forEach((t) => updTrain(t, dt)); updBus(iceBus, dt); lakeFolk.forEach((q) => updFolk(q, dt));
    clouds.forEach((c) => { c.x += c.v * dt; if (c.x > BOUNDS.x1 + 600) { c.x = BOUNDS.x0 - 600; c.y = BOUNDS.y0 + rnd() * (BOUNDS.y1 - BOUNDS.y0); } });
    if (todMode === 4) phase = (phase + dt / 220) % 1;
    if (seasonMode === 'auto') { autoSeasonT += dt; if (autoSeasonT > 55) { autoSeasonT = 0; seasonAuto++; } }
    chatT += dt; if (chatT > 0.7) { chatT = 0; chat(); }
    decreeT += dt; if (decreeT > 28) { decreeT = 0; setDecree(() => seasonLine(), false); }
    if (followT && followIsPerson && hidden(followT)) stopFollow();
    if (followT && followT === iceBus && sea.bare > 0.5) stopFollow();
    if (followT) updFollowUI();
  }
  function chat() {
    for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
      const a = people[i]; const b = people[j]; if (hidden(a) || hidden(b) || a.hub !== b.hub || a.st === 'drive' || b.st === 'drive' || a.cd > time || b.cd > time) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 46 && rnd() < 0.5) {
        a.cd = b.cd = time + 25; const dest = a.dest && a.dest.name ? a.dest : pick(byHub[a.hub] || PLACES);
        bubble(a, fmt(pick(tx('greet')), { n: a.owner ? tx('rangerName') : personName(b), s: nameOf(dest) }), 3.4); bubble(b, pick(tx('reply')), 3, 1.8);
        addLog(fmt(tx('logChat'), { n: a.owner ? tx('rangerName') : personName(a), m: b.owner ? tx('rangerName') : personName(b) })); return;
      }
    }
  }
  function frame(now) {
    const raw = Math.min(0.05, (now - lastT) / 1000); lastT = now; fps = lerp(fps, 1 / Math.max(raw, 0.001), 0.05);
    if (!document.hidden) {
      if (!paused) update(raw); updateEnv(raw, false);
      if (followT) { cam.tx = followT.x; cam.ty = followT.y; }
      const k = 1 - Math.exp(-raw * 6); cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k; cam.tilt += (cam.ttilt - cam.tilt) * k;
      if (Math.abs(cam.tz - cam.z) < 0.0005) cam.z = cam.tz;
      updateHover(); render(paused ? 0 : raw);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- hit testing + input ---------- */
  let mx = -1; let my = -1;
  function hitTest(x, y) {
    if (window.TELE && window.TELE.hit(x, y, sx(PORTAL.x), sy(PORTAL.y), cam.z)) return { type: 'portal' };
    let best = null; let bd = 1e9;
    const test = (o, type, r) => { if (!o.sx) return; const d = Math.hypot(x - o.sx, y - (o.sy - 16 * (o.sk || 1))); if (d < r * (o.sk || 1) + 8 && d < bd) { bd = d; best = { type, o }; } };
    people.forEach((p) => { if (!hidden(p)) test(p, 'person', 24); }); animals.forEach((a) => test(a, 'animal', 20)); trains.forEach((t) => test(t.cars[0], 'train', 26)); if (iceLine && sea.bare < 0.5) test(iceBus, 'bus', 26);
    if (best) return best;
    for (const p of PLACES) { if (p.pin && Math.hypot(x - p.pin.x, y - p.pin.y) < p.pin.r + 3 && p.pin.y > -20) return { type: 'place', p }; }
    for (let i = PLACES.length - 1; i >= 0; i--) { const h = PLACES[i].b.hit; if (h && x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return { type: 'place', p: PLACES[i] }; }
    return null;
  }
  function updateHover() {
    hover = null; if (mx < 0 || dragging) { cv.style.cursor = ''; return; }
    const h = hitTest(mx, my); hover = h && h.type === 'place' ? h : null;
    if (!dragging) cv.style.cursor = h ? 'pointer' : '';
  }
  function onClick(x, y) {
    const h = hitTest(x, y); if (!h) { clearSel(); return; }
    if (h.type === 'portal') window.TELE.open();
    else if (h.type === 'place') select(h.p.id);
    else if (h.type === 'person') { const p = h.o; followTarget(p, true); $('bFollow').classList.add('on'); bubble(p, fmt(pick(tx('greet')), { n: '', s: nameOf(pick(PLACES)) }).replace(/^\S*\s?/, ''), 3.2); }
    else if (h.type === 'animal') { const a = h.o; bubble(a, pick(tx('animalSay')[a.sp] || tx('animalSay').elk), 3.4); addLog(`🐾 ${esc(tx('animals')[a.sp])}`); }
    else if (h.type === 'train') { sel = { type: 'train', id: h.o.id }; trainCard(h.o.id); } else if (h.type === 'bus') { sel = { type: 'train', id: 'ice' }; trainCard('ice'); }
  }
  let dragging = false; const ptrs = new Map(); let downX = 0; let downY = 0; let moved = 0; let pinch0 = 0; let pinchZ = 0;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { downX = e.clientX; downY = e.clientY; moved = 0; dragging = true; cv.classList.add('drag'); } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); pinchZ = cam.tz; moved = 99; }
  });
  cv.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY; const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) { cam.tz = clamp(pinchZ * d / pinch0, ZMIN, ZMAX); } return; }
    const dx = e.clientX - p.x; const dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5 && dragging) { if (followT) stopFollow(); cam.tx -= dx / cam.z; cam.ty -= dy / (cam.z * cam.tilt); cam.x = cam.tx; cam.y = cam.ty; cam.ty = clamp(cam.ty, BOUNDS.y0, BOUNDS.y1); cam.tx = clamp(cam.tx, BOUNDS.x0, BOUNDS.x1); }
  });
  const endPtr = (e) => {
    const was = ptrs.size; ptrs.delete(e.pointerId); if (!ptrs.size) { dragging = false; cv.classList.remove('drag'); if (was === 1 && moved <= 5 && e.type === 'pointerup') onClick(e.clientX, e.clientY); }
  };
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  cv.addEventListener('pointerleave', () => { mx = -1; });
  function zoomAt(px, py, f) {
    const wx = (px - Wc / 2) / cam.tz + cam.tx; const wy = (py - Hc / 2) / (cam.tz * cam.ttilt) + cam.ty; const nz = clamp(cam.tz * f, ZMIN, ZMAX);
    cam.tz = nz; cam.tx = wx - (px - Wc / 2) / nz; cam.ty = wy - (py - Hc / 2) / (nz * cam.ttilt);
  }
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (followT) { cam.tz = clamp(cam.tz * Math.exp(-e.deltaY * 0.0015), ZMIN, ZMAX); } else zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  cv.addEventListener('dblclick', (e) => { if (!hitTest(e.clientX, e.clientY)) zoomAt(e.clientX, e.clientY, 1.8); });
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; const s = 120 / cam.z;
    if (e.key === 'ArrowLeft') cam.tx -= s; else if (e.key === 'ArrowRight') cam.tx += s; else if (e.key === 'ArrowUp') cam.ty -= s; else if (e.key === 'ArrowDown') cam.ty += s;
    else if (e.key === '+' || e.key === '=') cam.tz = clamp(cam.tz * 1.25, ZMIN, ZMAX); else if (e.key === '-') cam.tz = clamp(cam.tz / 1.25, ZMIN, ZMAX);
    else if (e.key === 'Escape') { clearSel(); closeIntro(); Object.keys(PANELS).forEach(closePanel); }
  });
  window.addEventListener('resize', resize);

  /* ---------- toolbar, time, season, jump ---------- */
  function buildTod() {
    const wrap = $('tod'); const icons = ['🌅', '☀️', '🌇', '🌙', '🔄'];
    wrap.innerHTML = icons.map((ic, i) => `<button type="button" class="tb${todMode === i ? ' on' : ''}" data-i="${i}" title="${esc(tx('tod')[i])}" aria-label="${esc(tx('tod')[i])}" aria-pressed="${todMode === i}"><span class="i">${ic}</span></button>`).join('');
    wrap.querySelectorAll('.tb').forEach((b) => b.addEventListener('click', () => { todMode = parseInt(b.dataset.i, 10); buildTod(); }));
  }
  function buildSeason() {
    const wrap = $('season'); const keys = ['auto', 'spring', 'summer', 'autumn', 'winter'];
    wrap.innerHTML = keys.map((k) => `<button type="button" class="tb${seasonMode === k ? ' on' : ''}" data-k="${k}" aria-pressed="${seasonMode === k}"><span class="i">${SEASON_ICON[k]}</span><span class="sn">${esc(tx('seasons')[k])}</span></button>`).join('');
    wrap.querySelectorAll('.tb').forEach((b) => b.addEventListener('click', () => { seasonMode = b.dataset.k; store.set('bj-season', seasonMode); buildSeason(); }));
  }
  const JUMPS = { banff: ['banff', 0.8], louise: ['louise', 0.8], icefield: ['icefield', 0.75], jasper: ['jasper', 0.8], maligne: ['maligne', 0.7] };
  function jumpTo(key) { const J = JUMPS[key]; if (!J) return; const H = HUBS[J[0]]; followT = null; updFollowUI(); setCam(H.x, H.y - 30, J[1]); }
  function buildJump() {
    const wrap = $('jump'); wrap.innerHTML = Object.keys(JUMPS).map((k) => `<button type="button" class="jb" data-k="${k}">${esc(tx('jump')[k])}</button>`).join('');
    wrap.querySelectorAll('.jb').forEach((b) => b.addEventListener('click', () => jumpTo(b.dataset.k)));
  }
  function setPauseUI() { $('bPause').classList.toggle('on', paused); $('bPause').setAttribute('aria-pressed', String(paused)); $('pauseIcon').textContent = paused ? '▶' : '⏸'; $('pauseTx').textContent = paused ? tx('tools').play : tx('tools').pause; }
  $('bLabel').addEventListener('click', () => { labelsOn = !labelsOn; $('bLabel').classList.toggle('on', labelsOn); $('bLabel').setAttribute('aria-pressed', String(labelsOn)); });
  $('bEmperor').addEventListener('click', () => {
    if (emperor) { stopFollow(); return; }
    emperor = true; $('bEmperor').classList.add('on'); $('bEmperor').setAttribute('aria-pressed', 'true'); $('bFollow').classList.remove('on'); followTarget(aspen, true); setCam(aspen.x, aspen.y, Math.max(cam.tz, 0.8));
  });
  $('bFollow').addEventListener('click', () => {
    if (followT && followIsPerson && !emperor) { stopFollow(); return; }
    emperor = false; $('bEmperor').classList.remove('on'); $('bFollow').classList.add('on'); $('bFollow').setAttribute('aria-pressed', 'true'); followTarget(pick(people.filter((p) => !p.owner)), true); cam.tz = Math.max(cam.tz, 0.9);
  });
  $('bPause').addEventListener('click', () => { paused = !paused; setPauseUI(); });
  $('bBird').addEventListener('click', () => { cam.ttilt = cam.ttilt > 0.8 ? 0.58 : 0.95; $('bBird').classList.toggle('on', cam.ttilt > 0.8); $('bBird').setAttribute('aria-pressed', String(cam.ttilt > 0.8)); });
  $('bPlan').addEventListener('click', () => togglePanel('plan')); $('bLog').addEventListener('click', () => togglePanel('log')); $('bList').addEventListener('click', () => togglePanel('drawer'));
  $('pclose').addEventListener('click', () => closePanel('plan'));
  $('bAll').addEventListener('click', () => { followT = null; updFollowUI(); overview(); });
  $('q').addEventListener('input', (e) => { query = e.target.value.trim(); renderList(); });
  $('pGo').addEventListener('click', planGo);
  $('pFav').addEventListener('click', () => { favs.forEach((id) => planSel.add(id)); renderPlanList(); updPlanCount(); });
  $('pClear').addEventListener('click', () => { planSel.clear(); planRoute = null; $('pOut').innerHTML = ''; renderPlanList(); updPlanCount(); });
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

  /* ---------- intro ---------- */
  const INTRO_KEY = 'bj-living-intro'; let introStep = 0;
  const INTRO_CAMS = [() => jumpTo('banff'), overview, () => { const H = HUBS.bvp; setCam(H.x, H.y, 0.55); }, () => jumpTo('louise'), () => { setCam(PORTAL.x, PORTAL.y, 0.9); }];
  function renderIntro() {
    const s = tx('intro')[introStep]; $('ist').textContent = s[0]; $('iti').textContent = s[1]; $('itx').textContent = s[2];
    $('idt').innerHTML = tx('intro').map((_, i) => `<i class="${i === introStep ? 'on' : ''}"></i>`).join('');
    $('iskip').textContent = tx('introSkip'); $('inext').textContent = introStep === tx('intro').length - 1 ? tx('introDone') : tx('introNext');
    if (INTRO_CAMS[introStep]) INTRO_CAMS[introStep]();
  }
  function openIntro() { introStep = 0; $('intro').classList.add('show'); renderIntro(); }
  function closeIntro() { if (!$('intro').classList.contains('show')) return; $('intro').classList.remove('show'); store.set(INTRO_KEY, '1'); jumpTo('banff'); }
  $('iskip').addEventListener('click', closeIntro);
  $('inext').addEventListener('click', () => { if (introStep >= tx('intro').length - 1) closeIntro(); else { introStep++; renderIntro(); } });
  $('bHelp').addEventListener('click', openIntro);

  /* ---------- language ---------- */
  function applyStatic() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; document.title = tx('docTitle');
    const d = document.querySelector('meta[name="description"]'); if (d) d.setAttribute('content', tx('docDesc'));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tx(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', tx(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', tx(el.dataset.i18nPh)));
    document.querySelectorAll('[data-tool]').forEach((el) => { if (el.id !== 'pauseTx') el.textContent = tx('tools')[el.dataset.tool]; });
    document.querySelector('#logo .big').innerHTML = lang === 'zh' ? '班夫<br>贾斯珀' : 'BANFF<br>JASPER';
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    setPauseUI();
  }
  function setLang(next, init) {
    if (!LANGS.includes(next) || (next === lang && !init)) return; lang = next; store.set('bj-lang', lang);
    applyStatic(); buildTod(); buildSeason(); buildJump(); renderChips(); renderList(); renderPlanLists();
    $('decreeTx').textContent = decreeFn(); lastFollowKey = ''; updFollowUI(); if (sel) { if (sel.type === 'place') placeCard(sel.p); else trainCard(sel.id); }
    if ($('intro').classList.contains('show')) renderIntro();
    if (window.TELE) window.TELE.refresh();
  }

  /* ---------- start ---------- */
  resize(); applyStatic(); buildTod(); buildSeason(); buildJump(); renderChips(); renderList(); renderPlanLists();
  cv.setAttribute('aria-label', tx('canvasAria'));
  setDecree(() => tx('decreeFirst'), false);
  updateEnv(0, true);
  if (QS.get('warm')) { const n = Math.min(600, parseFloat(QS.get('warm')) || 0); for (let t = 0; t < n; t += 0.1) { update(0.1); } updateEnv(0, true); }
  if (window.TELE) window.TELE.init({ here: 'banff', getLang: () => lang });
  window.addEventListener('resize', () => { if (QS.get('view') === 'world') overview(); });
  setCam(HUBS.banff.x - 40, HUBS.banff.y - 20, 0.8, true);
  if (QS.get('view') === 'world') { overview(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (QS.get('jump')) { jumpTo(QS.get('jump')); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (QS.get('cam')) { const [x, y, z] = QS.get('cam').split(',').map(Number); setCam(x, y, z, true); }
  if (QS.get('sel')) select(QS.get('sel'), !QS.get('cam') && !QS.get('jump') && !QS.get('view'));
  if (QS.get('route')) { QS.get('route').split(',').forEach((id) => planSel.add(id)); renderPlanList(); updPlanCount(); planGo(); }
  if (QS.get('panel') && PANELS[QS.get('panel')]) openPanel(QS.get('panel'));
  if (QS.get('portal') !== null) { setCam(PORTAL.x, PORTAL.y - 20, 1.1, true); if (QS.get('portal') === 'open' && window.TELE) window.TELE.open(); }
  if (QS.get('follow') === 'ice' && iceLine) followTarget(iceBus);
  else if (QS.get('follow')) { followTarget(QS.get('follow') === 'aspen' ? aspen : people[0], true); }
  cam.tilt = cam.ttilt;
  if (!QS.has('nointro') && !store.get(INTRO_KEY, '')) openIntro();
  window.__bj = { HWY93, cam, people, animals, cars, trains, aspen, PORTAL, JAMS, env, sea, statics, setLang, select, jumpTo, get time() { return time; } };
  requestAnimationFrame(frame);
})();
