# CO Multifamily Advisors — Image Asset Guide

Drop your files into this folder structure. The site references them by exact filename.
No code changes needed — just replace the file and redeploy to Netlify.

## Required Images

### Team Headshots
Folder: /images/
- team-craig.jpg    — Craig Stack headshot (ideal: 400×500px, face centered, professional)
- team-bill.jpg     — Bill Morkes headshot (ideal: 400×500px)
- team-nate.jpg     — Nate Moyer headshot (ideal: 400×500px)

### Colliers Logo
Folder: /images/
- colliers-logo.svg — Colliers logo (white version preferred for dark backgrounds)
  Fallback: colliers-logo.png if SVG not available

### Hero Background
Folder: /images/
- hero-bg.jpg       — Aerial or exterior multifamily photo for homepage hero
                      Ideal: 1920×1080px minimum, dark enough for white text overlay
                      (Denver skyline, aerial apartment complex, mountain backdrop, etc.)

### Open Graph / Social Share
Folder: /images/
- og-share.jpg      — Image shown when links are shared on LinkedIn, etc.
                      Ideal: 1200×630px, branded with logo and tagline

## Optional — Property Photos
Folder: /images/deals/
Filename format: [property-slug].jpg (lowercase, hyphens for spaces)

Examples:
- columbine-village.jpg
- fox-meadows.jpg
- elevate-apartments.jpg
- palmer-park.jpg
- prairie-wind-flats.jpg
- willowbrook.jpg
- platte-river-commons.jpg
- rino-flats.jpg

Ideal size: 800×500px (16:9 ratio)
These appear on the Active Listings / Recent Closings page cards.

## Tips
- JPG is fine for photos; PNG for logos with transparency; SVG for vector logos
- Compress photos before uploading (use squoosh.app — free, browser-based)
- Netlify automatically serves files from the /images/ folder once deployed
