Last run: 09/04/2026

# CSS Health Audit — comultifamily.com

Scope: `site/css/style.css` (2923 lines) against all HTML files in `site/`, `site/markets/`, and `site/dashboards/`, plus `site/js/*.js` for dynamically-applied classes.

## Summary Table

| Check | Status | Detail |
|---|---|---|
| 1. Duplicate selectors (identical rules) | PASS | No two selectors found with byte-identical declaration blocks. |
| 2. Duplicate/conflicting element or class rules | FAIL | `.page-hero--inner` and `.team-photo` each defined twice with **conflicting** properties (see P1 below). `.sidebar-stat-label` defined twice with non-conflicting properties that should be merged. |
| 3. Unused CSS classes | FAIL | 76 classes defined in `style.css` have zero matches (literal or dynamic) in any HTML/JS file — see full list below. |
| 4. `!important` usage | PASS (mostly) | 6 uses found; all are legitimate mobile/state overrides, none are specificity hacks. |
| 5. Hardcoded colors vs variables | FAIL | `#b85555` hardcoded twice instead of `var(--color-distressed)`; `--white` variable defined but never used (23 literal `#fff`/`#ffffff` instead); `var(--gold-light, #d4af5a)` fallback doesn't match the real `--gold-light` value (`#e2c97e`). |
| 6. Dead/hidden classes | FAIL | `.map-placeholder`, `.deal-pin`, `.pin-circle-lg/md/sm`, `.map-svg-container` are leftover SVG-map styles — `track-record.html` now renders a live map via `#dealMap` instead. |
| 7. Redundant font-family declarations | PASS (accepted) | `font-family: 'Inter', sans-serif` is redeclared ~80+ times on elements that already inherit it from `body`. Per prior review (`feedback_inter_purge` memory note), this was explicitly reviewed and left alone — zero visual impact, not worth the churn/risk. No new action needed. |
| 8. Media query hygiene | PASS | Mobile overrides (`@media max-width: 1200/768px`) consistently narrow padding/grid-columns from desktop base rules; no contradictory leftovers found. |
| 9. CSS variable usage consistency | FAIL | `1320px` hardcoded 3× instead of `var(--max-width)`; `rgba(201,168,76,0.03)` (gold hover tint) repeated 9× with no variable. |

---

## Detailed Findings

### Check 2 — Conflicting duplicate selectors

**`.page-hero--inner`** — defined twice:
- Line 193: `min-height: 650px;`
- Line 887: `min-height: 100vh; justify-content: flex-end; padding-bottom: 30px;`

Because the second block appears later in the cascade at equal specificity, it silently wins and the `650px` at line 193 is dead — every page using `.page-hero--inner` actually gets `100vh`, not `650px`. This is confusing to future maintainers and should be merged into one block.

**`.team-photo`** — defined twice for two unrelated components:
- Line 563–566 (Team Preview / homepage cards): `position: relative; overflow: hidden;` — no fixed size, meant to be sized by a parent.
- Line 1515–1524 (Team page bios? or homepage `.team-card`): `width: 88px; height: 88px; border-radius: 50%; background: var(--navy-light); border: 2px solid var(--border); margin-bottom: 20px; ...`

The second, later block wins on any page where both rules would apply, fully overriding the first block's intent. Rename one (e.g. `.team-photo-circle`) or consolidate so the class isn't reused for two different visual treatments.

**`.sidebar-stat-label`** — defined twice, non-conflicting but should be merged:
- Line 790: `flex-shrink: 0;`
- Line 796: `font-size: 13px; font-family: 'Inter', sans-serif; font-weight: 400; text-transform: none; letter-spacing: normal; color: var(--text-soft);`

### Check 3 — Unused classes (76 total)

None of these have any `class="..."` match or dynamic `classList`/template-string reference anywhere in `site/`:

`colliers-bar`, `deal-loading`, `deal-pin`, `deal-spinner`, `deals-table-name-sub`, `deals-teaser`, `email-cta-block`, `email-form`, `email-note`, `exp-badge`, `gold-divider`, `hero-panel-total`, `hero-panel-total-label`, `hero-panel-total-num`, `hero-partner-info`, `hero-partner-initials`, `hero-partner-kv`, `hero-partner-name`, `hero-partner-photo`, `hero-partner-row`, `hero-partner-stats`, `hero-partner-title`, `hero-right`, `hero-team-panel`, `hero-team-panel-label`, `hero-trust`, `hero-trust-grid`, `hero-trust-item`, `hero-trust-label`, `hero-trust-logos`, `jump-nav-label`, `jump-nav-row`, `listing-cta`, `listings-notice`, `logo-sep`, `map-placeholder`, `map-svg-container`, `markets-state-header`, `notice-icon`, `notice-text`, `partners-strip-sep`, `photo-hint`, `pin-circle-lg`, `pin-circle-md`, `pin-circle-sm`, `prop-name-row`, `record-stats`, `report-covers`, `report-covers-label`, `report-covers-list`, `report-meta`, `report-tag`, `request-card`, `request-desc`, `request-grid`, `request-icon-wrap`, `request-title`, `section--alt-compact`, `section--dark`, `section-lead--wide-flush`, `section-lead--wide-mb24`, `service-bullets--2col`, `service-card--cta`, `service-card--cta-mt36`, `services-grid--mt28`, `services-grid--mt36`, `sidebar-card--cta`, `sidebar-jump-arrow`, `sidebar-jump-list`, `sidebar-jump-name`, `sidebar-jump-num`, `state-count`, `subscribe-block`, `subscribe-form`, `subscribe-note`, `subscribe-report-item`, `subscribe-reports-list`, `trust-item`, `wyoming-banner`

