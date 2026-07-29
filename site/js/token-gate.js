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
 * Optional first/last name carried in the URL (?fn=&ln=) when a link was
 * issued via the token generator tool, so it can be tagged onto GA4 events
 * for clients who never went through the request form.
 */
function getNameFromURL() {
  var p = new URLSearchParams(window.location.search);
  var fn = (p.get('fn') || '').trim();
  var ln = (p.get('ln') || '').trim();
  return { first: fn, last: ln, full: (fn + ' ' + ln).trim() };
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

function appendTokenToLinks(token) {
  var name = getNameFromURL();
  document.querySelectorAll('a[data-token-link]').forEach(a => {
    const url = new URL(a.href, window.location.origin);
    url.searchParams.set('token', token);
    if (name.first) url.searchParams.set('fn', name.first);
    if (name.last) url.searchParams.set('ln', name.last);
    a.href = url.toString();
  });
}
