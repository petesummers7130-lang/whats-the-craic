// What's the Craic: private admin API for approving events sent through the "Add your event" form.
// Needs two Netlify environment variables:
//   NETLIFY_API_TOKEN  a personal access token (Netlify > User settings > Applications)
//   ADMIN_KEY          a long password you choose; type it into /admin.html
import { getStore } from '@netlify/blobs';

const FORM_NAME = 'submit-event';
const env = (k) => (globalThis.Netlify?.env?.get(k)) || process.env[k];

async function netlify(path, token) {
  const r = await fetch('https://api.netlify.com/api/v1' + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('Netlify API ' + r.status);
  return r.json();
}

export default async (req, context) => {
  const adminKey = env('ADMIN_KEY'), token = env('NETLIFY_API_TOKEN');
  if (!adminKey || !token) return Response.json({ error: 'ADMIN_KEY or NETLIFY_API_TOKEN not set' }, { status: 500 });
  if (req.headers.get('x-admin-key') !== adminKey) return Response.json({ error: 'Wrong password' }, { status: 401 });

  const store = getStore('craic');
  const approved = (await store.get('approved', { type: 'json' })) || {};

  if (req.method === 'POST') {
    const { id, approve, event } = await req.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
    if (approve) {
      const t = (x, n) => String(x || '').trim().slice(0, n);
      const date = t(event?.date, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !t(event?.event, 140)) return Response.json({ error: 'Event needs a name and a date' }, { status: 400 });
      const link = t(event?.link, 300);
      approved[id] = { src: 'local', id, title: t(event.event, 140), date, time: t(event.time, 5), venue: t(event.venue, 140),
        town: t(event.town, 60), url: /^https?:\/\//i.test(link) ? link : '', desc: t(event.description, 400), approvedAt: new Date().toISOString() };
    } else {
      delete approved[id];
    }
    await store.setJSON('approved', approved);
    return Response.json({ ok: true, approvedCount: Object.keys(approved).length });
  }

  const siteId = context?.site?.id || env('SITE_ID');
  const forms = await netlify(`/sites/${siteId}/forms`, token);
  const form = forms.find((f) => f.name === FORM_NAME);
  const subs = form ? await netlify(`/forms/${form.id}/submissions?per_page=100`, token) : [];
  return Response.json({
    submissions: subs.map((s) => ({ id: s.id, created: s.created_at, data: s.data, approved: !!approved[s.id] })),
  }, { headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/admin-submissions' };
