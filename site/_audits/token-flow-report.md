Last run: 09/04/2026

# Dashboard Token Flow Security Audit

Scope: `netlify/functions/sign-token.js`, `netlify/functions/dashboard-data.js`, `netlify/functions/report.js` — the token mint → token validate → gated data read path (Netlify form → Bill's manual review → token-gen mint → client dashboard access, per current manual-approval flow documented in project memory).

## Summary

No hardcoded secrets found. All three functions read their signing/shared secrets from environment variables (`TOKEN_SIGNING_SECRET`, `DASHBOARD_DATA_SECRET`, `REPORT_SECRET`) and fail closed (`500`/`401`) when the env var is unset. Expiry is present and actually enforced for non-team tokens. Dataset access uses an allowlist rather than raw filesystem interpolation, closing path-traversal risk. No response body leaks stack traces, file paths, or secret fragments. No CORS headers are set on any of the three endpoints, which is safe-by-default (no wildcard `Access-Control-Allow-Origin`) but is also not an explicit origin allowlist — see findings below.

## Findings

| File | Check | Status | Detail |
|---|---|---|---|
| sign-token.js | Secret handling | Pass | `process.env.TOKEN_SIGNING_SECRET`, returns 500 if unset. No hardcoded secret. |
| sign-token.js | Auth on mint endpoint | Pass (by design) | No auth check in the function itself; comment explains it's gated upstream by `netlify/edge-functions/token-gen-auth.js` (HTTP Basic Auth). Not verified in this audit (out of scope per instructions — only the three named files were read), but the documented design is sound: mint is meaningless without downstream scope enforcement in dashboard-data.js, which is verified below. |
| sign-token.js | Input validation | Partial | `email` is checked for presence/type only, not format (no regex/shape validation). `scope` is filtered to an array of non-empty strings. Since the signed payload is opaque and scope enforcement happens against a fixed allowlist in dashboard-data.js (`DATASETS`/`TEAM_ONLY`/`CLIENT_VISIBLE`), a malformed email or arbitrary scope string cannot expand access — worst case is a token that decodes to garbage and fails downstream checks. Low risk, but stricter email validation would be a cheap hardening. |
| sign-token.js | CORS | N/A | No CORS headers set. Endpoint is POST-only and sits behind Basic Auth upstream; absence of `Access-Control-Allow-Origin` defaults to same-origin-only for browser callers, which is the safe default here. |
| sign-token.js | Error responses | Pass | Generic `Bad Request`/`Not Configured`/`Method Not Allowed` strings only. No internal detail leakage. |
| dashboard-data.js | Expiry | Pass | `TOKEN_HOURS = 48`, computed via `hoursSince` and rejected if exceeded, for non-team tokens. Team tokens (`TEAM_EMAILS` allowlist) intentionally bypass expiry — matches documented design. |
| dashboard-data.js | Secret handling | Pass | `TOKEN_SIGNING_SECRET` (HMAC verify for 3-segment scoped tokens) and `DASHBOARD_DATA_SECRET` (server-to-server bypass) both read from env vars, no hardcoded values. Signature comparison uses `timingSafeEqual` via `timingSafeStringEqual`, guarding against timing attacks. |
| dashboard-data.js | Token integrity | Pass | 2-segment legacy tokens (`email|date`) are accepted unsigned (matches documented legacy/no-scope case), but 3-segment scoped tokens require a valid HMAC signature or are rejected — an attacker cannot forge or escalate scope without the signing secret. |
| dashboard-data.js | Input validation | Pass | `name`/`file` query params are checked against a hardcoded `DATASETS` allowlist (`Object.prototype.hasOwnProperty.call` + `.includes`) before being used to build a filesystem path via `path.join`. This is the fix referenced in the file's own comments for a prior "public JSON, no auth" issue — no path traversal possible since only allowlisted basenames reach `readFileSync`. |
| dashboard-data.js | Authorization logic | Pass | `TEAM_ONLY` datasets (loan-monitor, followup-gaps, capital-flow, on-market) unconditionally require `isTeam`, regardless of scope contents — closes the scope-leak gap described in project memory (fixed 2026-08-25, commits 510df04/6326466). `REVOKED_EMAILS` checked before trust is extended. |
| dashboard-data.js | CORS | N/A | No CORS headers set. Same reasoning as sign-token.js — same-origin default is appropriate since this serves the site's own dashboard pages, not a public API. |
| dashboard-data.js | Error responses | Pass | Failure paths return bare `Unauthorized`/`Not Found`/`Method Not Allowed`. The `catch` around `readFileSync` swallows the real error and returns generic `Not Found` — no stack trace or filesystem path leakage. |
| report.js | Secret handling | Pass | `process.env.REPORT_SECRET`, compared directly (not timing-safe, see below) and returns 401 if missing/mismatched. No hardcoded secret. |
| report.js | Secret comparison timing safety | Minor finding | Unlike `dashboard-data.js`, the secret check here (`url.searchParams.get('secret') !== secret`) is a plain string comparison, not `timingSafeEqual`. This endpoint is a server-to-server integration (db-tools `build_site_report.py`) rather than a browser-facing auth path, so risk is low, but for consistency with the pattern already established in `dashboard-data.js` it would be an easy hardening to match. |
| report.js | Expiry | N/A | No token involved — pure shared-secret gate, by design (server-to-server consumer, not a user session). |
| report.js | Input validation | Pass | `since`/`until` are only ever passed into `new Date(...)` for day-range iteration; an invalid date value only produces an empty/short day list, not a code-execution or path issue. No filesystem or lookup-key use of unvalidated input. |
| report.js | CORS | N/A | No CORS headers set — appropriate, this is a machine-to-machine endpoint (db-tools), not called from a browser. |
| report.js | Error responses | Pass | Only a 401 `Unauthorized` failure path exists explicitly; no other branch constructs an error body with internal detail. (Note: an unhandled exception from Blobs store calls would surface as Netlify's default 500 page, not a custom leaky response — not exercised/verified in this static read-only audit.) |

## Cross-check against documented Make.com approval flow (project_dashboard_portal.md)

| Memory claim | Code state | Match |
|---|---|---|
| Access flow is now manual: client requests via form → Bill confirms → Bill manually mints a scoped, signed token via token-gen (2026-08-25) | `sign-token.js` mints `email\|date\|scope` payloads with HMAC signature when scope is provided; consistent with a manual mint tool, not an automated Make.com mint | Match |
| Token format: 2-segment unsigned legacy (`email\|date`) still valid; 3-segment scoped tokens require HMAC signature | `dashboard-data.js validateToken()` accepts both, only requiring signature verification when a 3rd segment is present | Match |
| Client expiry 48 hours, team no expiry | `TOKEN_HOURS = 48`, `isTeam` bypasses the expiry check entirely | Match |
| All 4 team-only dashboards (loan-monitor, followup-gaps, capital-flow, on-market) hard-blocked from scope-based access, fixed 2026-08-25 | `TEAM_ONLY` array present and checked unconditionally before `CLIENT_VISIBLE`/scope logic | Match |
| `CLIENT_VISIBLE` map — all currently `false` (no dataset is opt-in visible without explicit scope) | Confirmed: every entry in `CLIENT_VISIBLE` in `dashboard-data.js` is `false` | Match |
| `TEAM_EMAILS` — bill.morkes, craig.stack, nate.moyer, jason.wolfthal, nate.morris @colliers.com | Exact same 5 emails in `dashboard-data.js` `TEAM_EMAILS` | Match |
| `REVOKED_EMAILS` emergency revocation list exists server-side, mirrors `dashboard-visibility.js` | Present in `dashboard-data.js`, currently empty (commented placeholder only) | Match — no drift, consistent with memory noting no revocations issued yet |
| `report.js` gated by `REPORT_SECRET` for db-tools `build_site_report.py` consumer | Confirmed, matches file's own header comment | Match |

No drift detected between the code and the documented flow. The three files reviewed reflect the 2026-08-25 hardening pass (scope signing, TEAM_ONLY lockdown) described in memory, not an earlier/stale state.

## Critical Findings

None. No hardcoded secrets, no CORS wildcard exposure, no path traversal, no unenforced expiry, and no information-leaking error responses were found in `sign-token.js`, `dashboard-data.js`, or `report.js`.

## Minor / Optional Hardening (not urgent)

1. `report.js` secret comparison is not timing-safe (`!==` instead of `timingSafeEqual`) — low risk given it's a server-to-server endpoint, but inconsistent with the pattern already used in `dashboard-data.js`.
2. `sign-token.js` does not validate `email` format beyond "is a non-empty string" — low risk since scope enforcement is allowlist-based downstream, but cheap to tighten.