Notable clusters:
- **Homepage hero team panel** (`hero-right`, `hero-team-panel*`, `hero-partner-*`, `hero-trust*`, `trust-item`) — `index.html`'s hero now only renders `.hero-left`; the entire "Team panel" / "Trusted by" right-column markup was removed from the page but its ~180 lines of CSS remain (lines 1108–1258, 1694–1763).
- **Resources page old layout** (`report-covers*`, `report-meta`, `report-tag`, `request-grid`, `request-card*`, `subscribe-*`) — `resources.html` now uses a simpler `.report-card` + inline `.request-link`; the older grid/subscribe-block variant (~230 lines) is dead.
- **Old SVG map** (`deal-pin`, `pin-circle-*`, `deal-spinner`, `deal-loading`, `map-placeholder`, `map-svg-container`, `record-stats`) — superseded by the live map in `track-record.html`.
- **Team/Colliers/Wyoming banners** (`colliers-bar`, `wyoming-banner`) — fully orphaned, not referenced on `team.html` or `markets/index.html` where they'd logically belong.
- **Sidebar jump nav** (`jump-nav-row`, `jump-nav-label`, `sidebar-jump-*`) — documented in the CSS comment block (line 704) as part of the content-hub page pattern, but never actually applied to `affordable.html`/`distressed.html`.
- **Section/spacing modifiers** (`section--dark`, `section--alt-compact`, `section-lead--wide-*`, `services-grid--mt*`, `service-card--cta*`, `sidebar-card--cta`) — one-off spacing variants that were authored but never wired into a page, or were replaced by inline modifier classes since removed.

### Check 5 — Hardcoded colors vs. variables

| Location | Issue | Fix |
|---|---|---|
| `style.css:770`, `:779` | `color: #b85555` hardcoded (2×) | Use `var(--color-distressed)` — already defined at line 28 with this exact value. |
| `style.css:724`, `:2593` | `var(--gold-light, #d4af5a)` — fallback hex doesn't match the real `--gold-light: #e2c97e` | Fix the fallback to `#e2c97e` (or drop the fallback since `--gold-light` is always defined). |
| `:root` (line 21) | `--white: #ffffff` defined but never consumed — `#fff` (23×) and `#ffffff` (1×) are used as literals throughout instead | Either replace literal `#fff`/`#ffffff` with `var(--white)` site-wide, or remove the unused variable. Low priority (no visual bug), but the variable is currently dead weight. |

### Check 6 — Dead/hidden classes

`.map-placeholder { display: none; }` (line 2749) and the SVG-pin classes (`.deal-pin`, `.pin-circle-lg/md/sm`, `.map-svg-container`) have no markup referencing them anywhere in `site/`. `track-record.html` renders its map into `#dealMap` (a live map container, see `.deal-map-container`), so this is confirmed dead code from a prior SVG-based map implementation, not a JS-toggled state.

### Check 9 — Magic numbers that should be variables

- `1320px` is hardcoded at lines 1098, 1626, 1730 even though `--max-width: 1320px` exists and is correctly used elsewhere (`.nav-inner`, `.section-inner`, `.stats-strip-inner`, etc.). Inconsistent — these three should use `var(--max-width)`.
- `rgba(201,168,76,0.03)` (the "gold hover tint" background) is repeated 9× across `.exp-card:hover`, `.deal-row:hover`, `.team-card:hover`, `.property-card:hover`, `.broker-contact-card:hover`, `.service-card:hover`, `.why-card:hover`, `.deal-table tbody tr:hover`, `.market-card:hover`. Worth extracting to a `--gold-hover-bg` variable for consistency and easier retheming.

---

## Priority-Ordered Fix List

**P1 — Correctness / bloat**
1. Resolve the `.page-hero--inner` duplicate (line 193 vs 887) — the `min-height: 650px` declaration is dead and misleading; merge into a single rule.
2. Resolve the `.team-photo` duplicate (line 563 vs 1515) — two unrelated components share one class name with conflicting rules; rename one.
3. Delete the ~76 unused classes (see full list above), starting with the largest dead blocks: homepage hero team panel (~150 lines), resources page old report grid/subscribe block (~230 lines), and the SVG-map remnants. This is roughly 400–450 lines of dead CSS (~15% of the file).
4. Replace hardcoded `#b85555` with `var(--color-distressed)` (2 instances) — currently only a maintenance risk, but if the palette color is ever adjusted, these two spots will silently drift out of sync.
5. Fix the mismatched `var(--gold-light, #d4af5a)` fallback (2 instances) to `#e2c97e` so the fallback path (if it ever triggers) doesn't render the wrong gold.

**P2 — Maintainability**
6. Merge the `.sidebar-stat-label` duplicate (line 790 + 796) into one rule block.
7. Replace the 3 hardcoded `1320px` instances with `var(--max-width)`.
8. Extract the repeated `rgba(201,168,76,0.03)` hover tint (9 occurrences) into a `--gold-hover-bg` variable.

**P3 — Minor cleanup**
9. Either wire up `var(--white)` in place of the 23 literal `#fff`/`#ffffff` instances, or remove the unused `--white` variable.
10. Decide whether the documented-but-unused sidebar-jump-nav pattern (`jump-nav-row`, `sidebar-jump-*`) should be applied to `affordable.html`/`distressed.html` per its original design intent, or removed along with the rest of the dead code in item 3.

**No action needed**
- Redundant `font-family: 'Inter'` declarations (Check 7) — previously reviewed and intentionally left in place (80+ instances, zero visual impact, not worth the review risk).
