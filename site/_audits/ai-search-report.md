Last run: 09/04/2026

# AI-Search & Structured-Data Audit

## 1. llms.txt / robots.txt / sitemap.xml — existence

All three files exist at `site/llms.txt`, `site/robots.txt`, `site/sitemap.xml`.

## 2. Sitemap sync check

Sitemap lists 23 URLs. Public, indexable `.html` pages found under `site/` (excluding `site/dashboards/**`, all of which carry `<meta name="robots" content="noindex, nofollow">` and are correctly excluded):

| Page | In sitemap? | Notes |
|---|---|---|
| `/` (index.html) | Yes | |
| `/listings/` | Yes | |
| `/services/` | Yes | |
| `/markets/` (markets/index.html) | Yes | |
| `/markets/denver/` … `/markets/jackson/` (14 pages) | Yes | |
| **`/markets/pueblo/`** | **No** | Page exists, has full metadata + canonical `/markets/pueblo/`, is not `noindex`, but is missing from the sitemap **and** not linked from `markets/index.html`'s market list. Confirmed via memory: known gap from 2026-08-31, still unresolved. |
| `/track-record/` | Yes | |
| `/distressed/` | Yes | |
| `/affordable/` | Yes | |
| `/resources/` | Yes | |
| `/team/` | Yes | |
| `/contact/` | Yes | |
| `/market-intelligence/` (market-intelligence.html) | No | Correctly excluded — page is `noindex, nofollow` (private dashboard access portal), so omission from sitemap is correct. |

**Findings:**
- (a) Page missing from sitemap: **`/markets/pueblo/`** — indexable, has correct canonical, not in sitemap.
- (b) No sitemap URL lacks a corresponding page — all 23 listed URLs resolve to existing `.html` files.
- (c) All sitemap URLs are already in proper trailing-slash form. No `.html` URLs found in sitemap.

## 3. robots.txt sanity check

- References the sitemap: yes (`Sitemap: https://www.comultifamily.com/sitemap.xml`).
- Does not block any page listed in the sitemap: confirmed — `Allow: /` for all listed user-agents (default, GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, CCBot, Google-Extended, FacebookBot, Amazonbot), no `Disallow` lines at all.
- Note: `site/dashboards/**` pages are not blocked by robots.txt, but they don't need to be — every dashboard page carries `noindex, nofollow` directly, which is the correct control for gated content (robots.txt disallow would only stop crawling, not deter direct access, and would still let the URLs appear in search results without a snippet).

## 4. llms.txt freshness check

- All 15 market pages mentioned by name or market grouping (Denver Metro, Boulder, Fort Collins, Greeley, Colorado Springs, Western Slope, Mountain Towns, Cheyenne, Casper, Laramie, Gillette, Rock Springs, Sheridan, Jackson Hole) under "Market Coverage" — consistent with the live sitemap/page set.
- **Pueblo is not mentioned anywhere in llms.txt**, consistent with it also being missing from the sitemap and markets nav — same underlying gap.
- Links referenced in llms.txt (`/affordable/`, `/distressed/`, sitemap URL) all resolve to live, indexable pages.
- No llms.txt entries point to pages that no longer exist.
- "Content Freshness" section states market pages "were last reviewed in May 2026" — still accurate relative to file `lastmod` dates in sitemap.xml (05/26–05/28/2026).

**Section verdict:** llms.txt is otherwise in sync with the live site; only gap is the same Pueblo omission noted above.

---

## 5. Meta tags (meta-audit)

Scanned all 26 public `.html` pages (`site/*.html` + `site/markets/*.html`), excluding `site/dashboards/**` (gated/noindex, out of scope for public SEO metadata).

