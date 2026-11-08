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
  window.BJ_MAP = {
    osm: cn,
    url: function (lat, lng) {
      return cn
        ? 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=17/' + lat + '/' + lng
        : 'https://www.google.com/maps/search/?api=1&query=' + lat + '%2C' + lng;
    },
    label: function (lang) {
      if (lang === 'zh') return cn ? '在 OSM 中打开 ↗' : '在谷歌地图中打开 ↗';
      return cn ? 'Open in OSM ↗' : 'Open in Google Maps ↗';
    },
  };
})();
