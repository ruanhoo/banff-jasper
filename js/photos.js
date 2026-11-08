// Real photos for the attractions, loaded on demand from Wikipedia (Wikimedia Commons images).
// Each place id maps to the title of its English Wikipedia article; the article's lead image is shown
// with a credit link back to the article, which carries the author and licence.
(function () {
  var WIKI = {
    "banffave": "Banff, Alberta",
    "fairmont": "Fairmont Banff Springs",
    "bowfalls": "Bow Falls",
    "gondola": "Sulphur Mountain (Alberta)",
    "upperhot": "Banff Upper Hot Springs",
    "caveandbasin": "Cave and Basin National Historic Site",
    "vermilion": "Vermilion Lakes",
    "norquay": "Mount Norquay",
    "elk": "Elk",
    "tunnelmtn": "Tunnel Mountain",
    "minnewanka": "Lake Minnewanka",
    "sunshine": "Banff Sunshine",
    "johnston": "Johnston Canyon",
    "inkpots": "Johnston Canyon",
    "castle": "Castle Mountain",
    "lakelouise": "Lake Louise (Alberta)",
    "chateau": "Chateau Lake Louise",
    "moraine": "Moraine Lake",
    "larch": "Valley of the Ten Peaks",
    "lgondola": "Lake Louise Ski Resort",
    "sixglaciers": "Plain of Six Glaciers Tea House",
    "emerald": "Emerald Lake (British Columbia)",
    "takakkaw": "Takakkaw Falls",
    "spiral": "Spiral Tunnels",
    "marble": "Marble Canyon (Canadian Rockies)",
    "paintpots": "Kootenay National Park",
    "radium": "Radium Hot Springs, British Columbia",
    "crowfoot": "Crowfoot Glacier",
    "bowlake": "Bow Lake (Alberta)",
    "numti": "Bow Lake (Alberta)",
    "peyto": "Peyto Lake",
    "mistaya": "Mistaya Canyon",
    "abraham": "Abraham Lake",
    "parker": "Parker Ridge",
    "icefield": "Columbia Icefield",
    "athglacier": "Athabasca Glacier",
    "wilcox": "Mount Wilcox (Alberta)",
    "tangle": "Tangle Falls",
    "goats": "Mountain goat",
    "sunwapta": "Sunwapta Falls",
    "athfalls": "Athabasca Falls",
    "jasper": "Jasper, Alberta",
    "jaspertrain": "Jasper station",
    "skytram": "Jasper Skytram",
    "jpl": "Fairmont Jasper Park Lodge",
    "pyramid": "Pyramid Lake (Alberta)",
    "marmot": "Marmot Basin",
    "darksky": "Jasper National Park",
    "cavell": "Mount Edith Cavell",
    "angel": "Angel Glacier",
    "miette": "Miette Hot Springs",
    "robson": "Mount Robson",
    "maligneC": "Maligne Canyon",
    "medicine": "Medicine Lake (Alberta)",
    "maligne": "Maligne Lake",
    "spirit": "Maligne Lake",
    "malignewild": "Bighorn sheep",
    "agnes": "Lake Agnes (Alberta)"
  };
  var mem = {}, memMore = {};
  var API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  var MEDIA = 'https://en.wikipedia.org/api/rest_v1/page/media-list/';
  var INFO = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=960&titles=';
  var KEY = 'bjphoto2:', KEY_MORE = 'bjmore3:';
  var MAX = 6, EVERY = 4500;
  var BAD = /\b(map|maps|logo|flag|icon|diagram|chart|locator|symbol|seal|plaque|poster|stamp)\b|coat of arms/i;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cached(key) { try { var h = sessionStorage.getItem(key); return h ? JSON.parse(h) : null; } catch (e) { return null; } }
  function store(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } }
  function fileName(src) { var m = /\/thumb\/\w\/\w\w\/([^/]+)\//.exec(src || ''); return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null; }

  // The article's lead image: fast, and always the first slide.
  function load(id) {
    var title = WIKI[id];
    if (!title) return Promise.resolve(null);
    if (mem[id]) return mem[id];
    var hit = cached(KEY + id);
    if (hit) { mem[id] = Promise.resolve(hit); return mem[id]; }
    mem[id] = fetch(API + encodeURIComponent(title.replace(/ /g, '_')), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.thumbnail) return null;
        var big = d.thumbnail.source;
        // Wikimedia only serves fixed thumbnail widths; 960 is one of them.
        if (d.originalimage && d.originalimage.width >= 1000) big = d.thumbnail.source.replace(/\/\d+px-/, '/960px-');
        var out = { src: big, fallback: d.thumbnail.source, name: fileName(d.thumbnail.source), page: d.content_urls && d.content_urls.desktop ? d.content_urls.desktop.page : 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title) };
        store(KEY + id, out);
        return out;
      })
      .catch(function () { delete mem[id]; return null; });
    return mem[id];
  }

  // Keep large landscape JPEGs only; imageinfo pages (keyed by title) -> slide list.
  function usable(pages, files, bad) {
    var by = {}, out = [];
    Object.keys(pages || {}).forEach(function (k) { by[pages[k].title] = pages[k]; });
    files.forEach(function (f) {
      var pg = by[f.replace(/_/g, ' ')], ii = pg && pg.imageinfo && pg.imageinfo[0];
      if (!ii || ii.mime !== 'image/jpeg' || ii.width < 1200 || !ii.height) return;
      var ratio = ii.width / ii.height;
      if (ratio < 1.25 || ratio > 3) return;
      var name = f.replace(/^File:/, '').replace(/_/g, ' ');
      if (bad && bad.test(name)) return;
      out.push({ src: ii.thumburl, name: name, page: 'https://commons.wikimedia.org/wiki/' + encodeURI(f.replace(/ /g, '_')) });
    });
    return out;
  }
  var HAZE = /smoke|haze|wildfire|obscured|night/i;

  // Some articles carry only one picture; top up from a Wikimedia Commons search on the article title.
  function search(title) {
    var q = title.replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim() + ' filetype:bitmap';
    return fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=960&gsrsearch=' + encodeURIComponent(q))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var pages = (d && d.query && d.query.pages) || {};
        var files = Object.keys(pages).map(function (k) { return pages[k]; }).sort(function (a, b) { return a.index - b.index; }).map(function (x) { return x.title; });
        return usable(pages, files, HAZE);
      })
      .catch(function () { return []; });
  }

  // More photos from the same article, in the order its editors placed them, then a Commons search if that is thin.
  function more(id) {
    var title = WIKI[id];
    if (!title) return Promise.resolve([]);
    if (memMore[id]) return memMore[id];
    var hit = cached(KEY_MORE + id);
    if (hit) { memMore[id] = Promise.resolve(hit); return memMore[id]; }
    memMore[id] = fetch(MEDIA + encodeURIComponent(title.replace(/ /g, '_')), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var files = ((d && d.items) || []).filter(function (it) { return it.type === 'image' && /\.jpe?g$/i.test(it.title) && !BAD.test(it.title.replace(/_/g, ' ')); })
          .map(function (it) { return it.title; }).slice(0, 16);
        if (!files.length) return [];
        return fetch(INFO + encodeURIComponent(files.join('|'))).then(function (r) { return r.ok ? r.json() : null; }).then(function (q) {
          return usable(q && q.query && q.query.pages, files, null);
        });
      })
      .catch(function () { return []; })
      .then(function (out) {
        if (out.length >= 3) return out;
        return search(title).then(function (extra) {
          var seen = {}; out.forEach(function (o) { seen[o.name] = 1; });
          extra.forEach(function (o) { if (!seen[o.name]) { seen[o.name] = 1; out.push(o); } });
          return out;
        });
      })
      .then(function (out) { if (out.length) store(KEY_MORE + id, out); return out; });
    return memMore[id];
  }

  // Fill a placeholder element with a photo slideshow. `stillWanted` guards against the card having changed meanwhile.
  function fill(box, id, stillWanted, done) {
    if (!box) return;
    var lead0 = null, slides = [], cur = 0, timer = null, paused = false, dots = null, cr = null;
    var alive = function () { return box.isConnected && (!stillWanted || stillWanted()); };

    function show(n) {
      if (!slides.length) return;
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.img.className = k === cur ? 'in' : ''; });
      if (dots) [].forEach.call(dots.children, function (d, k) { d.className = k === cur ? 'on' : ''; });
      if (cr) { cr.href = slides[cur].page; cr.textContent = slides[cur].lead ? '📷 Wikipedia' : '📷 Wikimedia'; }
    }
    function restart() {
      clearInterval(timer); timer = null;
      if (reduced || slides.length < 2) return;
      timer = setInterval(function () {
        if (!alive()) { clearInterval(timer); return; }
        if (!paused) show(cur + 1);
      }, EVERY);
    }
    function buildDots() {
      if (slides.length < 2) return;
      if (!dots) { dots = document.createElement('div'); dots.className = 'dots'; box.appendChild(dots); }
      dots.innerHTML = '';
      slides.forEach(function (s, k) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-label', 'Photo ' + (k + 1) + ' of ' + slides.length);
        b.addEventListener('click', function (ev) { ev.stopPropagation(); show(k); restart(); });
        dots.appendChild(b);
      });
      show(cur);
    }
    function add(src, page, lead, fallback, first) {
      var img = new Image();
      img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
      img.onload = function () {
        if (!alive()) return;
        var s = { img: img, page: page, lead: lead };
        if (first) {
          box.hidden = false; box.innerHTML = '';
          box.appendChild(img);
          cr = document.createElement('a');
          cr.className = 'cr'; cr.target = '_blank'; cr.rel = 'noopener';
          box.appendChild(cr);
          box.addEventListener('mouseenter', function () { paused = true; });
          box.addEventListener('mouseleave', function () { paused = false; });
          slides.push(s); show(0);
          if (done) done();
          more(id).then(function (list) {
            if (!alive()) return;
            list.filter(function (it) { return it.name !== lead0.name; }).slice(0, MAX - 1).forEach(function (it) { add(it.src, it.page, false, null, false); });
          });
        } else {
          box.insertBefore(img, cr);
          slides.push(s); buildDots(); restart();
        }
      };
      img.onerror = function () { if (fallback && img.src !== fallback) img.src = fallback; };
      img.src = src;
    }

    load(id).then(function (ph) {
      if (!ph || !alive()) return;
      lead0 = ph;
      add(ph.src, ph.page, true, ph.fallback, true);
    });
  }

  window.BJ_PHOTO = { has: function (id) { return !!WIKI[id]; }, load: load, more: more, fill: fill };
})();
