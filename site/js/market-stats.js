(function () {
  var card = document.querySelector('.sidebar-card[data-market-key]');
  if (!card) return;
  var key = card.dataset.marketKey;

  fetch('/data/market-data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var m = data.markets[key];
      if (!m || !m.sidebar) return;
      var s = m.sidebar;
      var years = ['2019', '2020', '2021', '2022', '2023', '2024'];

      function fmtPpu(n) {
        return n ? '$' + Math.round(n / 1000) + 'k' : '—';
      }
      function fmtVol(n) {
        if (!n) return '—';
        if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
        var m = n / 1e6;
        return m >= 100 ? '$' + Math.round(m) + 'M' : '$' + m.toFixed(1) + 'M';
      }
      function fmtPct(n) {
        if (n === null || n === undefined) return '—';
        return (n >= 0 ? '+' : '') + Math.round(n) + '%';
      }

      var rows = years.map(function (yr) {
        var d = s.by_year[yr] || {};
        return '<tr>' +
          '<td>' + yr + '</td>' +
          '<td>' + (d.count != null ? d.count : '—') + '</td>' +
          '<td>' + fmtVol(d.total_volume) + '</td>' +
          '<td>' + fmtPpu(d.median_ppu) + '</td>' +
          '</tr>';
      }).join('');

      var lines = [];
      if (s.count_pct_change !== null) lines.push(fmtPct(s.count_pct_change) + ' sales 2024 vs. 2019');
      if (s.volume_pct_change !== null) lines.push(fmtPct(s.volume_pct_change) + ' volume 2024 vs. 2019');
      if (s.ppu_pct_change !== null) lines.push(fmtPct(s.ppu_pct_change) + ' avg $/unit 2024 vs. 2019');
      var summary = lines.join('<br>');

      card.innerHTML =
        '<h4>Market Data &middot; 2019&ndash;2024</h4>' +
        '<table class="sidebar-mkt-table">' +
          '<thead><tr>' +
            '<th>Year</th><th>Sales</th><th>Volume</th><th>Avg. $/Unit</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
        (summary ? '<div class="sidebar-block-summary">' + summary + '</div>' : '') +
        '<p class="sidebar-data-note">Market-wide sales data. <a href="/resources/">Full market trends &rarr;</a></p>';
    })
    .catch(function () {});
}());
