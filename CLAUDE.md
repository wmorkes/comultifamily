# Stack Morkes Group — comultifamily.com

## Project Overview

Static marketing website for **Stack Morkes Group**, a multifamily investment sales team at Colliers International, serving Colorado and Wyoming. Live at `https://www.comultifamily.com`.

**Purpose:** Lead generation and portfolio showcase. Primary audiences are apartment owners considering a sale and institutional investors seeking deals.

**Team:**
- Craig Stack — Senior VP, craig.stack@colliers.com, +1 720-833-4602
- Bill Morkes — Senior VP, bill.morkes@colliers.com, +1 303-283-4583
- Nate Moyer — Senior VP, nate.moyer@colliers.com, +1 303-283-4568

---

## Tech Stack

- **Vanilla HTML5 / CSS3 / JavaScript** — no framework, no build tool, no npm
- **Netlify** for hosting — publish directory is `site/`
- **Deployment:** push to `main` branch → Netlify auto-deploys
- **Netlify CLI** — installed globally (`netlify-cli` via npm). Use for deploy status and management. Do NOT introduce npm packages, build steps, or JS frameworks into the site itself.

---

## File Structure

```
site/                   ← Netlify publish root
├── index.html          ← Homepage
├── contact.html
├── listings.html       ← Active deals + recent closings
├── services.html
├── team.html
├── resources.html
├── track-record.html
├── css/
│   └── style.css       ← Single shared stylesheet
├── js/
│   ├── shared.js       ← Nav, footer, shared UI
│   └── deal-map.js
├── markets/            ← One page per regional market (15 pages)
│   ├── denver.html
│   ├── boulder.html
│   └── ...             ← See full list below
├── data/
│   └── deals-template.csv
└── images/             ← See Image Conventions below
```

**Market pages:** denver, boulder, fort-collins, colorado-springs, greeley, western-slope, mountain-towns, cheyenne, casper, gillette, jackson, laramie, rock-springs, sheridan

---

## Design System

**Colors (CSS variables in style.css):**
- `--navy: #0c1a2e` — primary dark background
- `--gold: #c9a84c` — accent/highlight color
- `--bg: #f2f3f5` — page background (light theme)
- `--bg-card: #ffffff` — card backgrounds
- `--text: #0c1a2e` — body text
- `--text-soft: #58637a` — secondary text

**Typography:** `Plus Jakarta Sans` (Google Fonts), 18px base, line-height 1.75

**Theme:** Light theme with navy/gold branding. Professional, institutional tone.

---

## SEO Conventions

Every page must have:
- `<title>` — format: `[Page Topic] | Stack Morkes Group | Colliers`
- `<meta name="description">` — 150–160 characters
- `<link rel="canonical" href="https://www.comultifamily.com/[path]/">`
- Open Graph tags: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`
- Twitter card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Schema.org JSON-LD block (see index.html for the `RealEstateAgent` + `Person` pattern)

Market pages should target local keywords: e.g., "Denver multifamily broker", "Boulder apartment investment sales"

---

## Image Conventions

Images live in `site/images/`. The site references them by exact filename — no code change needed when swapping images.

| File | Purpose | Ideal Size |
|---|---|---|
| `team-craig.jpg` | Craig Stack headshot | 400×500px |
| `team-bill.jpg` | Bill Morkes headshot | 400×500px |
| `team-nate.jpg` | Nate Moyer headshot | 400×500px |
| `hero-bg.jpg` | Homepage hero background | 1920×1080px min |
| `og-share.jpg` | Social share image | 1200×630px |
| `colliers-logo.svg` | Colliers logo (white) | SVG preferred |

**Property photos:** `site/images/deals/[property-slug].jpg` — 800×500px, e.g., `columbine-village.jpg`

**Listing images:** `site/images/listings/` — for active listing cards

Compress photos before adding (squoosh.app). JPG for photos, SVG for logos.

---

## Live Data Sources (Google Sheets)

The site pulls live data from two tabs of a publicly published Google Sheet. Both are accessible as CSV without authentication.

**Sheet ID:** `1XodqdnLEKNVOUQvkOmyoklY_CNZM02UmNl2q6Ut2Uns`

| Tab | GID | Used by | Columns |
|-----|-----|---------|---------|
| Closed Deals | `0` | `deal-map.js` (track record map + table) | DATE, PROPERTY, ADDRESS, CITY, MSA, STATE, PROPERTY TYPE, UNITS, YOC, PRICE, Featured, Notes |
| Active Listings | `1516487704` | `listings.html` (property grid) | Status, Property, Type, Type 2, City, State, Price, Units, Year, Image, URL |

**Fetch URL pattern:**
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv&gid=[GID]
```

The Google Sheets export redirects (307) to a `googleusercontent.com` URL — follow the redirect to get the CSV content.

**Featured column** (Closed Deals tab): numeric value controls homepage featured deal order (1 = first). Blank = not featured.

**Property type colors** used across market pages and track record map:
- Market-Rate: `#c9a84c` (gold)
- Affordable: `#7eb8c9` (teal)
- Student: `#b87ec9` (purple)
- Land: `#7ec994` (green)

---

## Common Tasks

### Adding a new listing
Edit `site/listings.html`. Add a card in the appropriate section (Active Listings or Recent Closings). Follow the existing card HTML pattern.

### Updating a market page
Each market has its own file under `site/markets/`. They share `css/style.css` and `js/shared.js`.

### Updating team info or transaction volume
- `site/index.html` — homepage stats and schema.org JSON-LD
- `site/team.html` — bios and contact info
- Also update schema.org `Person` entries if contact info changes

### Deploying
Push to `main` → Netlify deploys automatically. No build step needed.

Check deploy status anytime: `netlify status` or `netlify open`

### Creating a new market page
Use `/new-market-page` — it asks for city, state, slug, and keywords, then scaffolds the full file from the denver.html template with all SEO fields pre-filled and data TODOs marked.

### Planning content for a market page
Use `/content-brief [city]` — researches the market via web search and returns target keywords, recommended H2 structure, key stats to verify, and a competitor positioning angle.

### SEO QA before committing
- Single page: `/seo-check [file path]` — checks title, description, canonical, OG tags, JSON-LD, h1
- All pages: `/meta-audit` — scans every HTML file site-wide, returns a table of issues
- Schema only: `/schema-validate [file path]` — validates JSON-LD against the RealEstateAgent pattern

### Automated SEO checks
Two automations run without manual intervention:
1. **Write hook** — after any HTML file is written in `site/`, Claude automatically runs `/seo-check` on it
2. **Pre-commit hook** — `git commit` is blocked if any staged HTML file is missing title, description, canonical, OG tags, or JSON-LD

---

## What NOT to Do

- Do not add npm, webpack, Vite, React, or any framework
- Do not create separate CSS files per page — use `style.css`
- Do not use inline styles (use CSS variables and existing classes)
- Do not add external JS libraries unless absolutely necessary
- Do not remove or alter schema.org JSON-LD blocks without updating all relevant pages
- Do not change canonical URLs or the domain `comultifamily.com`
