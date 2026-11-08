// World layout for the living Banff & Jasper map.
// Real lat/lng are only used inside each hub (to keep neighbours in the right directions); the hubs
// themselves are placed by hand along a compressed Icefields Parkway so every area gets room to breathe.
(() => {
  'use strict';
  const PLACES = window.BJ_PLACES || [];
  const TAU = Math.PI * 2;

  /* ---------- tiny deterministic noise ---------- */
  function h2(ix, iy, s) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul((s | 0) + 7, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, s) {
    const ix = Math.floor(x); const iy = Math.floor(y); const fx = smooth(x - ix); const fy = smooth(y - iy);
    const a = h2(ix, iy, s); const b = h2(ix + 1, iy, s); const c = h2(ix, iy + 1, s); const d = h2(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- hubs (hand placed, y grows southward) ---------- */
  const HUBS = {
    banff:    { x: 0,     y: 0,     R: 470, c: '#f2a93b', en: 'Banff', zh: '班夫' },
    minne:    { x: 1000,  y: -520,  R: 330, c: '#4fb6e6', en: 'Lake Minnewanka', zh: '明尼万卡湖' },
    sunshine: { x: -820,  y: 760,   R: 120, c: '#8fd36b', en: 'Sunshine Meadows', zh: '阳光草甸' },
    bvp:      { x: -1250, y: -620,  R: 330, c: '#e8503a', en: 'Bow Valley Parkway', zh: '弓谷公路' },
    kootenay: { x: -2250, y: 380,   R: 330, c: '#ff9a4d', en: 'Kootenay', zh: '库特尼' },
    louise:   { x: -2350, y: -1450, R: 470, c: '#46d3cc', en: 'Lake Louise & Moraine', zh: '路易斯湖与梦莲湖' },
    yoho:     { x: -3500, y: -1600, R: 390, c: '#3fb68b', en: 'Yoho', zh: '幽鹤' },
    bowlake:  { x: -2750, y: -2550, R: 330, c: '#7ccbf5', en: 'Upper Parkway', zh: '冰原大道北段' },
    crossing: { x: -3400, y: -3500, R: 330, c: '#b7a6ff', en: 'Saskatchewan Crossing', zh: '萨斯喀彻温河口' },
    icefield: { x: -4150, y: -4450, R: 400, c: '#9be3ff', en: 'Columbia Icefield', zh: '哥伦比亚冰原' },
    sunwapta: { x: -4950, y: -5350, R: 300, c: '#7ccbf5', en: 'Sunwapta & Athabasca', zh: '桑瓦普塔与阿萨巴斯卡' },
    jasper:   { x: -5650, y: -6250, R: 470, c: '#d9482f', en: 'Jasper', zh: '贾斯珀' },
    cavell:   { x: -6650, y: -5350, R: 330, c: '#b7a6ff', en: 'Mount Edith Cavell', zh: '埃迪丝·卡维尔山' },
    maligne:  { x: -4450, y: -6850, R: 470, c: '#44cfc9', en: 'Maligne Valley', zh: '马林山谷' },
  };
  Object.keys(HUBS).forEach((k) => { HUBS[k].id = k; });
  const EDGES = [
    ['banff', 'bvp'], ['banff', 'minne'], ['banff', 'sunshine'], ['bvp', 'louise'], ['bvp', 'kootenay'], ['louise', 'yoho'],
    ['louise', 'bowlake'], ['bowlake', 'crossing'], ['crossing', 'icefield'], ['icefield', 'sunwapta'], ['sunwapta', 'jasper'],
    ['sunwapta', 'cavell'], ['jasper', 'maligne'],
  ];

  /* ---------- place types (what gets drawn) ---------- */
  const KIND = {
    banffave: 'town', jasper: 'town', fairmont: 'castle', chateau: 'castle', jpl: 'lodge', numti: 'lodge',
    gondola: 'lift', lgondola: 'lift', skytram: 'lift', norquay: 'chair', marmot: 'chair', sunshine: 'chair',
    upperhot: 'spring', radium: 'spring', miette: 'spring', caveandbasin: 'cave', hoodoos: 'hoodoo',
    spiral: 'rail', jaspertrain: 'station', darksky: 'dome', icefield: 'center', athglacier: 'ice', skywalk: 'skywalk',
    paintpots: 'ochre', agnes: 'tea', sixglaciers: 'tea', elk: 'wild', bvpwild: 'wild', goats: 'wild', malignewild: 'wild',
    tunnelmtn: 'hike', oldfort: 'hike', johnston: 'bridge', maligneC: 'bridge', inkpots: 'pools', fivelakes: 'pools',
  };
  const kindOf = (p) => KIND[p.id] || ({ lake: 'lake', view: 'view', falls: 'falls', hike: 'hike', wild: 'wild', fun: 'town', food: 'cafe' }[p.cat] || 'view');

  /* ---------- lay places out inside each hub ---------- */
  const byHub = {};
  PLACES.forEach((p) => { (byHub[p.h] = byHub[p.h] || []).push(p); });
  const KM = 111;
  Object.keys(byHub).forEach((hid) => {
    const H = HUBS[hid]; const list = byHub[hid]; const near = list.filter((p) => !p.far);
    const lat0 = near.reduce((s, p) => s + p.lat, 0) / near.length; const lng0 = near.reduce((s, p) => s + p.lng, 0) / near.length;
    const cos = Math.cos(lat0 * Math.PI / 180);
    list.forEach((p) => { const dx = (p.lng - lng0) * cos * KM; const dy = -(p.lat - lat0) * KM; p._r = Math.hypot(dx, dy); p._a = Math.atan2(dy, dx); });
    const rmax = Math.max(0.4, ...near.map((p) => p._r)); const c = H.R / Math.pow(rmax, 0.55);
    list.forEach((p) => {
      let r = c * Math.pow(p._r, 0.55); if (p.far) r = H.R * 1.3;
      p.x = H.x + Math.cos(p._a) * r; p.y = H.y + Math.sin(p._a) * r; p.hub = hid;
    });
    if (list.length === 1) { list[0].x = H.x + 70; list[0].y = H.y - 40; }
  });

  /* ---------- lakes ---------- */
  // [rx, ry, direction (deg, 0 = east, 90 = south) from the place to the lake centre, fill, kind]
  const LAKE_DEF = {
    lakelouise: [250, 150, 168, '#4fd8cf', 'glacier'], moraine: [240, 130, 40, '#35c9d8', 'glacier'], peyto: [230, 150, 205, '#4fdccf', 'glacier'],
    bowlake: [330, 190, 330, '#52d3d4', 'glacier'], emerald: [230, 160, 120, '#3fd0a4', 'glacier'], minnewanka: [620, 150, 335, '#3fa9de', 'blue'],
    twojack: [190, 110, 80, '#52b5e8', 'blue'], vermilion: [320, 90, 195, '#4fc0c0', 'calm'], waterfowl: [200, 110, 285, '#4fc9d0', 'calm'],
    abraham: [420, 140, 100, '#55c0e8', 'blue'], pyramid: [250, 150, 70, '#48b8d8', 'calm'], annette: [150, 100, 20, '#58cfd0', 'calm'],
    medicine: [330, 100, 85, '#45b4d6', 'blue'], maligne: [560, 190, 120, '#35b8d6', 'glacier'],
  };
  const LAKES = [];
  PLACES.forEach((p) => {
    const d = LAKE_DEF[p.id]; if (!d) return;
    const a = d[2] * Math.PI / 180;
    LAKES.push({ id: p.id, place: p, rx: d[0], ry: d[1], rot: a * 0.18 + (h2(p.x | 0, p.y | 0, 3) - 0.5) * 0.3, x: p.x + Math.cos(a) * d[0] * 0.78, y: p.y + Math.sin(a) * d[0] * 0.78 * 0.7, col: d[3], kind: d[4] });
  });
  // one extra water body per ordinary hub gives rivers and ponds something to feed
  const inLake = (x, y, m) => {
    for (const L of LAKES) {
      const dx = x - L.x; const dy = y - L.y; const c = Math.cos(-L.rot); const s = Math.sin(-L.rot);
      const lx = dx * c - dy * s; const ly = dx * s + dy * c;
      if ((lx * lx) / ((L.rx + m) * (L.rx + m)) + (ly * ly) / ((L.ry + m) * (L.ry + m)) < 1) return L;
    }
    return null;
  };
  // keep non-lake places off the water and apart from each other
  const STICK = { chateau: ['lakelouise', 150, -10], numti: ['bowlake', 130, 30], hoodoos: null };
  Object.keys(byHub).forEach((hid) => {
    const list = byHub[hid];
    for (let it = 0; it < 70; it++) {
      list.forEach((p) => {
        if (!LAKE_DEF[p.id]) {
          const L = inLake(p.x, p.y, 30);
          if (L) { const a = Math.atan2(p.y - L.y, p.x - L.x); p.x += Math.cos(a) * 14; p.y += Math.sin(a) * 14; }
        }
      });
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]; const b = list[j]; let dx = b.x - a.x; let dy = (b.y - a.y) * 1.25; const d = Math.hypot(dx, dy) || 0.01;
          const min = (a.type === 'food' || b.type === 'food') ? 92 : 108;
          if (d < min) { const f = (min - d) / d * 0.5; dx *= f; dy *= f / 1.25; a.x -= dx; a.y -= dy; b.x += dx; b.y += dy; }
        }
      }
    }
  });
  Object.keys(STICK).forEach((id) => {
    const s = STICK[id]; if (!s) return;
    const p = PLACES.find((q) => q.id === id); const base = PLACES.find((q) => q.id === s[0]);
    if (p && base) { p.x = base.x + s[1]; p.y = base.y + s[2]; }
  });
  // small hand tweak so shoreline lodges and lookouts sit beside their lakes
  const P = {}; PLACES.forEach((p) => { P[p.id] = p; });
  // recompute lake centres after the relaxation moved their places
  LAKES.forEach((L) => { const d = LAKE_DEF[L.id]; const a = d[2] * Math.PI / 180; L.x = L.place.x + Math.cos(a) * d[0] * 0.78; L.y = L.place.y + Math.sin(a) * d[0] * 0.78 * 0.7; });

  /* ---------- roads ---------- */
  function curve(A, B, seed, n) {
    const pts = []; const dx = B.x - A.x; const dy = B.y - A.y; const L = Math.hypot(dx, dy); const nx = -dy / L; const ny = dx / L;
    const r = rng(seed); const f1 = 2 + r() * 2; const f2 = 5 + r() * 3; const p1 = r() * TAU; const p2 = r() * TAU;
    for (let i = 0; i <= n; i++) {
      const t = i / n; const w = Math.sin(t * Math.PI);
      const o = (Math.sin(t * Math.PI * f1 + p1) * 0.07 + Math.sin(t * Math.PI * f2 + p2) * 0.022) * L * w;
      pts.push([A.x + dx * t + nx * o, A.y + dy * t + ny * o]);
    }
    return pts;
  }
  function mkLine(pts) {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function posAt(L, s) {
    s = Math.max(0, Math.min(L.len, s)); let lo = 0; let hi = L.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= s) lo = m; else hi = m; }
    const a = L.pts[lo]; const b = L.pts[hi]; const seg = L.cum[hi] - L.cum[lo] || 1; const t = (s - L.cum[lo]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  const ROADS = EDGES.map(([a, b], i) => ({ a, b, line: mkLine(curve(HUBS[a], HUBS[b], 11 + i * 17, Math.max(24, Math.round(Math.hypot(HUBS[a].x - HUBS[b].x, HUBS[a].y - HUBS[b].y) / 40))) ) }));
  const adj = {}; ROADS.forEach((r, i) => { (adj[r.a] = adj[r.a] || []).push([r.b, i, 1]); (adj[r.b] = adj[r.b] || []).push([r.a, i, -1]); });
  // route between two hubs: list of [edgeIndex, dir]
  function hubRoute(a, b) {
    if (a === b) return [];
    const dist = { [a]: 0 }; const prev = {}; const q = [a];
    while (q.length) {
      q.sort((u, v) => dist[u] - dist[v]); const u = q.shift(); if (u === b) break;
      (adj[u] || []).forEach(([v, ei]) => { const nd = dist[u] + ROADS[ei].line.len; if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = [u, ei]; if (!q.includes(v)) q.push(v); } });
    }
    const out = []; let cur = b;
    while (cur !== a && prev[cur]) { const [u, ei] = prev[cur]; out.unshift([ei, ROADS[ei].a === u ? 1 : -1]); cur = u; }
    return out;
  }
  function roadPoints(route) {
    const pts = [];
    route.forEach(([ei, dir]) => { const src = ROADS[ei].line.pts; const arr = dir > 0 ? src : [...src].reverse(); arr.forEach((p, i) => { if (pts.length && i === 0) return; pts.push(p); }); });
    return pts;
  }

  /* ---------- rivers: ribbons beside the roads ---------- */
  function ribbon(hubIds, off, seed) {
    const pts = [];
    for (let i = 1; i < hubIds.length; i++) {
      const rt = hubRoute(hubIds[i - 1], hubIds[i]); const rp = roadPoints(rt);
      rp.forEach((p, k) => {
        const q = rp[Math.min(rp.length - 1, k + 1)]; const o = rp[Math.max(0, k - 1)]; const dx = q[0] - o[0]; const dy = q[1] - o[1]; const L = Math.hypot(dx, dy) || 1;
        const w = Math.sin(k * 0.35 + seed) * 18; const nx = -dy / L; const ny = dx / L;
        pts.push([p[0] + nx * (off + w), p[1] + ny * (off + w)]);
      });
    }
    return pts;
  }
  const RIVERS = [
    { id: 'bow', pts: ribbon(['bowlake', 'louise', 'bvp', 'banff'], 70, 1), w: 26 },
    { id: 'sask', pts: ribbon(['crossing', 'icefield'], -80, 2), w: 22 },
    { id: 'ath', pts: ribbon(['icefield', 'sunwapta', 'jasper'], 75, 3), w: 28 },
    { id: 'kicking', pts: ribbon(['yoho', 'louise'], 70, 4), w: 22 },
  ];
  // a second, parallel line for the railway
  const RAIL = [{ id: 'cp', line: mkLine(ribbon(['yoho', 'louise', 'bvp', 'banff'], -60, 5)) }];

  /* ---------- glaciers (ice tongues beside a place): [dx, dy, rx, ry, rot] ---------- */
  const GL_DEF = { athglacier: [-80, -230, 190, 110, -0.5], icefield: [-260, -130, 210, 110, 0.35], lakelouise: [0, 0, 0, 0, 0], angel: [-20, -170, 130, 80, 0], crowfoot: [60, -140, 90, 60, 0.2], sixglaciers: [-60, -130, 120, 76, 0], parker: [-120, -90, 150, 70, 0.2], numti: [-120, -150, 130, 70, 0] };
  const GLACIERS = [];
  Object.keys(GL_DEF).forEach((id) => {
    const p = P[id]; const d = GL_DEF[id]; if (!p || !d[2]) return;
    GLACIERS.push({ id, x: p.x + d[0], y: p.y + d[1], rx: d[2], ry: d[3], rot: d[4] });
  });
  // Victoria glacier sits beyond the far end of Lake Louise
  { const L = LAKES.find((q) => q.id === 'lakelouise'); if (L) { const a = Math.atan2(L.y - L.place.y, L.x - L.place.x); GLACIERS.push({ id: 'victoria', x: L.x + Math.cos(a) * (L.rx + 90), y: L.y + Math.sin(a) * (L.rx + 90) * 0.7 - 70, rx: 150, ry: 90, rot: 0.2 }); } }

  /* ---------- bounds and blocked-cell mask ---------- */
  const ks = Object.keys(HUBS);
  const WORLD = { x0: Math.min(...ks.map((k) => HUBS[k].x)) - 1100, x1: Math.max(...ks.map((k) => HUBS[k].x)) + 1300, y0: Math.min(...ks.map((k) => HUBS[k].y)) - 1100, y1: Math.max(...ks.map((k) => HUBS[k].y)) + 1100 };
  const MS = 24; const MW = Math.ceil((WORLD.x1 - WORLD.x0) / MS); const MH = Math.ceil((WORLD.y1 - WORLD.y0) / MS);
  const mask = new Uint8Array(MW * MH); // 1 = open ground kept clear of trees and peaks, 2 = water
  function disc(x, y, r, v) {
    const x0 = Math.max(0, Math.floor((x - r - WORLD.x0) / MS)); const x1 = Math.min(MW - 1, Math.floor((x + r - WORLD.x0) / MS));
    const y0 = Math.max(0, Math.floor((y - r - WORLD.y0) / MS)); const y1 = Math.min(MH - 1, Math.floor((y + r - WORLD.y0) / MS));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const cx = WORLD.x0 + i * MS + MS / 2; const cy = WORLD.y0 + j * MS + MS / 2; if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) mask[j * MW + i] = Math.max(mask[j * MW + i], v); }
  }
  PLACES.forEach((p) => disc(p.x, p.y, 78, 1));
  Object.keys(HUBS).forEach((k) => disc(HUBS[k].x, HUBS[k].y, 110, 1));
  ROADS.forEach((r) => { for (let s = 0; s <= r.line.len; s += 22) { const q = posAt(r.line, s); disc(q[0], q[1], 42, 1); } });
  RAIL.forEach((r) => { for (let s = 0; s <= r.line.len; s += 22) { const q = posAt(r.line, s); disc(q[0], q[1], 30, 1); } });
  RIVERS.forEach((r) => r.pts.forEach((q) => disc(q[0], q[1], 40, 2)));
  LAKES.forEach((L) => { const R = Math.max(L.rx, L.ry) + 40; for (let a = -R; a <= R; a += 20) for (let b = -R; b <= R; b += 20) { const c = Math.cos(-L.rot); const s = Math.sin(-L.rot); const lx = a * c - b * s; const ly = a * s + b * c; if ((lx * lx) / ((L.rx + 40) ** 2) + (ly * ly) / ((L.ry + 40) ** 2) < 1) disc(L.x + a, L.y + b, 14, 2); } });
  GLACIERS.forEach((G) => disc(G.x, G.y, Math.max(G.rx, G.ry) * 0.8, 2));
  const maskAt = (x, y) => { const i = Math.floor((x - WORLD.x0) / MS); const j = Math.floor((y - WORLD.y0) / MS); return i < 0 || j < 0 || i >= MW || j >= MH ? 0 : mask[j * MW + i]; };

  // distance (px) from a point to the nearest road node: used to make faraway peaks bigger and hazier
  const roadNodes = []; ROADS.forEach((r) => { for (let s = 0; s <= r.line.len; s += 120) { const q = posAt(r.line, s); roadNodes.push([q[0], q[1]]); } });
  function roadDist(x, y) { let d = 1e9; for (let i = 0; i < roadNodes.length; i++) { const dd = Math.hypot(x - roadNodes[i][0], y - roadNodes[i][1]); if (dd < d) d = dd; } return d; }

  /* ---------- peaks ---------- */
  // Named peaks are placed relative to places: [key, placeId, dx, dy, width, height]
  const NAMED = [
    ['rundle', 'fairmont', 520, 170, 560, 520], ['cascade', 'banffave', 120, -520, 420, 470], ['sulphur', 'gondola', -80, 160, 380, 400],
    ['castle', 'castle', 0, -170, 560, 520], ['victoria', 'lakelouise', -420, -240, 480, 560], ['temple', 'moraine', -160, 190, 420, 520],
    ['tenpeaks', 'moraine', 220, -190, 640, 540], ['chephren', 'waterfowl', -230, -200, 420, 520], ['columbia', 'icefield', -520, -250, 520, 640],
    ['athabasca', 'athglacier', -160, -310, 440, 540], ['whistlers', 'skytram', -230, -160, 430, 460], ['pyramid', 'pyramid', 120, -250, 360, 430],
    ['cavell', 'cavell', -90, -260, 560, 640], ['robson', 'robson', 0, -300, 600, 720], ['kerkeslin', 'athfalls', 330, 160, 380, 420],
    ['edith', 'jasper', 610, 120, 440, 420], ['norquay', 'norquay', 100, -170, 420, 450], ['lefroy', 'lakelouise', -280, 240, 340, 520],
  ];
  const PEAKS = [];
  NAMED.forEach(([key, pid, dx, dy, w, h]) => { const p = P[pid]; if (p) PEAKS.push({ x: p.x + dx, y: p.y + dy, w: w * 0.9, h: h * 0.72, seed: PEAKS.length * 5 + 1, key, named: true, far: 0 }); });
  for (let j = Math.floor(WORLD.y0 / 210); j * 210 < WORLD.y1; j++) {
    for (let i = Math.floor(WORLD.x0 / 210); i * 210 < WORLD.x1; i++) {
      if (h2(i, j, 21) > 0.5) continue;
      const x = i * 210 + h2(i, j, 22) * 190; const y = j * 210 + h2(i, j, 23) * 190;
      if (maskAt(x, y)) continue;
      if (NAMED.length && PEAKS.some((q) => q.named && Math.hypot(q.x - x, (q.y - y) * 1.1) < q.w * 0.55)) continue;
      if (Object.keys(HUBS).some((k) => Math.hypot(HUBS[k].x - x, (HUBS[k].y - y) * 1.3) < HUBS[k].R + 160)) continue; // hubs stay open
      const rd = roadDist(x, y); const far = Math.min(1, rd / 1400);
      const w = 140 + h2(i, j, 24) * 150 + far * 130; const h = w * (0.65 + h2(i, j, 25) * 0.5) * (0.8 + far * 0.3);
      if (rd < 220 && h > 170) continue; // keep the roadsides open
      PEAKS.push({ x, y, w, h, seed: i * 131 + j * 17, far, named: false });
    }
  }
  PEAKS.sort((a, b) => a.y - b.y);

  /* ---------- walking graph inside each hub (a minimum spanning tree over the places) ---------- */
  const WALK = {}; // hubId -> { nodes:[{x,y,id}], adj: Map }
  Object.keys(byHub).forEach((hid) => {
    const H = HUBS[hid]; const nodes = [{ x: H.x, y: H.y, id: '@gate' }, ...byHub[hid].map((p) => ({ x: p.x, y: p.y, id: p.id }))];
    const cost = (a, b) => { const d = Math.hypot(a.x - b.x, a.y - b.y); let pen = 1; for (let t = 0.15; t < 1; t += 0.2) if (inLake(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 0)) pen = 4; return d * pen; };
    const inTree = new Set([0]); const edges = [];
    while (inTree.size < nodes.length) {
      let best = null;
      inTree.forEach((i) => nodes.forEach((n, j) => { if (inTree.has(j)) return; const c = cost(nodes[i], n); if (!best || c < best.c) best = { i, j, c }; }));
      edges.push([best.i, best.j]); inTree.add(best.j);
    }
    const ad = nodes.map(() => []); edges.forEach(([i, j]) => { ad[i].push(j); ad[j].push(i); });
    WALK[hid] = { nodes, ad, edges, index: Object.fromEntries(nodes.map((n, i) => [n.id, i])) };
  });
  // tree path between two node ids in one hub
  function walkPath(hid, fromId, toId) {
    const W = WALK[hid]; const a = W.index[fromId]; const b = W.index[toId]; if (a === undefined || b === undefined) return [];
    const prev = new Array(W.nodes.length).fill(-2); prev[a] = -1; const q = [a];
    while (q.length) { const u = q.shift(); if (u === b) break; W.ad[u].forEach((v) => { if (prev[v] === -2) { prev[v] = u; q.push(v); } }); }
    const out = []; for (let c = b; c !== -1 && c !== -2; c = prev[c]) out.unshift([W.nodes[c].x, W.nodes[c].y]);
    return out;
  }

  window.BJ_WORLD = { HUBS, EDGES, ROADS, LAKES, RIVERS, RAIL, GLACIERS, WORLD, PEAKS, PLACES, P, KIND, kindOf, h2, vnoise, rng, mkLine, posAt, hubRoute, roadPoints, walkPath, WALK, maskAt, inLake, roadDist, byHub, LAKE_DEF, TAU };
})();
