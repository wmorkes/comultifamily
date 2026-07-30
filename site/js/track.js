/* track.js — first-party analytics beacon, replaces GA4 pageview/event tracking.
   Sends to /api/track (netlify/functions/track.js) via sendBeacon so it never
   blocks navigation. co_client_token cookie (set by token-gate.js) is read the
   same way shared.js already does for GA4, so identified dashboard clients
   stay tied to their activity across the whole site. */
(function () {
  function getClientToken() {
    const match = document.cookie.match(/(?:^|; )co_client_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function track(eventName, extra) {
    const payload = Object.assign({
      event: eventName,
      page: location.pathname,
      referrer: document.referrer || '',
      client_token: getClientToken()
    }, extra || {});

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(function () {});
    }
  }

  window.coTrack = track;
  track('page_view');
})();
