Last run: 09/04/2026

# Dead Code Audit — JS & Assets

Scope: `site/js/*.js`, `netlify/functions/*.js`, `site/images/`, `site/data/`. CSS dead-code (unused classes) is out of scope — see `/css-audit`.

## 1. Unused JS functions/consts

| Check | Status | Detail |
|---|---|---|
| `site/js/deal-map.js` — all functions (`formatPrice`, `pinSize`, `makePinIcon`, `buildInfoWindow`, `renderMarkers`, `window.setMapFilter`, `window.loadDeals`, `window.initMap`) | PASS | Internal helpers all called within the file; `window.setMapFilter`/`loadDeals`/`initMap` invoked from `track-record.html` (Google Maps callback + filter buttons). File itself referenced from `track-record.html` and `listings.html`. |
| `site/js/market-stats.js` — IIFE + inner `fmtPpu`/`fmtVol`/`fmtPct` | PASS | Self-invoking; all internal helpers used within the same closure. Script tag found on market pages and dashboard market pages. |
| `site/js/track.js` — `getClientToken`, `track`, `window.coTrack` | PASS | `coTrack` referenced in `listings.html`/`track-record.html` (event tracking calls); `track.js` is also dynamically injected sitewide by `shared.js`. |
| `site/js/shared.js` — `injectSchema`, `injectOpenGraph`, `NAV_HTML`, `FOOTER_HTML`, `SCHEMA_ORG` | PASS | All called/used inside the `DOMContentLoaded` handler in the same file. `shared.js` is included on effectively every page. |
| `site/js/token-gate.js` — `validateToken`, `isDashboardUnlocked`, `getTokenFromURL`, `rememberClientToken`, `fetchDashboardData`, `appendTokenToLinks`, `TEAM_EMAILS`, `TOKEN_HOURS` | PASS | These are non-module globals consumed by inline `<script>` blocks in the 20+ dashboard pages (hub, per-dashboard gates, mobile variants, token-gen). Confirmed via grep matches across `site/dashboards/**/index.html`. |
| `site/js/dashboard-visibility.js` — `REVOKED_EMAILS`, `CLIENT_VISIBLE` | PASS | Read by `token-gate.js` (`isDashboardUnlocked`) and by inline scripts on the dashboard hub/pages for card visibility. |
| `netlify/functions/report.js`, `track.js`, `sign-token.js`, `dashboard-data.js` — default-exported handlers | PASS | Each is a Netlify Function entry point invoked by the Netlify runtime via its file-based route (`/api/track`, `/api/dashboard-data`, etc.), not by in-repo grep-able calls — excluded from dead-code flagging by design. No unused internal helpers found within any of the four files. |

No unused top-level functions/consts found in `site/js/*.js` or `netlify/functions/*.js`.

## 2. Orphaned images (`site/images/`)

| File | Status | Detail |
|---|---|---|
| `Colliers_Logo-130px.webp` | REVIEW — likely dead | No reference in any `.html`/`.css`/`.js`. Site uses `Colliers-Logo-BW.webp` (different filename, hyphenated) for the logo everywhere. High confidence this is a leftover from a prior logo asset naming pass. |
| `Colliers_Logo-300px.webp` | REVIEW — likely dead | Same as above. |
| `hero-bg-inner.webp` | REVIEW — likely dead | No match found; `hero-bg.webp` is the one actively used. |
| `hero-denver-old.webp` | REVIEW — likely dead | Filename ("-old") plus zero references strongly suggests a superseded version of `hero-denver.webp`, which is in active use. |
| `hero_mixed_use_denver.webp` | REVIEW — likely dead | No references found across the site. |
| `Hero__Property_Exterior.webp` | REVIEW — likely dead | No references found. |
| `Hero__Property_Interior.webp` | REVIEW — likely dead | No references found. |
| `Hero__Renew_on_Stout.webp` | REVIEW — likely dead | No references found. |
| `listings/am.webp`, `C.webp`, `CC.webp`, `DR.webp`, `ez.webp`, `m.webp`, `mfc.webp`, `msh.webp`, `pp.webp`, `soc.webp`, `v.webp`, `vt.webp` | REVIEW — cannot confirm from repo alone | `listings.html` builds `<img>` src as `/images/listings/${image}` where `image` comes from the live-fetched Google Sheet "Listings" tab (per CLAUDE.md), not a literal string in the repo. These filenames don't appear as string literals anywhere in the codebase, but the Sheet (external, not checked by this audit) may reference any of them by exact filename. Do not delete without cross-checking the live Listings sheet's `Image` column first. |
| All other files under `site/images/` (hero photos, team headshots, flags, testimonials, market hero images, etc.) | PASS | Referenced directly in HTML/CSS. |

## 3. Orphaned data files (`site/data/`)

| File | Status | Detail |
|---|---|---|
| `deals-template.csv` | REVIEW — likely dead | Zero references anywhere in the repo (only mentioned as a path in `CLAUDE.md`'s file-structure diagram, not fetched/loaded by any code). Appears to be a template/reference artifact rather than a file the site loads at runtime — track record data comes from the live Google Sheet, not this CSV. |
| `market-data.json` | PASS | Fetched via `fetch('/data/market-data.json')` in `site/js/market-stats.js`. |

## Summary

**16 items flagged for review** (8 clearly-orphaned images with no naming ambiguity, 12 `listings/` images needing a live-sheet cross-check, and 1 orphaned data file — note: totals overlap in category, see counts below). No dead JS functions/consts found; no dead Netlify function code found.

- JS/functions: 0 flagged
- Images: 20 flagged (8 high-confidence orphans, 12 requiring live-sheet verification)
- Data files: 1 flagged (`deals-template.csv`)
- **Total flagged: 21**
