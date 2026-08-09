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

  // Only list the day-prefixes actually in range, instead of every event
  // blob ever stored — keeps list() work bounded by the window, not history.
  const days = [];
  for (let d = new Date(`${since}T00:00:00Z`); d <= new Date(`${until}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const dayLists = await Promise.all(
    days.map((day) => store.list({ prefix: `events/${day}/` }))
  );
  const keys = dayLists.flatMap(({ blobs }) => blobs.map((b) => b.key));

  const records = (
    await Promise.all(keys.map((key) => store.get(key, { type: 'json' })))
  ).filter(Boolean);

  return new Response(JSON.stringify({ since, until, count: records.length, events: records }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
