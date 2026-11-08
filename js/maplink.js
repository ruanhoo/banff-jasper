// "Open in maps" links: OpenStreetMap for viewers in mainland China (Google Maps is blocked there), Google Maps for everyone else.
// Detection uses the browser time zone (no network lookup). Override for testing with ?maps=osm or ?maps=google.
(function () {
  var CN_ZONES = ['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'PRC'];
  function inChina() {
    var q = /[?&]maps=(osm|google)\b/.exec(location.search);
    if (q) return q[1] === 'osm';
    try { return CN_ZONES.indexOf(Intl.DateTimeFormat().resolvedOptions().timeZone) !== -1; } catch (e) { return false; }
  }
  var cn = inChina();

  // Google works best with a real place name. Default is "<name>, <region>"; these ids need a cleaner query.
  var REGION = {
    banff: 'Banff, Alberta', bvp: 'Banff National Park, Alberta', louise: 'Lake Louise, Alberta', yoho: 'British Columbia',
    parkway: 'Icefields Parkway, Alberta', jasper: 'Jasper, Alberta', maligne: 'Jasper National Park, Alberta',
  };
  var QUERY = {
    banffave: 'Banff Avenue, Banff, Alberta', caveandbasin: 'Cave and Basin National Historic Site, Banff, Alberta',
    tunnelmtn: 'Tunnel Mountain, Banff, Alberta', hoodoos: 'Hoodoos Viewpoint, Banff, Alberta',
    sunshine: 'Sunshine Meadows, Banff National Park, Alberta', larch: 'Larch Valley, Lake Louise, Alberta',
    emerald: 'Emerald Lake, Yoho National Park, British Columbia', takakkaw: 'Takakkaw Falls, Yoho National Park, British Columbia',
    spiral: 'Spiral Tunnels Viewpoint, Yoho National Park, British Columbia',
    marble: 'Marble Canyon, Kootenay National Park, British Columbia', paintpots: 'Paint Pots, Kootenay National Park, British Columbia',
    radium: 'Radium Hot Springs Pools, British Columbia', moraine: 'Moraine Lake, Lake Louise, Alberta',
    peyto: 'Peyto Lake, Banff National Park, Alberta', athglacier: 'Athabasca Glacier, Jasper National Park, Alberta',
    icefield: 'Columbia Icefield Discovery Centre, Alberta', goats: 'Athabasca Glacier Viewpoint, Icefields Parkway, Alberta',
    jpl: 'Fairmont Jasper Park Lodge, Jasper, Alberta', pyramid: 'Pyramid Lake, Jasper, Alberta',
    annette: 'Lake Annette, Jasper, Alberta', angel: 'Cavell Meadows, Jasper National Park, Alberta',
    cavell: 'Mount Edith Cavell, Jasper National Park, Alberta', darksky: 'Jasper Dark Sky Preserve, Alberta',
    jaspertrain: 'Jasper Train Station, Jasper, Alberta', skytram: 'Jasper SkyTram, Jasper, Alberta',
    chateau: 'Fairmont Chateau Lake Louise, Alberta', lgondola: 'Lake Louise Ski Resort Gondola, Alberta',
  };
  // Not real places (areas, wildlife stretches): keep the exact pin.
  var PIN_ONLY = { elk: 1, bvpwild: 1, malignewild: 1 };

  window.BJ_MAP = {
    osm: cn,
    url: function (p) {
      if (cn) return 'https://www.openstreetmap.org/?mlat=' + p.lat + '&mlon=' + p.lng + '#map=17/' + p.lat + '/' + p.lng;
      if (p.type === 'food' || PIN_ONLY[p.id]) return 'https://www.google.com/maps/search/?api=1&query=' + p.lat + '%2C' + p.lng;
      var q = QUERY[p.id] || (p.name + ', ' + (REGION[p.d] || 'Alberta'));
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    },
    label: function (lang) {
      if (lang === 'zh') return cn ? '在 OSM 中打开 ↗' : '在谷歌地图中打开 ↗';
      return cn ? 'Open in OSM ↗' : 'Open in Google Maps ↗';
    },
  };
})();
