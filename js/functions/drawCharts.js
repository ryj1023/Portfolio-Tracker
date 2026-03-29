(function initDrawCharts(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.drawCharts = function drawCharts() {
    const sections = [];
    const sectionValues = [];
    const sectionColors = [];
    const sectorMap = {};
    app.state.holdings.forEach(function eachHolding(holding) {
      if (!sectorMap[holding.s]) sectorMap[holding.s] = 0;
      sectorMap[holding.s] += app.functions.gv(holding) != null ? app.functions.gv(holding) : holding.cost;
    });
    app.state.staticItems.forEach(function eachStatic(item) {
      if (!sectorMap[item.s]) sectorMap[item.s] = 0;
      sectorMap[item.s] += item.value;
    });
    Object.keys(sectorMap).forEach(function eachSector(section) {
      sections.push(section);
      sectionValues.push(sectorMap[section]);
      sectionColors.push(app.data.COL[section] || '#8b949e');
    });
    app.functions.mkC('cPie', 'doughnut', sections, [{ data: sectionValues, backgroundColor: sectionColors, borderColor: '#0d1117', borderWidth: 2 }], { cutout: '58%', plugins: { legend: { position: 'right', labels: { color: '#8b949e', font: { size: 9 }, boxWidth: 10 } } } });
    const allHoldings = app.state.holdings.map(function mapHolding(holding) {
      return { t: holding.tk, v: app.functions.gv(holding) != null ? app.functions.gv(holding) : holding.cost, sec: holding.s };
    }).sort(function sortByValue(a, b) { return b.v - a.v; });
    const top = allHoldings.slice(0, 15);
    app.functions.mkC('cTop', 'bar', top.map(function label(row) { return row.t; }), [{ data: top.map(function value(row) { return row.v; }), backgroundColor: top.map(function color(row) { return (app.data.COL[row.sec] || '#8b949e') + 'bb'; }), borderRadius: 4 }], { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8b949e', font: { size: 8 } } }, y: { ticks: { color: '#8b949e', callback: function callback(value) { return '$' + Math.round(value / 1000) + 'k'; } } } } });
    const pbHoldings = app.state.holdings.filter(function filterHolding(holding) { return holding.pb != null; }).sort(function sortPb(a, b) { return a.pb - b.pb; });
    app.functions.mkC('cPB', 'bar', pbHoldings.map(function label(holding) { return holding.tk; }), [{ data: pbHoldings.map(function value(holding) { return holding.pb; }), backgroundColor: pbHoldings.map(function color(holding) { return holding.pb < 1 ? '#3fb950aa' : holding.pb < 2 ? '#e3b341aa' : '#f85149aa'; }), borderRadius: 3 }], { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8b949e', font: { size: 8 } } }, y: { ticks: { color: '#8b949e' } } } });
    const gainLossHoldings = app.state.holdings.map(function mapGainLoss(holding) {
      const value = app.functions.gv(holding);
      return { t: holding.tk, gl: value != null ? ((value - holding.cost) / holding.cost) * 100 : null };
    }).filter(function filterGainLoss(item) { return item.gl != null; }).sort(function sortGainLoss(a, b) { return b.gl - a.gl; });
    app.functions.mkC('cGL', 'bar', gainLossHoldings.map(function label(row) { return row.t; }), [{ data: gainLossHoldings.map(function value(row) { return row.gl; }), backgroundColor: gainLossHoldings.map(function color(row) { return row.gl >= 0 ? '#3fb95099' : '#f8514999'; }), borderRadius: 3 }], { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8b949e', font: { size: 8 } } }, y: { ticks: { color: '#8b949e', callback: function callback(value) { return value.toFixed(0) + '%'; } } } } });
  };
}(window));
