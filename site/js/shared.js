/* shared.js — injects nav + footer + scroll reveal + SEO on every page */

/* ─── FONT PRELOAD (non-blocking) ───────────────────────── */
(function() {
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap';
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
      "telephone": "+17208334602",
      "email": "craig.stack@colliers.com",
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
    { property: 'og:image',       content: 'https://www.comultifamily.com/images/og-share.jpg' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height',content: '630' },
    { name: 'twitter:card',       content: 'summary_large_image' },
    { name: 'twitter:title',      content: title },
    { name: 'twitter:description',content: desc },
    { name: 'twitter:image',      content: 'https://www.comultifamily.com/images/og-share.jpg' },
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
    <a href="/index.html" class="site-logo" style="flex-direction:row;align-items:center;gap:14px;">
      <img src="/images/Colliers_CMYK_one_color_logos-black.png" alt="Colliers" style="height:32px;width:auto;filter:invert(1);">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <span class="logo-main"><span style="font-weight:400;">CO Multifamily</span> <span style="font-weight:800;">Advisors</span></span>
        <span class="logo-sub" style="color:#c9a84c;">Colorado &amp; Wyoming Multifamily Brokerage</span>
      </div>
    </a>
    <nav class="site-nav" id="siteNav">
      <ul>
        <li><a href="/listings.html">Active Listings</a></li>
        <li><a href="/services.html">Services</a></li>
        <li><a href="/markets/index.html">Markets</a></li>
        <li><a href="/track-record.html">Track Record</a></li>
        <li><a href="/resources.html">Resources</a></li>
        <li><a href="/team.html">Our Team</a></li>
        <li><a href="/contact.html" class="nav-cta-btn">Contact Us</a></li>
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
        <a href="/index.html" class="site-logo" style="flex-direction:row;align-items:center;gap:14px;">
          <img src="/images/Colliers_CMYK_one_color_logos-black.png" alt="Colliers" style="height:32px;width:auto;filter:invert(1);">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span class="logo-main"><span style="font-weight:400;">CO Multifamily</span> <span style="font-weight:800;">Advisors</span></span>
            <span class="logo-sub" style="color:#c9a84c;margin-top:0;display:block;">Colorado &amp; Wyoming Multifamily Brokerage</span>
          </div>
        </a>
        <p style="margin-top:8px;">Colorado and Wyoming's dedicated multifamily investment sales team.<br><br>Colliers | Denver<br>4643 South Ulster Street, Suite 1000, Denver, CO 80237.</p>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Montserrat',sans-serif;font-weight:600;">Craig Stack</span>
            &nbsp;·&nbsp;<a href="tel:7208334602" style="color:rgba(255,255,255,0.4);">720.833.4602</a>
            &nbsp;·&nbsp;<a href="mailto:craig.stack@colliers.com" style="color:rgba(255,255,255,0.4);">craig.stack@colliers.com</a>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Montserrat',sans-serif;font-weight:600;">Bill Morkes</span>
            &nbsp;·&nbsp;<a href="tel:3032834583" style="color:rgba(255,255,255,0.4);">303.283.4583</a>
            &nbsp;·&nbsp;<a href="mailto:bill.morkes@colliers.com" style="color:rgba(255,255,255,0.4);">bill.morkes@colliers.com</a>
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.45);">
            <span style="color:rgba(255,255,255,0.6);font-family:'Montserrat',sans-serif;font-weight:600;">Nate Moyer</span>
            &nbsp;·&nbsp;<a href="tel:3032834568" style="color:rgba(255,255,255,0.4);">303.283.4568</a>
            &nbsp;·&nbsp;<a href="mailto:nate.moyer@colliers.com" style="color:rgba(255,255,255,0.4);">nate.moyer@colliers.com</a>
          </div>
        </div>
        <div style="margin-top:10px;">
          <a href="https://www.linkedin.com/company/27232414" target="_blank" style="display:inline-flex;align-items:center;gap:8px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);text-decoration:none;" onmouseover="this.style.color='#c9a84c'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            LinkedIn
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
          <li><a href="/listings.html">Active Listings</a></li>
          <li><a href="/services.html">Services</a></li>
          <li><a href="/markets/index.html">Markets</a></li>
          <li><a href="/track-record.html">Track Record</a></li>
          <li><a href="/resources.html">Resources</a></li>
          <li><a href="/team.html">Our Team</a></li>
          <li><a href="/contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Colorado</h4>
        <ul>
          <li><a href="/markets/denver.html">Denver</a></li>
          <li><a href="/markets/boulder.html">Boulder</a></li>
          <li><a href="/markets/fort-collins.html">Fort Collins</a></li>
          <li><a href="/markets/greeley.html">Greeley</a></li>
          <li><a href="/markets/colorado-springs.html">Colorado Springs</a></li>
          <li><a href="/markets/western-slope.html">Western Slope</a></li>
          <li><a href="/markets/mountain-towns.html">Mountain Towns</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Wyoming</h4>
        <ul>
          <li><a href="/markets/cheyenne.html">Cheyenne</a></li>
          <li><a href="/markets/laramie.html">Laramie</a></li>
          <li><a href="/markets/casper.html">Casper</a></li>
          <li><a href="/markets/rock-springs.html">Rock Springs</a></li>
          <li><a href="/markets/gillette.html">Gillette</a></li>
          <li><a href="/markets/sheridan.html">Sheridan</a></li>
          <li><a href="/markets/jackson.html">Jackson</a></li>
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
