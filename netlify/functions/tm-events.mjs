// What's the Craic: Ticketmaster feed for Northern Ireland.
// Keeps the API key on the server (set TM_KEY in Netlify > Site configuration > Environment variables)
// and lets Netlify's CDN cache the answer for an hour, so visitors don't each use up the daily quota.

const FIX = { 'Derry-Londonderry': 'Derry', 'Derry-Londonderr': 'Derry', 'Londonderry': 'Derry',
  'Tyrone': 'Co Tyrone', 'Antrim': 'Co Antrim', 'Fermanagh': 'Co Fermanagh', 'Down': 'Co Down' };
const clean = (x) => String(x ?? '').replace(/[|\n\r]/g, ' ');

export default async () => {
  const key = (globalThis.Netlify?.env?.get('TM_KEY')) || process.env.TM_KEY;
  if (!key) return Response.json({ error: 'TM_KEY is not set' }, { status: 500 });

  const now = new Date();
  const start = now.toISOString().slice(0, 10) + 'T00:00:00Z';
  const all = [];
  try {
    for (let page = 0; page < 5; page++) {
      const url = 'https://app.ticketmaster.com/discovery/v2/events.json?apikey=' + key +
        '&countryCode=GB&latlong=54.6,-6.7&radius=80&unit=miles&startDateTime=' + start +
        '&endDateTime=2027-12-31T23:59:59Z&sort=date,asc&size=200&page=' + page;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Ticketmaster answered ' + r.status);
      const j = await r.json();
      const ev = (j._embedded || {}).events || [];
      all.push(...ev);
      if (ev.length < 200) break;
      await new Promise((res) => setTimeout(res, 250));
    }
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }

  const rows = [];
  for (const e of all) {
    const v = ((e._embedded || {}).venues || [])[0] || {};
    const lon = +((v.location || {}).longitude || 0);
    if (lon && (lon > -5.4 || lon < -8.3)) continue; // keep Northern Ireland only
    const ld = e.dates?.start?.localDate; if (!ld) continue;
    const [y, m, d] = ld.split('-');
    const t = (e.dates.start.localTime || '00:00').slice(0, 5);
    const c = (e.classifications || [])[0] || {};
    const genre = [c.segment?.name, c.genre?.name, c.subGenre?.name].filter((x) => x && x !== 'Undefined').join(' / ');
    const img = (e.images || []).filter((i) => i.ratio === '16_9').sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640))[0];
    const price = (e.priceRanges || [])[0];
    const city = ((v.city || {}).name || '').trim();
    rows.push([e.name, FIX[city] || city, v.name, `${d}/${m}/${y} ${t}`, e.url, genre, img?.url, price ? Math.round(price.min) : '', e.dates?.status?.code]
      .map(clean).join('|'));
  }

  return Response.json({ updated: now.toISOString(), count: rows.length, rows: rows.join('\n') }, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=3600, stale-while-revalidate=86400',
    },
  });
};

export const config = { path: '/api/tm-events' };
