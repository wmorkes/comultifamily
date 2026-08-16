import { createHmac, timingSafeEqual } from 'crypto';

// Mints scoped, HMAC-signed dashboard tokens for the Token Generator page.
// Gated by TOKEN_GEN_SECRET (an admin key embedded in token-gen/index.html,
// same trust tier as DASHBOARD_DATA_SECRET) — not real auth, just stops
// randoms from hitting this endpoint directly. Real enforcement of the
// resulting token's scope happens server-side in dashboard-data.js.

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const genSecret = process.env.TOKEN_GEN_SECRET;
  const signingSecret = process.env.TOKEN_SIGNING_SECRET;
  if (!genSecret || !signingSecret) {
    return new Response('Not Configured', { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }

  const { secret, email, scope } = body || {};
  if (!secret || !timingSafeStringEqual(secret, genSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }
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
