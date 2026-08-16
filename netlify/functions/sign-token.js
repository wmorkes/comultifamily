import { createHmac } from 'crypto';

// Mints scoped, HMAC-signed dashboard tokens for the Token Generator page.
// Access is gated upstream by netlify/edge-functions/token-gen-auth.js
// (HTTP Basic Auth, real credentials) — this endpoint is unreachable
// without them, so it doesn't repeat that check itself. Real enforcement of
// the resulting token's scope happens server-side in dashboard-data.js.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signingSecret = process.env.TOKEN_SIGNING_SECRET;
  if (!signingSecret) {
    return new Response('Not Configured', { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }

  const { email, scope } = body || {};
  if (!email || typeof email !== 'string') {
    return new Response('Bad Request', { status: 400 });
  }

  const scopeList = Array.isArray(scope) ? scope.filter(s => typeof s === 'string' && s) : [];
  const dateStr = new Date().toISOString().slice(0, 10);
  const payload = `${email}|${dateStr}|${scopeList.join(',')}`;
  const signature = createHmac('sha256', signingSecret).update(payload).digest('hex');
  const token = `${Buffer.from(payload, 'utf8').toString('base64')}.${signature}`;

  return new Response(JSON.stringify({ token, date: dateStr }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
