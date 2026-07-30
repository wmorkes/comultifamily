import { getStore } from '@netlify/blobs';

// Read endpoint for db-tools' build_site_report.py. Gated by a shared secret
// (REPORT_SECRET env var) so raw event data — which includes client_token —
// isn't publicly fetchable.
export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const secret = process.env.REPORT_SECRET;
  if (!secret || url.searchParams.get('secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // since/until are YYYY-MM-DD, inclusive. Defaults to the last 30 days.
  const until = url.searchParams.get('until') || new Date().toISOString().slice(0, 10);
  const since = url.searchParams.get('since') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const store = getStore('events');
  const { blobs } = await store.list({ prefix: 'events/' });

  const records = [];
  for (const { key } of blobs) {
    // key format: events/YYYY-MM-DD/<timestamp>-<rand>
    const day = key.split('/')[1];
    if (!day || day < since || day > until) continue;
    const record = await store.get(key, { type: 'json' });
    if (record) records.push(record);
  }

  return new Response(JSON.stringify({ since, until, count: records.length, events: records }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