| File | Title (len) | Desc (len) | Canonical | Issues |
|---|---|---|---|---|
| market-intelligence.html | 52 | 82 | `/market-intelligence/` | Desc under 150–160 (82 chars) — acceptable given page is `noindex` |
| markets/pueblo.html | 55 | 161 | `/markets/pueblo/` | Desc 1 char over 160 (161) — negligible |
| index.html | 53 | 156 | `/` | none |
| listings.html | 53 | 159 | `/listings/` | none |
| services.html | 55 | 158 | `/services/` | none |
| team.html | 58 | 153 | `/team/` | none |
| contact.html | 54 | 151 | `/contact/` | none |
| track-record.html | 56 | 160 | `/track-record/` | none |
| resources.html | 52 | 159 | `/resources/` | none |
| affordable.html | 54 | 155 | `/affordable/` | none |
| distressed.html | 54 | 157 | `/distressed/` | none |
| markets/boulder.html | 56 | 157 | `/markets/boulder/` | none |
| markets/casper.html | 55 | 158 | `/markets/casper/` | none |
| markets/cheyenne.html | 57 | 158 | `/markets/cheyenne/` | none |
| markets/colorado-springs.html | 50 | 153 | `/markets/colorado-springs/` | none |
| markets/denver.html | 55 | 154 | `/markets/denver/` | none |
| markets/fort-collins.html | 57 | 157 | `/markets/fort-collins/` | none |
| markets/gillette.html | 57 | 151 | `/markets/gillette/` | none |
| markets/greeley.html | 56 | 159 | `/markets/greeley/` | none |
| markets/index.html | 53 | 159 | `/markets/` | none |
| markets/jackson.html | 56 | 153 | `/markets/jackson/` | none |
| markets/laramie.html | 56 | 152 | `/markets/laramie/` | none |
| markets/mountain-towns.html | 59 | 160 | `/markets/mountain-towns/` | none |
| markets/rock-springs.html | 57 | 151 | `/markets/rock-springs/` | none |
| markets/sheridan.html | 57 | 159 | `/markets/sheridan/` | none |
| markets/western-slope.html | 58 | 153 | `/markets/western-slope/` | none |

All pages have a `<link rel="canonical">` starting with `https://www.comultifamily.com/` and ending in `/`, and `og:url` matches canonical on every page checked.

