/**
 * deal-map.js — CO Multifamily Advisors Transaction Map
 *
 * Reads from the CO Multifamily Advisors Google Sheet (published as CSV).
 * Geocodes addresses via Google Maps Geocoding API.
 * Caches geocoded coordinates in sessionStorage to avoid re-geocoding.
 *
 * Sheet columns used (your actual headers):
 *   PROPERTY, ADDRESS, CITY, MSA, STATE, PROPERTY TYPE,
 *   SALE CONDITIONS, UNITS, PRICE, $/UNIT, DATE, NOTES,
 *   LISTING BROKER, BUYER, SELLER
 */

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1XodqdnLEKNVOUQvkOmyoklY_CNZM02UmNl2q6Ut2Uns/export?format=csv&gid=0';
const GEOCODE_CACHE_KEY = 'smg_geo_v1';

// ─── State ────────────────────────────────────────────────
let mapInstance  = null;
let allDeals     = [];
let activeMarkers = [];
let activeFilter = 'all';
let openInfoWindow = null;
let geocoder     = null;

// ─── Type config ──────────────────────────────────────────
const TYPE_CONFIG = {
  'market-rate': { color: '#c9a84c', label: 'Market-Rate' },
  'affordable':  { color: '#7eb8c9', label: 'Affordable'  },
  'student':     { color: '#b87ec9', label: 'Student'     },
  'land':        { color: '#7ec994', label: 'Land'        },
};

function normalizeType(raw) {
  if (!raw) return 'market-rate';
  const s = raw.toLowerCase();
  if (s.includes('student'))                                                   return 'student';
  if (s.includes('land') || s.includes('site') || s.includes('develop') ||
      s.includes('ground'))                                                     return 'land';
  if (s.includes('afford') || s.includes('lihtc') || s.includes('section') ||
      s.includes('hap') || s.includes('tax credit') || s.includes('age') ||
      s.includes('senior') || s.includes('housing assistance'))                return 'affordable';
  return 'market-rate';
}

// ─── Price formatting ─────────────────────────────────────
function formatPrice(raw) {
  if (!raw || raw === '' || String(raw).trim() === '0') return 'Confidential';
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n === 0) return 'Confidential';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

// ─── Pin size ─────────────────────────────────────────────
function pinSize(priceRaw) {
  const n = parseFloat(String(priceRaw || '').replace(/[^0-9.]/g, '')) || 0;
  if (n >= 30000000) return 18;
  if (n >= 15000000) return 14;
  if (n >= 5000000)  return 11;
  return 9;
}

// ─── SVG pin icon ─────────────────────────────────────────
function makePinIcon(type, priceRaw) {
  const color = TYPE_CONFIG[type]?.color || '#c9a84c';
  const r = pinSize(priceRaw);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r*2+4}" height="${r*2+4}" viewBox="0 0 ${r*2+4} ${r*2+4}">
    <circle cx="${r+2}" cy="${r+2}" r="${r}" fill="${color}" opacity="0.88" stroke="rgba(8,17,31,0.6)" stroke-width="1.5"/>
    <circle cx="${r+2}" cy="${r+2}" r="${Math.max(3,r*0.38)}" fill="rgba(8,17,31,0.7)"/>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(r*2+4, r*2+4),
    anchor: new google.maps.Point(r+2, r+2),
  };
}

