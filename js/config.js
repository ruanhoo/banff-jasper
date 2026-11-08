// Map tile provider settings.
// The classic map uses OpenTopoMap (free, no key). To use a different raster provider, set `tileUrl`.
// Never commit API keys; keep any keyed URL restricted to your domain or leave this empty.
window.BJ_CONFIG = {
  tileUrl: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
  tileAttribution: 'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  tileOptions: { maxZoom: 17 },
};
