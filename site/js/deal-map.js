/**
 * deal-map.js — CO Multifamily Advisors Transaction Map
 *
 * Reads deal data from the #deal-data JSON block embedded in the page.
 * No external fetch required. To add a deal, update the JSON block in
 * track-record.html and add the corresponding row to the static table.
 */

let mapInstance   = null;
let allDeals      = [];
let activeMarkers = [];
let activeFilter  = 'all';
let openInfoWindow = null;

// ─── Type config ──────────────────────────────────────────
const TYPE_CONFIG = {
  'market-rate': { color: '#c9a84c', label: 'Market-Rate' },
  'affordable':  { color: '#7eb8c9', label: 'Affordable'  },
  'student':     { color: '#b87ec9', label: 'Student'     },
  'land':        { color: '#7ec994', label: 'Land'        },
};

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
    <div style="font-family:'Inter',sans-serif;background:#ffffff;color:#08111f;padding:16px 18px;min-width:220px;max-width:280px;border-left:3px solid ${cfg.color};box-shadow:0 4px 16px rgba(0,0,0,0.12);">
      <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${cfg.color};margin-bottom:6px;">${cfg.label} · ${deal.state}</div>
      <div style="font-size:15px;font-weight:600;color:#08111f;margin-bottom:4px;line-height:1.3;">${deal.name}</div>
      <div style="font-size:12px;color:#7a8fa8;margin-bottom:12px;">${deal.city}, ${deal.state}</div>
      <div style="display:flex;gap:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
        <div>
          <div style="font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:${cfg.color};line-height:1;">${formatPrice(deal.price)}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Sale Price</div>
        </div>
        ${deal.units ? `<div>
          <div style="font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:#08111f;line-height:1;">${deal.type === 'land' ? deal.units + ' ac' : deal.units}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">${deal.type === 'land' ? 'Acres' : 'Units'}</div>
        </div>` : ''}
        ${deal.date ? `<div>
          <div style="font-family:'Inter',sans-serif;font-size:16px;font-weight:700;color:#08111f;line-height:1;">${deal.date}</div>
          <div style="font-size:10px;color:#9aa5b4;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Year</div>
        </div>` : ''}
      </div>
    </div>`;
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
}

// ─── Filter (called by buttons in HTML) ──────────────────
window.setMapFilter = function(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = filter;
  renderMarkers();
};

// ─── Main entry point (Google Maps callback) ─────────────
window.loadDeals = function() {
  const mapEl = document.getElementById('dealMap');
  if (!mapEl) return;

  const dataEl = document.getElementById('deal-data');
  if (!dataEl) { console.error('deal-data block not found in page'); return; }

  mapEl.innerHTML = '';
  initMap();

  allDeals = JSON.parse(dataEl.textContent);
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
      { featureType: 'road.highway',          elementType: 'geometry',     stylers: [{ color: '#d9d3c4' }] },
      { featureType: 'road.highway',          elementType: 'geometry.stroke', stylers: [{ color: '#bfb9ae' }] },
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
