(function () {
  var card = document.querySelector('.sidebar-card[data-market-key]');
  if (!card) return;
  var key = card.dataset.marketKey;

  fetch('/data/market-data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var m = data.markets[key];
      if (!m) return;
      var d = m.dollar_per_unit;
      var fmt = function (n) { return n ? '$' + Math.round(n / 1000) + 'k' : 'N/A'; };
      card.innerHTML =
        '<h4>Transaction Data (2011–2025)</h4>' +
        '<div class="sidebar-stat"><span class="sidebar-stat-label">Closed Transactions</span><span class="sidebar-stat-val">' + m.transaction_count.toLocaleString() + '</span></div>' +
        '<div class="sidebar-stat"><span class="sidebar-stat-label">Median $/Unit</span><span class="sidebar-stat-val">' + fmt(d.median) + '</span></div>' +
        '<div class="sidebar-stat"><span class="sidebar-stat-label">Typical Range</span><span class="sidebar-stat-val">' + fmt(d.p25) + '–' + fmt(d.p75) + '</span></div>' +
        '<p class="sidebar-data-note">Market-wide sales data. <a href="/resources/">Full market trends →</a></p>';
    })
    .catch(function () {});
}());
