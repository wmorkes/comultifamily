// HTTP Basic Auth gate for the Token Generator tool and the API endpoint it
// calls to mint scoped dashboard tokens. This is the highest-privilege
// action on the site (can mint access to any dashboard scope), so it gets
// real credentials instead of the bearer-token/shared-secret pattern used
// everywhere else — the browser sends the Authorization header itself on
// every request, so nothing credential-shaped ever sits in a URL, page
// source, or published file. Free (Edge Functions, no plan upgrade needed).
//
// Covers both paths because they're reached independently: the page path
// gates browser access, but /api/sign-token could otherwise be called
// directly (e.g. via curl) bypassing the page entirely.
export default async (request, context) => {
  const expectedUser = Netlify.env.get('TOKEN_GEN_USER');
  const expectedPass = Netlify.env.get('TOKEN_GEN_PASS');

  if (!expectedUser || !expectedPass) {
    return new Response('Not Configured', { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch (e) {
      decoded = '';
    }
    const sep = decoded.indexOf(':');
    const user = sep === -1 ? decoded : decoded.slice(0, sep);
    const pass = sep === -1 ? '' : decoded.slice(sep + 1);
    if (user === expectedUser && pass === expectedPass) {
      return context.next();
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Token Generator", charset="UTF-8"' }
  });
};

export const config = { path: ['/dashboards/token-gen/*', '/api/sign-token'] };
