# Sales History: One Source of Truth

**Status:** Drafted 09/02/2026, not yet built. Work happens primarily in `db-tools` (sibling repo), with a data-consumption change in this repo (`COmultifamily/site`).

## Background: why this is needed

We currently have **two independent pipelines** producing similar-looking sales history data, from different sources, that have drifted apart:

| | `site/data/market-data.json` (public) | `dashboard-data/sales-by-year/data.json` (private) |
|---|---|---|
| Consumers | Public market pages (Denver, Fort Collins, Colorado Springs sidebar tables); intended for the new Affordable page sidebar | Password-gated Sales by Year dashboard |
| Generator script | `COmultifamily/scripts/build-market-data.py` | `db-tools/scripts/build_sales_history.py` |
| Source data | A hand-exported CSV snapshot sitting in a **different project**: `C:\Users\wmm4\Documents\email-generator\data\Sales (1).csv` | Live SQL query against `T:MarketMovement` / `T:Properties` in the Access back-end |
| Freshness | Only as fresh as whenever someone remembers to re-export that CSV and manually re-run the script | Always current as of the last db-tools regen |
| Market taxonomy | Its own 7-MSA scheme (Denver, Boulder, Colorado Springs, Fort Collins, Greeley, Western Slope, Mountain Towns) — no Pueblo, no Wyoming, no Rural/Tertiary | The canonical 10-market taxonomy in `market_utils.py`, confirmed with Bill 2026-07-28, used by every other dashboard |
| Affordable/distressed segmentation | Only a static, whole-period `property_type_mix` percentage — no by-year breakdown | Full `affordableDeals` / `affordableVolume` / `affordableUnitsTotal` and `distressedDeals` / `distressedVolume` tallies, by year + month + region + vintage |

This surfaced concretely while redesigning `affordable.html`'s sidebar: we wanted to replace the "Navigate to Section" card with a Denver-style "historic sales by year" table, scoped to affordable housing. The public `market-data.json` has no way to answer that question — there's no per-year affordable segmentation in it at all. The data that *can* answer it already exists, computed correctly, inside the private dashboard pipeline — it just never makes it out to the public site.

Beyond this one page, the deeper problem is standardization: the public site and the internal dashboards are supposed to be reporting on the same underlying business, but they're built from two different, independently-maintained snapshots. They will keep drifting (different market boundaries, different freshness, different segmentation) until they share one generator.

## The plan

1. **Add a public export step to `db-tools/scripts/build_sales_history.py`.**
   The script already aggregates raw sales into `buckets` keyed by `(year, month, region, vintage)`, with deals/volume/units plus additive affordable and distressed tallies. Add a second rollup pass that drops `month` and `vintage`, grouping to **`(year, region)`** only, and write that to `site/data/market-data.json`. Same source query, same run, two outputs: the dashboard keeps its full month/vintage granularity (private), the public file gets the coarser slice (public-safe — no address- or deal-level detail, matching the privacy posture `market-data.json` already has).

2. **Adopt the canonical 10-market taxonomy in the public file.**
   Switch `market-data.json` from its bespoke 7-MSA scheme to `market_utils.MARKET_ORDER` (`Wyoming`, `Fort Collins`, `Greeley`, `Boulder`, `Denver Metro`, `Colorado Springs`, `Pueblo`, `Western Slope`, `Mountain Towns`, `Rural/Tertiary CO`). This also fixes a real gap: Pueblo and Wyoming market pages currently have no sidebar sales-history table because the old taxonomy doesn't cover them.

3. **Add a `"Statewide"` rollup key.**
   Alongside the per-market breakdowns, include one aggregate across all regions. This is what powers a page like `affordable.html` or `distressed.html`, which isn't tied to a single metro — the sidebar table becomes "Colorado + Wyoming affordable sales by year," sourced from the same file as every market page's table.

4. **New public JSON shape** (illustrative):
   ```json
   {
     "generated": "2026-09-02",
     "year_range": "2011–2025",
     "markets": {
       "Denver Metro": {
         "by_year": {
           "2025": {
             "count": 126, "volume": 3700000000, "median_ppu": 272000,
             "affordableDeals": 6, "affordableVolume": 45000000, "affordableUnitsTotal": 620,
             "distressedDeals": 0, "distressedVolume": 0
           }
         }
       },
       "Statewide": { "by_year": { "...": "..." } }
     }
   }
   ```

