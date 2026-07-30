const { getStore } = require('@netlify/blobs');

// Cheap bot/UA filter — not exhaustive, just cuts obvious crawler noise.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|headlesschrome|lighthouse|pingdom|monitor/i;

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ua = event.headers['user-agent'] || '';
  if (BOT_UA.test(ua)) {
    return { statusCode: 204, body: '' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Bad payload' };
  }

  if (!payload.event || !payload.page) {
    return { statusCode: 400, body: 'Missing event/page' };
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

  return { statusCode: 204, body: '' };
};
