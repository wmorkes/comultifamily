import { readFileSync } from 'fs';
import path from 'path';

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

function validateToken(token) {
  if (!token) return false;
  let decoded;
  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch (e) {
    return false;
  }
  const parts = decoded.split('|');
  if (parts.length !== 2) return false;
  const [email, dateStr] = parts;
  if (TEAM_EMAILS.includes(email.toLowerCase())) return true;
  const approvalDate = new Date(dateStr);
  if (isNaN(approvalDate)) return false;
  const hoursSince = (Date.now() - approvalDate.getTime()) / (1000 * 60 * 60);
  return hoursSince <= TOKEN_HOURS;
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
  'markets/denver-metro': ['data.json'],
  'rental-trends':        ['data.json'],
};

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
  const tokenOk = validateToken(url.searchParams.get('token'));

  if (!secretOk && !tokenOk) {
    return new Response('Unauthorized', { status: 401 });
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
