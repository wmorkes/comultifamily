import { getStore } from '@netlify/blobs';

// Cheap bot/UA filter — not exhaustive, just cuts obvious crawler noise.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|headlesschrome|lighthouse|pingdom|monitor/i;

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ua = req.headers.get('user-agent') || '';
  if (BOT_UA.test(ua)) {
    return new Response('', { status: 204 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response('Bad payload', { status: 400 });
  }

  if (!payload.event || !payload.page) {
    return new Response('Missing event/page', { status: 400 });
  }

  const now = new Date();
  const record = {
    event: String(payload.event).slice(0, 64),
    page: String(payload.page).slice(0, 256),
    referrer: String(payload.referrer || '').slice(0, 256),
    client_token: payload.client_token ? String(payload.client_token).slice(0, 256) : null,
    listing_property: payload.listing_property ? String(payload.listing_property).slice(0, 128) : null,
    listing_city: payload.listing_city ? String(payload.listing_city).slice(0, 128) : null,
    listing_type: payload.listing_type ? String(payload.listing_type).slice(0, 64) : null,
    timestamp: now.toISOString(),
    city: (context.geo && context.geo.city) || null,
    country: (context.geo && context.geo.country && context.geo.country.code) || null,
    region: (context.geo && context.geo.subdivision && context.geo.subdivision.name) || null
  };

  const store = getStore('events');
  const day = record.timestamp.slice(0, 10); // YYYY-MM-DD
  const key = `events/${day}/${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  await store.setJSON(key, record);

  return new Response('', { status: 204 });
};
