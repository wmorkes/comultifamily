Last run: 09/04/2026

# Tracking / Analytics Wiring Audit

## Method

- Enumerated every `.html` file under `site/` (47 pages: public pages, `site/markets/*`, `site/dashboards/*` incl. mobile variants and `site/dashboards/markets/*`).
- Read `site/js/track.js` to confirm the real inclusion pattern before flagging anything as "missing."
- Read `site/js/shared.js`, `site/js/token-gate.js`, `site/js/dashboard-visibility.js`.
- Read `netlify/functions/track.js` (the `/api/track` endpoint) and diffed its expected payload against what the client actually sends.

**Key finding on inclusion pattern:** `js/track.js` is not hand-added as a `<script src="/js/track.js">` tag on every page. Instead, `site/js/shared.js` (included on every non-dashboard-tool page as `<script src="/js/shared.js">`) injects it dynamically:

```js
// shared.js
if (document.querySelector('script[src="/js/track.js"]')) return;
s.src = '/js/track.js';
```

So "no literal `track.js` tag in the HTML source" is expected/correct for any page that includes `shared.js` — it is not a gap. All dashboard pages include `track.js` directly instead of via `shared.js`.

GA4 is loaded via the standard inline `gtag.js` snippet referencing `G-53BCG1FL5M` (checked directly, not via shared.js).

---

## Page-by-page table

| Page | GA4 present | Custom tracker present | Notes |
|---|---|---|---|
| site/index.html | Yes | Yes (via shared.js) | OK |
| site/contact.html | Yes | Yes (via shared.js) | OK |
| site/listings.html | Yes | Yes (via shared.js) | OK |
| site/services.html | Yes | Yes (via shared.js) | OK |
| site/team.html | Yes | Yes (via shared.js) | OK |
| site/resources.html | Yes | Yes (via shared.js) | OK |
| site/track-record.html | Yes | Yes (via shared.js) | OK |
| site/affordable.html | Yes | Yes (via shared.js) | OK |
| site/distressed.html | Yes | Yes (via shared.js) | OK |
| site/market-intelligence.html | Yes | Yes (via shared.js) | OK |
| site/markets/index.html | Yes | Yes (via shared.js) | OK |
| site/markets/denver.html | Yes | Yes (via shared.js) | OK |
| site/markets/boulder.html | Yes | Yes (via shared.js) | OK |
| site/markets/fort-collins.html | Yes | Yes (via shared.js) | OK |
| site/markets/colorado-springs.html | Yes | Yes (via shared.js) | OK |
| site/markets/greeley.html | Yes | Yes (via shared.js) | OK |
| site/markets/pueblo.html | Yes | Yes (via shared.js) | OK |
| site/markets/western-slope.html | Yes | Yes (via shared.js) | OK |
| site/markets/mountain-towns.html | Yes | Yes (via shared.js) | OK |
| site/markets/cheyenne.html | Yes | Yes (via shared.js) | OK |
| site/markets/casper.html | Yes | Yes (via shared.js) | OK |
| site/markets/gillette.html | Yes | Yes (via shared.js) | OK |
| site/markets/jackson.html | Yes | Yes (via shared.js) | OK |
| site/markets/laramie.html | Yes | Yes (via shared.js) | OK |
| site/markets/rock-springs.html | Yes | Yes (via shared.js) | OK |
| site/markets/sheridan.html | Yes | Yes (via shared.js) | OK |
| site/dashboards/index.html | Yes | Yes (direct tag) | Hub page, OK |
| site/dashboards/capital-flow/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/on-market/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/loan-monitor/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/loan-monitor/mobile/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/followup-gaps/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/pipeline/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/pipeline/mobile/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/rental-trends/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/sales-by-year/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/sales-by-year/mobile/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/deliveries-by-year/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/deliveries-by-year/mobile/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/chfa/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/chfa/mobile/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/affordable-housing/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/token-gen/index.html | Yes | Yes (direct tag) | OK — see dashboard-specific notes |
| site/dashboards/markets/wyoming/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/fort-collins/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/greeley/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/boulder/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/denver-metro/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/colorado-springs/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/pueblo/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/western-slope/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/mountain-towns/index.html | Yes | Yes (direct tag) | OK |
| site/dashboards/markets/rural-tertiary-co/index.html | Yes | Yes (direct tag) | OK |
| **site/dashboards/geocode/index.html** | **No** | **No** | **FLAGGED** — internal batch-geocoding tool (`noindex, nofollow`, "Internal batch address geocoder... Private tool."). No `shared.js`, no GA4, no `track.js`, no `token-gate.js`, no `dashboard-visibility.js`. Appears to be an intentionally bare internal utility, not a client-facing dashboard — but confirm with Bill whether it should at least carry `token-gate.js` since it lives under `/dashboards/` and has no access control at all. |