// ─── Info window ──────────────────────────────────────────
function buildInfoWindow(deal) {
  const cfg = TYPE_CONFIG[deal.type] || TYPE_CONFIG['market-rate'];
  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;background:#ffffff;color:#08111f;padding:16px 18px;min-width:220px;max-width:280px;border-left:3px solid ${cfg.color};box-shadow:0 4px 16px rgba(0,0,0,0.12);">
      <div style="font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${cfg.color};margin-bottom:6px;">${cfg.label} · ${deal.state}</div>
      <div style="font-size:15px;font-weight:600;color:#08111f;margin-bottom:4px;line-height:1.3;">${deal.name}</div>
      <div style="font-size:12px;color:#7a8fa8;margin-bottom:12px;">${deal.city}, ${deal.state}</div>
      <div style="display:flex;gap:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:${cfg.color};line-height:1;">${formatPrice(deal.price)}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Sale Price</div>
        </div>
        ${deal.units ? `<div>
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#08111f;line-height:1;">${deal.units}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Units</div>
        </div>` : ''}
        ${deal.date ? `<div>
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#08111f;line-height:1;">${deal.date}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Date</div>
        </div>` : ''}
      </div>
      ${deal.perUnit ? `<div style="font-size:11px;color:#7a8fa8;margin-top:8px;">${formatPrice(deal.perUnit)}/unit</div>` : ''}
      ${deal.saleCondition ? `<div style="font-size:11px;color:#7a8fa8;margin-top:4px;font-style:italic;">${deal.saleCondition}</div>` : ''}
    </div>`;
}

// ─── CSV parser ───────────────────────────────────────────
function parseCSVRow(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur);
  return cols.map(c => c.trim().replace(/^"|"$/g, ''));
}

const MAX_COLS = 13; // Only read columns A–M (index 0–12); N and beyond are ignored

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVRow(lines[0]).slice(0, MAX_COLS);
  return lines.slice(1).map(line => {
    const cols = parseCSVRow(line).slice(0, MAX_COLS);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cols[i] || '').trim());
    return obj;
  }).filter(row => Object.values(row).join('').trim().length > 0);
}

// ─── Map sheet row → deal ────────────────────────────────
function rowToDeal(row) {
  const g = (...keys) => { for (const k of keys) { if (row[k] != null && row[k] !== '') return row[k]; } return ''; };

  const name          = g('PROPERTY', 'Property', 'PROPERTY NAME');
  const address       = g('ADDRESS', 'Address');
  const city          = g('CITY', 'City', 'MSA', 'Msa');
  const state         = (g('STATE', 'State') || 'CO').trim().toUpperCase().slice(0, 2);
  const price         = g('PRICE', 'Price', 'SALE PRICE');
  const units         = g('UNITS', 'Units', '# UNITS');
  const typeRaw       = g('PROPERTY TYPE', 'Property Type', 'TYPE', 'ASSET TYPE');
  const date          = g('DATE', 'Date', 'CLOSE DATE', 'YEAR');
  const perUnit       = g('$/UNIT', '$ / UNIT', 'PER UNIT');
  const saleCondition = g('SALE CONDITIONS', 'Sale Conditions', 'NOTES', 'Notes');
  const seller        = g('SELLER', 'Seller');
  const buyer         = g('BUYER', 'Buyer');

  if (!name) return null;

  const geocodeQuery = [address, city, state].filter(Boolean).join(', ');

  return { name, address, city, state, price, units, type: normalizeType(typeRaw),
           date, perUnit, saleCondition, seller, buyer, geocodeQuery };
}

// ─── Geocode cache (sessionStorage) ──────────────────────
function loadCache() {
  try { return JSON.parse(sessionStorage.getItem(GEOCODE_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c) {
  try { sessionStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(c)); } catch {}
}

function geocodeDeal(deal, cache) {
  return new Promise(resolve => {
    const key = deal.geocodeQuery.toLowerCase();
    if (cache[key]) {
      deal.lat = cache[key].lat;
      deal.lng = cache[key].lng;
      return resolve(deal);
    }
    geocoder.geocode({ address: deal.geocodeQuery + ', USA' }, (res, status) => {
      if (status === 'OK' && res[0]) {
        deal.lat = res[0].geometry.location.lat();
        deal.lng = res[0].geometry.location.lng();
        cache[key] = { lat: deal.lat, lng: deal.lng };
        resolve(deal);
      } else {
        // Fallback to city + state only
        geocoder.geocode({ address: `${deal.city}, ${deal.state}, USA` }, (r2, s2) => {
          if (s2 === 'OK' && r2[0]) {
            deal.lat = r2[0].geometry.location.lat();
            deal.lng = r2[0].geometry.location.lng();
            cache[key] = { lat: deal.lat, lng: deal.lng };
          }
          resolve(deal);
        });
      }
    });
  });
}

async function geocodeAll(deals) {
  const cache = loadCache();
  const out = [];
  // Batches of 10 with 150ms gap to stay within QPS limits
  for (let i = 0; i < deals.length; i += 10) {
    const batch = await Promise.all(deals.slice(i, i + 10).map(d => geocodeDeal(d, cache)));
    out.push(...batch);
    if (i + 10 < deals.length) await new Promise(r => setTimeout(r, 150));
  }
  saveCache(cache);
  return out.filter(d => d.lat && d.lng);
}

// ─── Render markers ───────────────────────────────────────
function renderMarkers() {
  activeMarkers.forEach(m => m.setMap(null));
  activeMarkers = [];
  if (openInfoWindow) { openInfoWindow.close(); openInfoWindow = null; }

  const iw = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -8) });

  google.maps.event.addListener(iw, 'domready', () => {
    const el = document.querySelector('.gm-style-iw');
    if (el) { el.style.background = 'transparent'; el.style.padding = '0'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)'; }
    const d = document.querySelector('.gm-style-iw-d');
    if (d) { d.style.overflow = 'hidden'; d.style.padding = '0'; }
    const btn = document.querySelector('.gm-ui-hover-effect');
    if (btn) { btn.style.filter = 'invert(1)'; btn.style.opacity = '0.6'; }
  });

  const filtered = activeFilter === 'all' ? allDeals : allDeals.filter(d => d.type === activeFilter);

  filtered.forEach(deal => {
    if (!deal.lat || !deal.lng) return;
    const marker = new google.maps.Marker({
      position: { lat: deal.lat, lng: deal.lng },
      map: mapInstance,
      icon: makePinIcon(deal.type, deal.price),
      title: deal.name,
    });
    marker.addListener('click', () => {
      iw.setContent(buildInfoWindow(deal));
      iw.open(mapInstance, marker);
      openInfoWindow = iw;
    });
    activeMarkers.push(marker);
  });

  updateTable(filtered);
}

// ─── Update table ─────────────────────────────────────────
function updateTable(deals) {
  const tbody = document.getElementById('dealTableBody');
  if (!tbody) return;
  if (!deals.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:24px;font-style:italic;">No transactions in this category yet.</td></tr>';
    return;
  }
  tbody.innerHTML = deals.map(d => {
    const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG['market-rate'];
    return `<tr>
      <td class="td-name">${d.name}</td>
      <td>${d.city}${d.state ? ', ' + d.state : ''}</td>
      <td><span class="type-badge" style="color:${cfg.color};border-color:${cfg.color}44;">${cfg.label}</span></td>
      <td>${d.units || '—'}</td>
      <td class="td-price">${formatPrice(d.price)}</td>
      <td>${d.date || '—'}</td>
    </tr>`;
  }).join('');
  // Ensure the table is visible regardless of scroll-reveal timing
  const tbl = tbody.closest('table');
  if (tbl) tbl.classList.add('visible');
}

// ─── Filter (called by buttons in HTML) ──────────────────
window.setMapFilter = function(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = filter;
  renderMarkers();
};

// ─── Main entry point (Google Maps callback) ─────────────
window.loadDeals = async function() {
  const mapEl = document.getElementById('dealMap');
  if (!mapEl) return;

  geocoder = new google.maps.Geocoder();

  // Init map immediately so it appears while geocoding runs
  mapEl.innerHTML = '';
  initMap();

  const tbody = document.getElementById('dealTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:32px;font-style:italic;">Loading transactions from Google Sheets...</td></tr>';

  let rawDeals = [];

  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error('Sheet not publicly accessible — check Publish to web setting');
    const text = await res.text();
    const rows = parseCSV(text);
    rawDeals = rows.map(rowToDeal).filter(Boolean);
    console.log(`Loaded ${rawDeals.length} deals from Google Sheet`);
  } catch (err) {
    console.warn('Sheet load failed, using bundled data:', err.message);
    rawDeals = BUNDLED_DEALS;
  }

  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:32px;font-style:italic;">Geocoding addresses...</td></tr>';

  allDeals = await geocodeAll(rawDeals);
  console.log(`Geocoded ${allDeals.length} deals`);
  renderMarkers();
};

// ─── Init map ─────────────────────────────────────────────
window.initMap = function() {
  const mapEl = document.getElementById('dealMap');
  if (!mapEl) return;
  mapInstance = new google.maps.Map(mapEl, {
    center: { lat: 40.2, lng: -105.5 },
    zoom: 7,
    styles: [
      { elementType: 'geometry',                                           stylers: [{ color: '#f0f0ec' }] },
      { elementType: 'labels.text.fill',                                   stylers: [{ color: '#4a5568' }] },
      { elementType: 'labels.text.stroke',                                 stylers: [{ color: '#ffffff' }] },
      { featureType: 'administrative',        elementType: 'geometry',     stylers: [{ color: '#c8cdd4' }] },
      { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#08111f' }, { weight: 2 }] },
      { featureType: 'landscape',             elementType: 'geometry',     stylers: [{ color: '#e8e8e2' }] },
      { featureType: 'landscape.natural',     elementType: 'geometry',     stylers: [{ color: '#dde3d4' }] },
      { featureType: 'poi',                                                 stylers: [{ visibility: 'off' }] },
      { featureType: 'road',                  elementType: 'geometry',     stylers: [{ color: '#ffffff' }] },
      { featureType: 'road',                  elementType: 'geometry.stroke', stylers: [{ color: '#d8dde4' }] },
      { featureType: 'road.highway',          elementType: 'geometry',     stylers: [{ color: '#f5c842' }] },
      { featureType: 'road.highway',          elementType: 'geometry.stroke', stylers: [{ color: '#e0b030' }] },
      { featureType: 'transit',                                             stylers: [{ visibility: 'off' }] },
      { featureType: 'water',                 elementType: 'geometry',     stylers: [{ color: '#b8d4e8' }] },
      { featureType: 'water',                 elementType: 'labels.text.fill', stylers: [{ color: '#6a92b0' }] },
    ],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
  });
};

// ─── Bundled fallback data ────────────────────────────────
const BUNDLED_DEALS = [
  { name: 'Columbine Village Apartments', city: 'Arvada',           state: 'CO', lat: 39.8028, lng: -105.0875, price: '44750000', units: '232', type: 'affordable',  date: '2023' },
  { name: 'Fox Meadows Apartments',       city: 'Fort Collins',     state: 'CO', lat: 40.5853, lng: -105.0844, price: '36800000', units: '138', type: 'affordable',  date: '2023' },
  { name: 'Platte River Commons',         city: 'Denver',           state: 'CO', lat: 39.7515, lng: -104.9962, price: '28400000', units: '142', type: 'market-rate', date: '2023' },
  { name: 'Elevate Apartment Homes',      city: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214, price: '29000000', units: '192', type: 'market-rate', date: '2021' },
  { name: 'The Palmer Park',              city: 'Colorado Springs', state: 'CO', lat: 38.8714, lng: -104.7526, price: '26100000', units: '200', type: 'market-rate', date: '2021' },
  { name: 'Prairie Wind Flats',           city: 'Cheyenne',         state: 'WY', lat: 41.1400, lng: -104.8202, price: '11200000', units: '78',  type: 'market-rate', date: '2024' },
  { name: 'RS Apartments',               city: 'Rock Springs',     state: 'WY', lat: 41.5875, lng: -109.2029, price: '0',        units: '306', type: 'market-rate', date: '2022' },
  { name: 'Willowbrook Apartments',       city: 'Westminster',      state: 'CO', lat: 39.8367, lng: -105.0372, price: '16550000', units: '95',  type: 'market-rate', date: '2021' },
  { name: 'University Flats Phase I',    city: 'Greeley',          state: 'CO', lat: 40.4233, lng: -104.7091, price: '0',        units: '93',  type: 'student',     date: '2025' },
];
