# Banff & Jasper · a cartoon map of the Canadian Rockies

A mobile-friendly, English / 中文 tourism site for Banff and Jasper National Parks and the Icefields Parkway between them:
turquoise lakes, glaciers, waterfalls, hot springs, hikes, wildlife spots and a handful of places to eat. 80 places in total.

## Two views

- **Classic map** (`index.html`): a Leaflet map on OpenTopoMap tiles with clustered pins, category filters and a card list.
- **Living map** (`living/`): a hand-drawn canvas model of the whole corridor, squeezed so that every area has room to breathe.
  - Fourteen hubs along the road: Banff, Minnewanka, Sunshine, the Bow Valley Parkway, Kootenay, Lake Louise & Moraine, Yoho, the upper Parkway, Saskatchewan Crossing, the Columbia Icefield, Sunwapta, Jasper, Mount Edith Cavell and the Maligne Valley.
  - **Seasons**: spring blossom, summer canoes on the lakes, golden larches in autumn, snow and skaters on frozen lakes in winter.
  - Elk, bighorn sheep, mountain goats, bears, moose, eagles, a freight train, a tourist train, the Ice Explorer on the Athabasca Glacier, wildlife traffic jams, a day/night cycle with northern lights, a route planner, a journal and a portal to the other city maps.

## Run locally

It is a static site with no build step:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/ (classic) or http://localhost:8000/living/ (living map).

URL options for the living map:

| Option | Effect |
| --- | --- |
| `?lang=en\|zh` | language |
| `?season=spring\|summer\|autumn\|winter\|auto` | season |
| `?tod=0..3` | dawn, day, dusk, night (default: automatic cycle) |
| `?jump=banff\|louise\|icefield\|jasper\|maligne` | start at one of the hubs |
| `?view=world` | start zoomed out |
| `?sel=<place id>` | open a place card |
| `?panel=drawer\|plan\|log` | open the list, planner or journal |
| `?route=id,id,...` | pre-fill and run the route planner |
| `?nointro` | skip the intro tour |

## Notes

- Place details, opening hours and prices change. Treat everything as a starting point and check before you go.
- A Parks Canada pass is required for stops inside the parks. The Moraine Lake road is closed to private cars; use the shuttle or a commercial bus and book ahead.
- Keep at least 100 m from bears and wolves and 30 m from all other wildlife. Never feed animals.
- Jasper was hit by a wildfire in July 2024 and is still recovering; some trails, buildings and viewpoints may differ from the map or be closed.
- Parts of the Bow Valley Parkway and the Icefields Parkway have seasonal closures and winter driving rules. Check road reports first.
- Routes drawn by the planner are straight-line sketches (distance estimate × 1.3), and food areas are illustrative, not recommendations of specific businesses.
- The living map's geography is hand-drawn and compressed. It is not to scale, and coordinates throughout are approximate.
- "Open in maps" links go to OpenStreetMap when the browser time zone is mainland China (Google Maps is blocked there) and to a Google Maps search by place name (so photos, hours and reviews show) otherwise; food pins and wildlife stretches use the exact pin. Force one with `?maps=osm` or `?maps=google`.
- The classic map uses OpenStreetMap-based tiles. No API key is needed or stored in this repo.
- Chinese translations are machine-assisted and welcome corrections.
