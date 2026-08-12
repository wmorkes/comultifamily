/**
 * Token gate for CO Multifamily Advisors dashboard portal.
 *
 * Token format: base64("email|YYYY-MM-DD")
 * Team emails bypass expiry. Client tokens are valid for 48 hours from the
 * date encoded in the token, then expire automatically. No allowlist —
 * any well-formed token within the window is accepted.
 */

const TEAM_EMAILS = [
  'bill.morkes@colliers.com',
  'craig.stack@colliers.com',
  'nate.moyer@colliers.com',
  'jason.wolfthal@colliers.com',
  'nate.morris@colliers.com'
];

const TOKEN_HOURS = 48;

function validateToken(token) {
  if (!token) return { valid: false, reason: 'no_token' };

  let decoded;
  try {
    decoded = atob(token);
  } catch (e) {
    return { valid: false, reason: 'invalid' };
  }

  const parts = decoded.split('|');
  if (parts.length !== 2) return { valid: false, reason: 'invalid' };

  const [email, dateStr] = parts;
  const isTeam = TEAM_EMAILS.includes(email.toLowerCase());
  if (isTeam) return { valid: true, email, isTeam: true };

  const approvalDate = new Date(dateStr);
  if (isNaN(approvalDate)) return { valid: false, reason: 'invalid' };

  const hoursSince = (Date.now() - approvalDate.getTime()) / (1000 * 60 * 60);
  if (hoursSince > TOKEN_HOURS) return { valid: false, reason: 'expired' };

  return { valid: true, email, isTeam: false };
}

function getTokenFromURL() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

/**
 * Remembers a validated visitor across the rest of the site (not just the
 * gated dashboard pages) by dropping a cookie with the same client_token
 * label already used in GA4 (see build-ga4-report.py / customEvent:client_token).
 * shared.js reads this cookie on every page and tags subsequent GA4 events
 * with it, so a known client's later visits to listings/markets/etc. also
 * get attributed to them — anonymous visitors are unaffected.
 */
function rememberClientToken(clientLabel) {
  var maxAgeSeconds = 30 * 24 * 60 * 60; // 30 days — independent of the 48h dashboard-token validity window
  document.cookie = 'co_client_token=' + encodeURIComponent(clientLabel) +
    ';path=/;max-age=' + maxAgeSeconds + ';SameSite=Lax';
}

/**
 * Fetches a dashboard's data.json/geo.json via the gated /api/dashboard-data
 * endpoint instead of the old plain-static path (site/dashboards/<name>/*.json
 * was previously public with no auth at all — see netlify/functions/dashboard-data.js).
 * Call with the same token already validated by this page's token-gate block.
 */
function fetchDashboardData(name, file, token) {
  var url = '/api/dashboard-data?name=' + encodeURIComponent(name) +
    '&token=' + encodeURIComponent(token);
  if (file) url += '&file=' + encodeURIComponent(file);
  return fetch(url).then(function (r) { return r.json(); });
}

function appendTokenToLinks(token) {
  document.querySelectorAll('a[data-token-link]').forEach(a => {
    const url = new URL(a.href, window.location.origin);
    url.searchParams.set('token', token);
    a.href = url.toString();
  });
}
