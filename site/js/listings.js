const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1XodqdnLEKNVOUQvkOmyoklY_CNZM02UmNl2q6Ut2Uns/export?format=csv&gid=1516487704';

/* ── Fallback static data if sheet is unreachable ── */
const STATIC_LISTINGS = [
  { Status:'Active', Property:'Marquette Heights', Type:'Market-Rate', 'Type 2':'Value-Add', City:'Colorado Springs', State:'CO', Price:'', Units:'108', Year:'1971', Image:'', URL:'contact.html' },
  { Status:'Active', Property:'Fairway Valley',    Type:'Market-Rate', 'Type 2':'Value-Add', City:'Colorado Springs', State:'CO', Price:'', Units:'93',  Year:'1967', Image:'', URL:'contact.html' },
  { Status:'Active', Property:'The Centre',        Type:'Market-Rate', 'Type 2':'Value-Add', City:'Colorado Springs', State:'CO', Price:'', Units:'168', Year:'1952', Image:'', URL:'contact.html' },
];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || '').trim().replace(/^"|"$/g, ''));
    return obj;
  }).filter(row => Object.values(row).join('').trim());
}

function formatListingPrice(n) {
  if (!n) return 'TBD by Market';
  n = parseFloat(String(n).replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n === 0) return 'TBD by Market';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n.toLocaleString();
}

function buildListingCard(r) {
  const status = (r['Status'] || '').trim();
  if (!status) return null; // staged row — no Status yet, don't display
  const name     = r['Property'] || '';
  const type     = (r['Type'] || '').trim();
  const type2    = (r['Type 2'] || r['Type2'] || '').trim();
  const typeDisplay = type2
    ? `${type} <span class="listing-type-secondary">| ${type2}</span>`
    : type;
  const city     = r['City'] || '';
  const state    = (r['State'] || r['STATE'] || '').trim();
  const price    = formatListingPrice(r['Price']);
  const units    = r['Units'] || '—';
  const year     = r['Year'] || '—';
  const image    = r['Image'] || '';
  const rawUrl   = (r['URL'] || '').trim();
  const url      = rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('/') && rawUrl.includes('.')
                   ? 'https://' + rawUrl
                   : (rawUrl || 'contact.html');

  // Derive filter tag from Type column — no manual Filter column needed
  function typeToFilter(t) {
    const s = t.toLowerCase();
    if (s.includes('affordable')) return 'affordable';
    if (s.includes('student'))    return 'student';
    if (s.includes('land'))       return 'land';
    return 'market-rate';
  }
  const isWY      = /^(wy|wyoming)$/i.test(state);
  const filterBase = typeToFilter(type);
  const filter     = isWY ? filterBase + ' wyoming' : filterBase;
  const isActive = status.toLowerCase() === 'active';
  const statusClass = status.toLowerCase() === 'pending' ? 'status-pending'
                    : isActive ? 'status-active' : 'status-closed';
  const statusLabel = status;
  const priceLbl    = isActive ? 'Asking Price' : 'Sale Price';
  const yearLbl     = 'Year Built';
  const imgSrc      = image ? `/images/listings/${image}` : '';
  const btnLabel    = isActive ? 'View Listing →' : 'Request Info →';

  return `
    <div class="property-card reveal" data-type="${filter}">
      <a href="${url}" target="_blank" rel="noopener" class="listing-card-link" data-listing-property="${name}" data-listing-city="${city}${state ? ', ' + state : ''}" data-listing-type="${filterBase}">
        <div class="prop-image">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="${name}" onerror="this.classList.add('js-hidden');this.nextElementSibling.classList.remove('js-hidden');">
               <div class="prop-image-placeholder js-hidden">${name}</div>`
            : `<div class="prop-image-placeholder">${name}</div>`
          }
          <span class="prop-status ${statusClass}">${statusLabel}</span>
          <div class="prop-image-overlay">
            <span class="prop-overlay-btn">${btnLabel}</span>
          </div>
        </div>
        <div class="prop-body">
          <div class="prop-type prop-type--${filterBase}">${typeDisplay}</div>
          <div class="prop-name">${name}</div>
          <div class="prop-location">${city}${state ? ', ' + state : ''}</div>
          <div class="prop-details">
            <div class="prop-detail-item"><div class="prop-detail-val">${price}</div><div class="prop-detail-lbl">${priceLbl}</div></div>
            <div class="prop-detail-item"><div class="prop-detail-val">${units}</div><div class="prop-detail-lbl">${filterBase === 'land' ? 'Acres' : 'Units'}</div></div>
            <div class="prop-detail-item"><div class="prop-detail-val">${year}</div><div class="prop-detail-lbl">${yearLbl}</div></div>
          </div>
        </div>
      </a>
    </div>`;
}

function renderListings(cards) {
  const grid = document.getElementById('propertyGrid');
  if (!grid) return;
  grid.innerHTML = cards.length
    ? cards.join('')
    : `<div class="listings-status-msg">No listings to display at this time. Check back soon or <a href="/contact/" class="link-gold">contact us</a> for off-market opportunities.</div>`;
  // Re-run reveal on new cards
  if (window.revealObserver) {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => window.revealObserver.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }
  // Re-apply active filter
  const activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) filterProps(activeBtn, activeBtn.getAttribute('data-filter') || 'all');
}

// Track listing card clicks in GA4 (delegated — cards are re-rendered on filter/reload)
document.getElementById('propertyGrid').addEventListener('click', function (e) {
  const link = e.target.closest('.listing-card-link');
  if (!link) return;
  const detail = {
    listing_property: link.getAttribute('data-listing-property') || '',
    listing_city: link.getAttribute('data-listing-city') || '',
    listing_type: link.getAttribute('data-listing-type') || ''
  };
  if (typeof window.coTrack === 'function') window.coTrack('listing_view', detail);
  if (typeof gtag === 'function') gtag('event', 'listing_view', detail); // parallel-run window, remove once validated
});

// Show loading state
document.getElementById('propertyGrid').innerHTML =
  '<div class="listings-status-msg">Loading listings…</div>';

fetch(SHEET_URL)
  .then(r => { if (!r.ok) throw new Error('Sheet not accessible'); return r.text(); })
  .then(text => {
    const rows = parseCSV(text);
    const cards = rows.map(buildListingCard).filter(Boolean);
    console.log(`Loaded ${cards.length} listings from Google Sheet`);
    renderListings(cards);
  })
  .catch(err => {
    console.warn('Sheet fetch failed, using static data:', err.message);
    renderListings(STATIC_LISTINGS.map(buildListingCard).filter(Boolean));
  });

// Filter function
function filterProps(btn, type) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('data-filter', type);
  document.querySelectorAll('.property-card').forEach(card => {
    card.style.display = (type === 'all' || card.dataset.type.includes(type)) ? '' : 'none';
  });
}
