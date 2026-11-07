// What's the Craic: public list of submitted events you've approved in /admin.html.
import { getStore } from '@netlify/blobs';

export default async () => {
  const approved = (await getStore('craic').get('approved', { type: 'json' })) || {};
  const today = new Date().toISOString().slice(0, 10);
  const events = Object.values(approved).filter((e) => e.date >= today).map(({ approvedAt, ...e }) => e);
  return Response.json({ count: events.length, events }, { headers: { 'Cache-Control': 'public, max-age=60' } });
};

export const config = { path: '/api/approved-events' };