**Summary:** 26 pages scanned, 2 pages with (minor) issues, 24 clean. Most common issue type: description length slightly outside the 150–160 target band (both cases are 1–68 chars off, not structural — market-intelligence.html is intentionally short since it's a `noindex` gated-access page).

---

## 6. Structured data (schema-validate)

JSON-LD block counts per page (all parsed without error; every block uses `@context: "https://schema.org"` — zero parse or context failures found across all 26 pages checked):

| Page | Blocks | Types |
|---|---|---|
| index.html | 1 (`@graph`) | RealEstateAgent, Person×3, WebPage, LocalBusiness, Review×3 |
| listings.html | 2 | RealEstateAgent, CollectionPage/Person×3/WebPage |
| services.html | 2 | Service×5, WebPage/RealEstateAgent/BreadcrumbList/HowTo/FAQPage |
| team.html | 2 | Person×3, WebPage/RealEstateAgent/BreadcrumbList |
| contact.html | 2 | RealEstateAgent, ContactPage/Person×3/LocalBusiness/WebPage |
| track-record.html | 2 | ItemList, WebPage/RealEstateAgent/BreadcrumbList |
| resources.html | 3 | RealEstateAgent, CollectionPage/Person×3/WebPage, RealEstateAgent/BreadcrumbList/Dataset |
| affordable.html | 1 | Service/WebPage/RealEstateAgent/BreadcrumbList/FAQPage |
| distressed.html | 1 | Service/WebPage/RealEstateAgent/BreadcrumbList/FAQPage |
| market-intelligence.html | 1 | WebPage only (page is `noindex`) |
| markets/index.html | 2 | RealEstateAgent, Person×3/WebPage |
| markets/*.html (14 market pages; sampled denver, jackson, pueblo + spot-checked all 15 for the RealEstateAgent.url check below) | 4–5 each | RealEstateAgent, FAQPage, BreadcrumbList, WebPage, (+ItemList on most) |

### Checklist results

**@context / valid JSON — all pages: PASS.** No parse errors, `@context` is `https://schema.org` throughout.

**RealEstateAgent pattern (index.html, team.html, etc.):**
- `@context`, `name`, `url`, `telephone`, `email`, `address` present: PASS on all checked pages.
- `address` has `@type: PostalAddress`, `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`: PASS.
- **`member` field (array of Person): FAIL as literally specified.** index.html and other pages using the `@graph` pattern do not nest team members inside a `member` array on the RealEstateAgent node — instead `Person` nodes are sibling entries in the same `@graph` (implicitly linked by shared context, not an explicit `member` relationship). This is consistent site-wide (index.html, listings.html, team.html, contact.html, resources.html, markets/index.html all follow the same `@graph`-sibling pattern rather than nesting `member`), so it reads as an intentional, established pattern rather than a one-off omission — but it technically fails the documented checklist. **No corrective action recommended without design sign-off**, since changing 6+ pages' schema graph shape is a deliberate content decision, not a bug fix.
- Each `Person` has `@type`, `name`, `jobTitle`, `email`, `telephone`: PASS (spot-checked index.html, team.html, contact.html).

**Market pages (all 15: boulder, casper, cheyenne, colorado-springs, denver, fort-collins, gillette, greeley, jackson, laramie, mountain-towns, pueblo, rock-springs, sheridan, western-slope):**
- `@type` is `RealEstateAgent`: PASS on all 15.
- `areaServed` present and matches page's target market: PASS — each page's `areaServed` is a `City` object naming that specific market (e.g., Denver page → `{"@type":"City","name":"Denver",...}`).
- **`url` matches page's canonical URL: FAIL on all 15 market pages.** Every market page's `RealEstateAgent.url` is hardcoded to `https://www.comultifamily.com` (the site root) instead of that page's own canonical (e.g., `markets/denver.html`'s canonical is `https://www.comultifamily.com/markets/denver/` but its RealEstateAgent schema `url` field is `https://www.comultifamily.com`). This is 100% consistent across all 15 pages, so it's a systemic pattern rather than a per-page bug — plausibly intentional, since `url` on an organization/agent entity conventionally points to the entity's primary URL, not the URL of whichever page embeds it. Flagging per the documented spec, but recommend confirming intent before changing 15 files: if the pattern is deliberate (RealEstateAgent = the organization, referenced consistently across pages), no fix is needed; if it should instead identify the specific page, all 15 need the `url` field updated to their own canonical.

### Corrected JSON (if the `url` mismatch above is treated as a bug)

Example fix for `markets/denver.html`, changing only the `url` field:
```json
{
  "@type": "RealEstateAgent",
  "name": "CO Multifamily Advisors",
  "url": "https://www.comultifamily.com/markets/denver/",
  ...
}
```
(Same pattern would apply to the other 14 market pages, substituting each page's own canonical.)

---

## Summary

- **Sitemap/robots/llms.txt:** all three files present and mutually consistent, with one real gap — **`/markets/pueblo/`** is missing from `sitemap.xml` and unmentioned in `llms.txt`, despite being a live, indexable page with correct on-page SEO metadata. This has been a known, tracked gap since 08/31/2026 and remains unresolved.
- **Meta tags:** clean across the board — only trivial (1–68 char) description-length deviations on 2 of 26 pages, one of which is a `noindex` gated page where it doesn't matter.
- **Structured data:** no JSON parse errors or `@context` issues anywhere. Two systemic (not random) deviations from the documented schema-validate spec: (1) `member` isn't nested as a Person array on RealEstateAgent nodes — it's a sibling-node `@graph` pattern used consistently site-wide; (2) all 15 market pages' `RealEstateAgent.url` points to the site root rather than each page's own canonical. Both look like deliberate, consistent design choices rather than bugs, but are flagged per spec for confirmation.

**Recommended next action:** add `/markets/pueblo/` to `sitemap.xml`, link it from `markets/index.html`'s market list, and add it to `llms.txt`'s Market Coverage section — this is the one unambiguous, low-risk fix from this audit.
