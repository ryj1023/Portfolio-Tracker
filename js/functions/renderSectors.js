(function initRenderSectors(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.renderSectors = function renderSectors() {
    const sectorMap = {};
    let totalValue = 0;
    app.state.holdings.forEach(function eachHolding(holding) {
      if (!sectorMap[holding.s]) sectorMap[holding.s] = { v: 0, c: 0, cnt: 0, isStatic: false };
      const value = app.functions.gv(holding);
      sectorMap[holding.s].v += value != null ? value : holding.cost;
      sectorMap[holding.s].c += holding.cost;
      sectorMap[holding.s].cnt += 1;
    });
    app.state.staticItems.forEach(function eachStatic(item) {
      if (!sectorMap[item.s]) sectorMap[item.s] = { v: 0, c: 0, cnt: 0, isStatic: true };
      sectorMap[item.s].v += item.value;
      sectorMap[item.s].c += item.value;
      sectorMap[item.s].cnt += 1;
    });
    Object.keys(sectorMap).forEach(function eachKey(key) { totalValue += sectorMap[key].v; });
    const rows = Object.keys(sectorMap).sort(function sortSections(a, b) {
      return sectorMap[b].v - sectorMap[a].v;
    }).map(function buildRow(section) {
      const data = sectorMap[section];
      const pct = (data.v / totalValue) * 100;
      const gainLoss = data.v - data.c;
      const gainLossPct = data.c ? (gainLoss / data.c) * 100 : 0;
      const color = app.data.COL[section] || '#8b949e';
      const gainString = data.isStatic ? '<span class="mu">—</span>' : (gainLoss >= 0 ? '+' : '−') + '$' + Math.abs(gainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' (' + app.functions.fmtP(gainLossPct, true) + ')';
      return '<tr>'
        + '<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + ';margin-right:6px;vertical-align:middle"></span>' + section + (data.isStatic ? ' <span class="mu" style="font-size:.65rem">(static)</span>' : '') + '</td>'
        + '<td>$' + data.v.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</td>'
        + '<td><div class="pbw"><div class="pbbar" style="width:' + Math.min(pct, 100) + '%;background:' + color + '"></div></div>' + pct.toFixed(1) + '%</td>'
        + '<td>$' + data.c.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</td>'
        + '<td class="' + (gainLoss >= 0 ? 'pos' : 'neg') + '">' + gainString + '</td>'
        + '<td>' + data.cnt + '</td></tr>';
    }).join('');
    app.functions.getElement('tab-sectors').innerHTML = '<table><thead><tr><th>Sector</th><th>Value</th><th>Allocation</th><th>Cost Basis</th><th>Gain/Loss</th><th>Holdings</th></tr></thead><tbody>' + rows + '</tbody></table>';
  };
}(window));
