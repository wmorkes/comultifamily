/* shared.js — injects nav + footer + scroll reveal + SEO on every page */

/* ─── KNOWN-CLIENT GA4 TAGGING (reads cookie set by token-gate.js) ──
   Once a dashboard visitor's token validates, rememberClientToken() in
   token-gate.js drops a 30-day co_client_token cookie. Here, on every page
   site-wide, if that cookie is present we tag it as a default event
   parameter AND a user property (the latter is what GA4 Audiences can be
   built from, for future remarketing) so later GA4 events (page_view, etc.)
   on non-dashboard pages are also attributed to that known client.
   Anonymous visitors (no cookie) are completely unaffected. */
(function() {
  const match = document.cookie.match(/(?:^|; )co_client_token=([^;]*)/);
  if (!match) return;
  const clientToken = decodeURIComponent(match[1]);
  if (typeof gtag === 'function') {
    gtag('set', { client_token: clientToken });
    gtag('set', 'user_properties', { client_token: clientToken });
  }
})();

/* ─── FIRST-PARTY TRACKING (replaces GA4, runs in parallel during validation) ─
   Loads track.js sitewide, same pattern as the font/nav injection below. */
(function() {
  if (document.querySelector('script[src="/js/track.js"]')) return;
  const s = document.createElement('script');
  s.src = '/js/track.js';
  document.head.appendChild(s);
})();

/* ─── FONT PRELOAD (non-blocking, skipped if already in <head>) ─ */
(function() {
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap';
  if (document.querySelector('link[href="' + FONT_URL + '"]')) return;
  const preconn1 = document.createElement('link');
  preconn1.rel = 'preconnect'; preconn1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconn1);
  const preconn2 = document.createElement('link');
  preconn2.rel = 'preconnect'; preconn2.href = 'https://fonts.gstatic.com'; preconn2.crossOrigin = 'anonymous';
  document.head.appendChild(preconn2);
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = FONT_URL;
  document.head.appendChild(link);
})();

/* ─── SCHEMA MARKUP (injected into <head>) ──────────────── */
const SCHEMA_ORG = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": "https://www.comultifamily.com/#organization",
      "name": "CO Multifamily Advisors",
      "alternateName": "CO Multifamily Advisors",
      "url": "https://www.comultifamily.com",
      "logo": "https://www.comultifamily.com/images/logo.png",
      "description": "Colorado and Wyoming's leading multifamily investment sales team. $3B+ in closed apartment transactions. Specializing in market-rate, affordable, student, and land sales.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "4643 South Ulster Street, Suite 1000",
        "addressLocality": "Denver",
        "addressRegion": "CO",
        "postalCode": "80237",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 39.6461,
        "longitude": -104.8997
      },
      "telephone": "+13033511371",
      "email": "bill.morkes@colliers.com",
      "areaServed": [
        { "@type": "State", "name": "Colorado" },
        { "@type": "State", "name": "Wyoming" }
      ],
      "memberOf": {
        "@type": "Organization",
        "name": "Colliers International",
        "url": "https://www.colliers.com"
      },
      "sameAs": [
        "https://www.linkedin.com/company/27232414",
        "https://www.colliers.com/en/countries/united-states/cities/denver/colorado-multifamily-advisors"
      ]
    },
    {
      "@type": "Person",
      "name": "Craig Stack",
      "jobTitle": "Senior Vice President",
      "worksFor": { "@id": "https://www.comultifamily.com/#organization" },
      "telephone": "+17208334602",
      "email": "craig.stack@colliers.com"
    },
    {
      "@type": "Person",
      "name": "Bill Morkes",
      "jobTitle": "Senior Vice President",
      "worksFor": { "@id": "https://www.comultifamily.com/#organization" },
      "telephone": "+13032834583",
      "email": "bill.morkes@colliers.com"
    },
    {
      "@type": "Person",
      "name": "Nate Moyer",
      "jobTitle": "Senior Vice President",
      "worksFor": { "@id": "https://www.comultifamily.com/#organization" },
      "telephone": "+13032834568",
      "email": "nate.moyer@colliers.com"
    }
  ]
};

function injectSchema() {
  if (document.querySelector('script[type="application/ld+json"]')) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(SCHEMA_ORG);
  document.head.appendChild(script);
}

