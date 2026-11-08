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
  var mem = {};
  var API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  var KEY = 'bjphoto1:';

  function load(id) {
    var title = WIKI[id];
    if (!title) return Promise.resolve(null);
    if (mem[id]) return mem[id];
    try { var hit = sessionStorage.getItem(KEY + id); if (hit) { mem[id] = Promise.resolve(JSON.parse(hit)); return mem[id]; } } catch (e) { /* storage may be unavailable */ }
    mem[id] = fetch(API + encodeURIComponent(title.replace(/ /g, '_')), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.thumbnail) return null;
        var big = d.thumbnail.source;
        if (d.originalimage && d.originalimage.width >= 1000) big = d.thumbnail.source.replace(/\/\d+px-/, '/960px-');
        var out = { src: big, fallback: d.thumbnail.source, page: d.content_urls && d.content_urls.desktop ? d.content_urls.desktop.page : 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title) };
        try { sessionStorage.setItem(KEY + id, JSON.stringify(out)); } catch (e) { /* ignore */ }
        return out;
      })
      .catch(function () { delete mem[id]; return null; });
    return mem[id];
  }

  // Fill a placeholder element with the photo. `stillWanted` guards against the card having changed meanwhile.
  function fill(box, id, stillWanted, done) {
    if (!box) return;
    load(id).then(function (ph) {
      if (!ph || (stillWanted && !stillWanted()) || !box.isConnected) return;
      var img = new Image();
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onload = function () {
        if (stillWanted && !stillWanted()) return;
        box.hidden = false;
        box.innerHTML = '';
        box.appendChild(img);
        requestAnimationFrame(function () { img.className = 'in'; });
        var a = document.createElement('a');
        a.className = 'cr'; a.href = ph.page; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '📷 Wikipedia';
        box.appendChild(a);
        if (done) done();
      };
      img.onerror = function () { if (img.src !== ph.fallback) img.src = ph.fallback; };
      img.src = ph.src;
    });
  }

  window.BJ_PHOTO = { has: function (id) { return !!WIKI[id]; }, load: load, fill: fill };
})();
