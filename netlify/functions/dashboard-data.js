import { readFileSync } from 'fs';
import path from 'path';
import { createHmac, timingSafeEqual } from 'crypto';

// Gated read endpoint for every dashboard's data.json/geo.json. Previously
// these lived under site/dashboards/**/*.json and were plain public static
// files — fetchable by anyone with the URL, no token or auth check at all
// (the client-side token-gate.js redirect only protects the HTML page, not
// the JSON itself). Files now live outside the publish dir (dashboard-data/)
// and are only served here, after checking either:
//   - a valid client dashboard token (same format token-gate.js validates
//     client-side, ported here so a real visitor's own fetch() still works)
//   - the shared DASHBOARD_DATA_SECRET (for server-side consumers like
//     bov-generator, which has no browser and no client token)

const TEAM_EMAILS = [
  'bill.morkes@colliers.com',
  'craig.stack@colliers.com',
  'nate.moyer@colliers.com',
  'jason.wolfthal@colliers.com',
  'nate.morris@colliers.com'
];
const TOKEN_HOURS = 48;

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Returns { ok, isTeam, scope } — scope is null for legacy 2-segment tokens
// (meaning "no extra scope beyond CLIENT_VISIBLE", not "nothing allowed").
function validateToken(token) {
  const fail = { ok: false, isTeam: false, scope: null };
  if (!token) return fail;

  const [encodedPayload, signature] = token.split('.');
  let decoded;
  try {
    decoded = Buffer.from(encodedPayload, 'base64').toString('utf8');
  } catch (e) {
    return fail;
  }
  const parts = decoded.split('|');
  if (parts.length !== 2 && parts.length !== 3) return fail;

  const [email, dateStr, scopeStr] = parts;
  const isTeam = TEAM_EMAILS.includes(email.toLowerCase());

  if (parts.length === 3) {
    // Scoped tokens carry a claim that must be signed — no signature, no trust.
    const signingSecret = process.env.TOKEN_SIGNING_SECRET;
    if (!signingSecret || !signature) return fail;
    const expected = createHmac('sha256', signingSecret).update(decoded).digest('hex');
    if (!timingSafeStringEqual(signature, expected)) return fail;
  }

  if (isTeam) {
    const scope = parts.length === 3 ? scopeStr.split(',').filter(Boolean) : null;
    return { ok: true, isTeam: true, scope };
  }

  const approvalDate = new Date(dateStr);
  if (isNaN(approvalDate)) return fail;
  const hoursSince = (Date.now() - approvalDate.getTime()) / (1000 * 60 * 60);
  if (hoursSince > TOKEN_HOURS) return fail;

  const scope = parts.length === 3 ? scopeStr.split(',').filter(Boolean) : null;
  return { ok: true, isTeam: false, scope };
}

// name -> allowed file basenames. Keeps requests scoped to known datasets
// instead of letting the "name"/"file" params walk the filesystem.
const DATASETS = {
  'on-market':           ['data.json', 'geo.json'],
  'pipeline':             ['data.json', 'geo.json'],
  'deliveries-by-year':   ['data.json'],
  'capital-flow':         ['data.json'],
  'chfa':                 ['data.json'],
  'followup-gaps':        ['data.json'],
  'loan-monitor':         ['data.json', 'geo.json', 'data-full.json', 'geo-full.json'],
  'sales-by-year':        ['data.json'],
  'markets/wyoming':          ['data.json'],
  'markets/fort-collins':     ['data.json'],
  'markets/greeley':          ['data.json'],
  'markets/boulder':          ['data.json'],
  'markets/denver-metro':     ['data.json'],
  'markets/colorado-springs': ['data.json'],
  'markets/pueblo':           ['data.json'],
  'markets/western-slope':    ['data.json'],
  'markets/mountain-towns':   ['data.json'],
  'markets/rural-tertiary-co':['data.json'],
  'rental-trends':        ['data.json'],
};

// Mirrors site/js/dashboard-visibility.js's CLIENT_VISIBLE map — duplicated
// here because that file is a plain (non-module) browser script with no
// export, and this function needs the same toggle server-side to decide
// whether a non-team, non-scoped request is allowed. Keep both in sync.
const CLIENT_VISIBLE = {
  'wyoming': false,
  'fort-collins': false,
  'greeley': false,
  'boulder': false,
  'denver-metro': false,
  'colorado-springs': false,
  'pueblo': false,
  'western-slope': false,
  'mountain-towns': false,
  'rural-tertiary-co': false,
  'sales-by-year': false,
  'deliveries-by-year': false,
  'pipeline': false,
  'rental-trends': false,
  'chfa': false
};

// Dataset "name" values for markets are "markets/<slug>"; CLIENT_VISIBLE and
// token scope both key on the bare slug (matching the hub's data-client-slug).
function slugFromDatasetName(name) {
  return name.startsWith('markets/') ? name.slice('markets/'.length) : name;
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get('name') || '';
  const file = url.searchParams.get('file') || 'data.json';

  if (!Object.prototype.hasOwnProperty.call(DATASETS, name) || !DATASETS[name].includes(file)) {
    return new Response('Not Found', { status: 404 });
  }

  const secret = process.env.DASHBOARD_DATA_SECRET;
  const suppliedSecret = url.searchParams.get('secret');
  const secretOk = Boolean(secret) && suppliedSecret === secret;
  const tokenResult = validateToken(url.searchParams.get('token'));

  if (!secretOk) {
    if (!tokenResult.ok) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (!tokenResult.isTeam) {
      const slug = slugFromDatasetName(name);
      const inScope = Array.isArray(tokenResult.scope) && tokenResult.scope.includes(slug);
      if (!CLIENT_VISIBLE[slug] && !inScope) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
  }

  try {
    const filePath = path.join(process.cwd(), 'dashboard-data', name, file);
    const contents = readFileSync(filePath, 'utf8');
    return new Response(contents, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    return new Response('Not Found', { status: 404 });
  }
};