/* ─── OPEN GRAPH TAGS ───────────────────────────────────── */
function injectOpenGraph() {
  const title = document.title;
  const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const url = window.location.href;

  const ogTags = [
    { property: 'og:type',        content: 'website' },
    { property: 'og:site_name',   content: 'CO Multifamily Advisors | Colliers' },
    { property: 'og:title',       content: title },
    { property: 'og:description', content: desc },
    { property: 'og:url',         content: url },
    { property: 'og:image',       content: 'https://www.comultifamily.com/images/og-share.webp' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height',content: '630' },
    { name: 'twitter:card',       content: 'summary_large_image' },
    { name: 'twitter:title',      content: title },
    { name: 'twitter:description',content: desc },
    { name: 'twitter:image',      content: 'https://www.comultifamily.com/images/og-share.webp' },
  ];

  ogTags.forEach(tag => {
    if (document.querySelector(`meta[property="${tag.property}"], meta[name="${tag.name}"]`)) return;
    const meta = document.createElement('meta');
    if (tag.property) meta.setAttribute('property', tag.property);
    if (tag.name) meta.setAttribute('name', tag.name);
    meta.setAttribute('content', tag.content);
    document.head.appendChild(meta);
  });
}

const NAV_HTML = `
<header class="site-header" id="siteHeader">
  <div class="nav-inner">
    <a href="/" class="site-logo">
      <img src="/images/Colliers-Logo-BW.webp" alt="Colliers" width="160" height="98" style="height:32px;width:auto;filter:invert(1);">
      <div class="site-logo-text">
        <span class="logo-main"><span style="font-weight:400;">CO Multifamily</span> <span style="font-weight:800;">Advisors</span></span>
        <span class="logo-sub">Colorado &amp; Wyoming Multifamily Brokerage</span>
      </div>
    </a>
    <nav class="site-nav" id="siteNav">
      <ul>
        <li><a href="/listings/">Active Listings</a></li>
        <li><a href="/services/">Services</a></li>
        <li><a href="/markets/">Markets</a></li>
        <li><a href="/track-record/">Track Record</a></li>
        <li><a href="/resources/">Resources</a></li>
        <li><a href="/team/">Our Team</a></li>
        <li><a href="/contact/" class="nav-cta-btn">Contact Us</a></li>
      </ul>
    </nav>
    <div class="nav-toggle" id="navToggle">
      <span></span><span></span><span></span>
    </div>
  </div>
</header>`;

const FOOTER_HTML = `
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="/" class="site-logo">
          <img src="/images/Colliers-Logo-BW.webp" alt="Colliers" width="160" height="98" style="height:32px;width:auto;filter:invert(1);">
          <div class="site-logo-text">
            <span class="logo-main"><span style="font-weight:400;">CO Multifamily</span> <span style="font-weight:800;">Advisors</span></span>
            <span class="logo-sub">Colorado &amp; Wyoming Multifamily Brokerage</span>
          </div>
        </a>
        <p style="margin-top:8px;">Colorado and Wyoming's dedicated multifamily investment sales team.<br><br>Colliers | Denver<br>4643 South Ulster Street, Suite 1000, Denver, CO 80237.</p>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;font-weight:600;">Craig Stack</span>
            &nbsp;·&nbsp;<a href="tel:7208334602" style="color:rgba(255,255,255,0.4);">720.833.4602</a>
            &nbsp;·&nbsp;<a href="mailto:craig.stack@colliers.com" style="color:rgba(255,255,255,0.4);">craig.stack@colliers.com</a>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;font-weight:600;">Bill Morkes</span>
            &nbsp;·&nbsp;<a href="tel:3032834583" style="color:rgba(255,255,255,0.4);">303.283.4583</a>
            &nbsp;·&nbsp;<a href="mailto:bill.morkes@colliers.com" style="color:rgba(255,255,255,0.4);">bill.morkes@colliers.com</a>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Inter',sans-serif;font-weight:600;">Nate Moyer</span>
            &nbsp;·&nbsp;<a href="tel:3032834568" style="color:rgba(255,255,255,0.4);">303.283.4568</a>
            &nbsp;·&nbsp;<a href="mailto:nate.moyer@colliers.com" style="color:rgba(255,255,255,0.4);">nate.moyer@colliers.com</a>
          </div>
        </div>
        <div style="margin-top:10px;">
          <a href="https://www.linkedin.com/company/27232414" target="_blank" style="display:inline-flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);text-decoration:none;" onmouseover="this.style.color='#c9a84c'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            LinkedIn
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
          <li><a href="/listings/">Active Listings</a></li>
          <li><a href="/services/">Services</a></li>
          <li><a href="/markets/">Markets</a></li>
          <li><a href="/track-record/">Track Record</a></li>
          <li><a href="/resources/">Resources</a></li>
          <li><a href="/team/">Our Team</a></li>
          <li><a href="/contact/">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Colorado</h4>
        <ul>
          <li><a href="/markets/denver/">Denver</a></li>
          <li><a href="/markets/boulder/">Boulder</a></li>
          <li><a href="/markets/fort-collins/">Fort Collins</a></li>
          <li><a href="/markets/greeley/">Greeley</a></li>
          <li><a href="/markets/colorado-springs/">Colorado Springs</a></li>
          <li><a href="/markets/western-slope/">Western Slope</a></li>
          <li><a href="/markets/mountain-towns/">Mountain Towns</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Wyoming</h4>
        <ul>
          <li><a href="/markets/cheyenne/">Cheyenne</a></li>
          <li><a href="/markets/laramie/">Laramie</a></li>
          <li><a href="/markets/casper/">Casper</a></li>
          <li><a href="/markets/rock-springs/">Rock Springs</a></li>
          <li><a href="/markets/gillette/">Gillette</a></li>
          <li><a href="/markets/sheridan/">Sheridan</a></li>
          <li><a href="/markets/jackson/">Jackson</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copy">&copy; 2026 Colliers | CO Multifamily Advisors. All rights reserved.</span>
    </div>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', () => {
  // SEO
  injectSchema();
  injectOpenGraph();

  // Inject nav
  const navEl = document.getElementById('site-header');
  if (navEl) navEl.outerHTML = NAV_HTML;
  else document.body.insertAdjacentHTML('afterbegin', NAV_HTML);

  // Inject footer
  const footerEl = document.getElementById('site-footer');
  if (footerEl) footerEl.outerHTML = FOOTER_HTML;
  else document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);

  // Scroll-shrink nav
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.site-nav a').forEach(a => {
    if (a.getAttribute('href') && path.includes(a.getAttribute('href').replace('/index.html','').replace('.html',''))) {
      if (a.getAttribute('href') !== '/index.html' || path === '/' || path.endsWith('index.html')) {
        a.classList.add('active');
      }
    }
  });

  // Mobile toggle
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('siteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
