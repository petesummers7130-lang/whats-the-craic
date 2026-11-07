// What's the Craic: Skiddle feed for Northern Ireland (ready to switch on).
// Set SKIDDLE_KEY in Netlify environment variables. Until then this returns an empty list.
// NOTE: Skiddle's docs don't spell out response field names, so several likely names are tried.
// Check /api/skiddle-events once the key is set and adjust pick() calls if a field comes back empty.

const pick = (o, ...keys) => { for (const k of keys) { const v = k.split('.').reduce((a, p) => (a == null ? a : a[p]), o); if (v != null && v !== '') return v; } return ''; };
const CODE_HINT = { FEST: 'festival', LIVE: 'live music gig', CLUB: 'club night dj', THEATRE: 'theatre', COMEDY: 'comedy',
  EXHIB: 'exhibition', KIDS: 'family kids children', BARPUB: 'pub', SPORT: 'sport', ARTS: 'arts', LGB: 'lgbt', DATE: '' };
const FIX = { 'Derry-Londonderry': 'Derry', 'Londonderry': 'Derry', 'Derry/Londonderry': 'Derry' };

export default async () => {
  const key = (globalThis.Netlify?.env?.get('SKIDDLE_KEY')) || process.env.SKIDDLE_KEY;
  const headers = { 'Cache-Control': 'public, max-age=300', 'Netlify-CDN-Cache-Control': 'public, durable, max-age=3600, stale-while-revalidate=86400' };
  if (!key) return Response.json({ events: [], note: 'SKIDDLE_KEY not set' }, { headers });

  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  try {
    for (let offset = 0; offset < 1000; offset += 100) {
      const url = 'https://www.skiddle.com/api/v1/events/search/?api_key=' + key +
        '&latitude=54.6&longitude=-6.7&radius=70&minDate=' + today + '&maxDate=2027-12-31' +
        '&order=date&description=1&limit=100&offset=' + offset;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Skiddle answered ' + r.status);
      const j = await r.json();
      const list = j.results || j.events || [];
      for (const e of list) {
        const lon = +pick(e, 'venue.longitude', 'venue.lng');
        if (lon && (lon > -5.4 || lon < -8.3)) continue; // Northern Ireland only
        if (String(pick(e, 'cancelled')) === '1') continue;
        const date = String(pick(e, 'date', 'startdate')).slice(0, 10);
        if (!date) continue;
        const town = String(pick(e, 'venue.town', 'venue.city')).trim();
        const price = parseFloat(String(pick(e, 'entryprice', 'price')).replace(/[^0-9.]/g, ''));
        out.push({
          src: 'skiddle', id: pick(e, 'id'), title: String(pick(e, 'eventname', 'name')).trim(),
          town: FIX[town] || town, venue: String(pick(e, 'venue.name')).trim(), date,
          time: String(pick(e, 'openingtimes.doorsopen', 'starttime')).slice(0, 5),
          url: pick(e, 'link', 'url'), img: pick(e, 'largeimageurl', 'imageurl'),
          price: isNaN(price) ? null : price,
          hint: [CODE_HINT[pick(e, 'EventCode', 'eventcode')] || '', String(pick(e, 'description')).slice(0, 200)].join(' '),
          lat: +pick(e, 'venue.latitude', 'venue.lat') || null, lon: lon || null,
        });
      }
      const total = +pick(j, 'totalcount', 'total');
      if (list.length < 100 || (total && offset + 100 >= total)) break;
      await new Promise((res) => setTimeout(res, 300));
    }
  } catch (err) {
    return Response.json({ events: out, error: String(err.message || err) }, { status: out.length ? 200 : 502, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json({ updated: new Date().toISOString(), count: out.length, events: out.filter((x) => x.title) }, { headers });
};

export const config = { path: '/api/skiddle-events' };
