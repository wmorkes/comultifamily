/**
 * Token gate for CO Multifamily Advisors dashboard portal.
 *
 * Token format: base64("email|YYYY-MM-DD")
 * Team emails bypass expiry. Client tokens expire after 7 days.
 * To revoke: remove the token from VALID_TOKENS and redeploy.
 */

const TEAM_EMAILS = [
  'bill.morkes@colliers.com',
  'craig.stack@colliers.com',
  'nate.moyer@colliers.com'
];

// Add approved client tokens here. Each is base64("email|YYYY-MM-DD").
const VALID_TOKENS = [
  // example: btoa('client@example.com|2026-06-25') → 'Y2xpZW50QGV4YW1wbGUuY29tfDIwMjYtMDYtMjU='
  // team test: btoa('bill.morkes@colliers.com|2026-06-30')
  'YmlsbC5tb3JrZXNAY29sbGllcnMuY29tfDIwMjYtMDYtMzA=',
];

const TOKEN_DAYS = 7;

function validateToken(token) {
  if (!token) return { valid: false, reason: 'no_token' };
  if (!VALID_TOKENS.includes(token)) return { valid: false, reason: 'invalid' };

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

  const daysSince = (Date.now() - approvalDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > TOKEN_DAYS) return { valid: false, reason: 'expired' };

  return { valid: true, email, isTeam: false };
}

function getTokenFromURL() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

function appendTokenToLinks(token) {
  document.querySelectorAll('a[data-token-link]').forEach(a => {
    const url = new URL(a.href, window.location.origin);
    url.searchParams.set('token', token);
    a.href = url.toString();
  });
}