5. **Script the sidebar table generation.**
   Today, each market page's `<table class="sidebar-mkt-table">` is hand-pasted HTML, generated once from a query result and never touched again. Write a small generator (in either repo) that reads `market-data.json` and emits that markup per page, so a regen actually updates the live pages instead of requiring a manual copy-paste each time.

6. **One regen command.**
   Running `py scripts/build_sales_history.py` from db-tools becomes the single command that refreshes the private dashboard, the public `market-data.json`, and (via step 5) the static sidebar tables on every market page plus affordable/distressed — matching the existing "Regen: Sales History + Affordable Housing + all N markets" commit pattern already in use, just without the separate manual CSV step.

7. **Retire the old pipeline.**
   Delete `COmultifamily/scripts/build-market-data.py` once the new export is verified equivalent — diff the old vs. new `market-data.json` for the markets both cover, to catch any taxonomy-mapping surprises (e.g. a city that moves from "Denver Metro" to "Rural/Tertiary CO" under the new scheme) before cutover.

8. **Document it.**
   Once built, record in project memory: sales history has one source of truth (`db-tools/build_sales_history.py`), with a public export (`site/data/market-data.json`) and a private export (`dashboard-data/sales-by-year/data.json`) from the same query — so this doesn't quietly split apart again.

## Consumer audit (completed 09/02/2026)

Full trace of everything touching `build-market-data.py`, its CSV, and its JSON output.

**Consumers of the CSV (`Sales (1).csv`)** — it isn't a site-specific file; it belongs to a third project:

| Consumer | Repo | What it does with it |
|---|---|---|
| `src/db_refresh.py` | email-generator | **Writes** the file — pulls straight from the Access DB and regenerates `Sales (1).csv` (and a contacts CSV) as a periodic refresh step |
| `src/main.py` | email-generator | **Reads** it as `sales_file` to build the monthly outreach email/report (its actual primary purpose) |
| `src/diagnose.py` | email-generator | Reads it for a diagnostic check |
| `scripts/build-market-data.py` | COmultifamily | Reads it opportunistically, purely because it's sitting there, to build `site/data/market-data.json` — no direct Access connection of its own |

So the CSV is email-generator's own working file, refreshed on whatever cadence email-generator needs; `build-market-data.py` is a side door into DB data riding on top of it.

**Consumers of `market-data.json` (the output)** — every real one is a human copy-paste step, not a live fetch:

| Consumer | Sourcing |
|---|---|
| `site/js/market-stats.js` | Fetches the file and would rebuild a sidebar card dynamically — but it is **dead code, not loaded on any HTML page**. Safe to delete outright regardless of what happens to the JSON's shape. |
| Denver / Fort Collins / Colorado Springs sidebar tables (`.sidebar-mkt-table`) | **Static, hand-pasted HTML.** Someone runs `build-market-data.py`, reads the JSON it prints, and manually copies numbers into each page. The JSON itself is never fetched by a live page. |
| `resources.html` market-intelligence table (`.mi-table`, 10 CO markets + 7 WY rows) | Also **static, hand-pasted HTML.** Numbers line up with the JSON's `transaction_count`, `dollar_per_unit.median`, `by_year["2024"]`, and pct-change fields, confirming it was generated from this same JSON and typed in — same workflow as the market pages, just a bigger table. |

**Why this matters for cutover:** because nothing live actually fetches `market-data.json`, switching its generator to `build_sales_history.py` changes **nothing at runtime for any published page** — it only changes what gets copied from next time someone regenerates. The only genuinely dynamic consumer (`market-stats.js`) is unreachable and can be deleted with zero risk. The real migration work is entirely on the "human copy-paste" side: re-pointing that manual workflow (and, per step 5 below, eventually scripting it away) at the new export instead of the old one.

## Open questions to resolve before building

- Decide where the sidebar-table generator script should live (db-tools, since it's closer to the data; or COmultifamily/scripts, since it edits site HTML directly).
- Confirm the exact "Statewide" definition — all 10 markets summed, or Colorado only with Wyoming broken out separately (affordable.html's stated business already spans "Colorado and Wyoming," so this should probably be one combined number, but worth confirming against how Bill wants it framed).
- `resources.html`'s MI table currently states "reflects closed sales through 2024" — decide whether the new pipeline should extend that to include 2025/2026 YTD once regenerated, or keep the stated cutoff intentional.