**GA4 count:** 46/47 pages carry the `G-53BCG1FL5M` snippet. Only `dashboards/geocode/` is missing it.
**Custom tracker count:** 46/47 pages load `track.js` (directly or via `shared.js`). Only `dashboards/geocode/` is missing it.

---

## Dashboard-specific findings (`token-gate.js` / `dashboard-visibility.js`)

Checked all pages under `site/dashboards/` (25 files).

| Page | token-gate.js | dashboard-visibility.js | Notes |
|---|---|---|---|
| dashboards/index.html (hub) | Yes | Yes | OK |
| dashboards/capital-flow | Yes | Yes | Fully-internal dashboard per `dashboard-visibility.js`'s own header comment ("Capital Flow, On-Market, Loan Monitor, Gap Report... don't use this file at all") — yet it **does** include the script tag. Harmless (script just has no effect if the dashboard isn't in `CLIENT_VISIBLE`), but inconsistent with the comment. Not a functional bug — informational only. |
| dashboards/on-market | Yes | Yes | Same informational note as above. |
| dashboards/loan-monitor (+ mobile) | Yes | Yes | Same informational note as above. |
| dashboards/followup-gaps | Yes | Yes | Same informational note as above ("Gap Report" in the comment). |
| dashboards/pipeline (+ mobile) | Yes | Yes | OK, client-visible dashboard — expected to use the file. |
| dashboards/rental-trends | Yes | Yes | OK |
| dashboards/sales-by-year (+ mobile) | Yes | Yes | OK |
| dashboards/deliveries-by-year (+ mobile) | Yes | Yes | OK |
| dashboards/chfa (+ mobile) | Yes | Yes | OK |
| dashboards/affordable-housing | Yes | Yes | OK |
| dashboards/markets/* (9 sub-market pages) | Yes | Yes | OK |
| **dashboards/token-gen/index.html** | Yes | **No** | Expected — this is the internal token-generation tool used by the team, not a client dashboard gated by `CLIENT_VISIBLE`. It correctly keeps `token-gate.js` (so only team logins can generate tokens) but has no reason to load `dashboard-visibility.js`. Not a gap. |
| **dashboards/geocode/index.html** | **No** | **No** | **FLAGGED** — see above. No access control of any kind on an internal tool living under `/dashboards/`. |

---

## Client/server (`track.js` ↔ `netlify/functions/track.js`) consistency check

**Client (`site/js/track.js`)** posts via `sendBeacon`/`fetch` to `/api/track` with:
```js
{ event, page, referrer, client_token, ...extra }
```

**Server (`netlify/functions/track.js`)** reads from the JSON body:
```js
payload.event, payload.page, payload.referrer, payload.client_token,
payload.listing_property, payload.listing_city, payload.listing_type
```

- Endpoint path matches: client posts to `/api/track`; this is presumably redirected/mapped to the `track` function via `netlify.toml` (not re-verified in this pass — recommend a quick redirect-rule check if `/api/track` calls ever start 404ing).
- Required-field check on the server (`event`, `page`) matches what the client always sends (`track()` always sets both).
- `referrer` and `client_token` field names match exactly on both sides.
- `listing_property`, `listing_city`, `listing_type` are server-side optional fields not set by the base `track()` call in `track.js` itself — they must be passed by callers via `window.coTrack(eventName, { listing_property, listing_city, listing_type })` on listing-related pages. This audit did not trace every call site of `window.coTrack(...)` across the site to confirm those three field names are used consistently by callers (e.g., `listings.html`, market pages linking to listings). **Recommend a follow-up pass grepping for `coTrack(` call sites to confirm the extra-field names passed match `listing_property` / `listing_city` / `listing_type` exactly** — a silent mismatch here (e.g., a caller using `property` instead of `listing_property`) would not error, it would just silently drop that dimension from the stored record.
- No mismatch found in the core event/page/referrer/client_token pipeline.

---

## Summary of flags

1. **`site/dashboards/geocode/index.html`** — no GA4, no custom tracker, no token-gate, no dashboard-visibility. Confirm with Bill whether this is intentional (it reads as an internal-only tool) or whether it needs at least `token-gate.js` for access control.
2. **Informational only:** `capital-flow`, `on-market`, `loan-monitor` (+mobile), `followup-gaps` all still include `dashboard-visibility.js` even though the file's own header comment says these "fully-internal" dashboards don't use it. No functional impact, just a bit of unused-but-harmless inclusion — worth pruning in a future cleanup pass for consistency with the comment.
3. **Untraced:** call sites of `window.coTrack(...)` with `listing_property`/`listing_city`/`listing_type` extras were not individually verified against the server's field names in this pass.
