(function initRenderHoldings(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.renderHoldings = function renderHoldings() {
    const secList = [];
    app.state.holdings.forEach(function eachHolding(holding) {
      if (secList.indexOf(holding.s) < 0) secList.push(holding.s);
    });
    let html = '';
    secList.forEach(function eachSection(section) {
      const items = app.state.holdings.filter(function filterHoldings(holding) { return holding.s === section; });
      const staticSectionItems = app.state.staticItems.filter(function filterStatic(item) { return item.s === section; });
      const sectionValue = items.reduce(function holdingsTotal(total, holding) {
        return total + (app.functions.gv(holding) != null ? app.functions.gv(holding) : holding.cost);
      }, 0) + staticSectionItems.reduce(function staticTotal(total, item) {
        return total + item.value;
      }, 0);
      const color = app.data.COL[section] || '#8b949e';
      let rows = '';
      items.forEach(function eachItem(holding) {
        const price = app.state.prices[holding.tk];
        const value = app.functions.gv(holding);
        const gainLoss = value != null ? value - holding.cost : null;
        const gainLossPct = gainLoss != null ? (gainLoss / holding.cost) * 100 : null;
        const dayChangePct = price && price.changePct != null ? price.changePct : null;
        const priceCell = price && price.price ? '$' + price.price.toFixed(2) : '<span class="mu">—</span>';
        const valueCell = value != null ? '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '<span class="mu">—</span>';
        let gainCell = '—';
        if (gainLossPct != null) {
          const cls = gainLoss >= 0 ? 'pos' : 'neg';
          const sign = gainLoss >= 0 ? '+' : '';
          gainCell = '<span class="glbadge ' + cls + '">' + sign + gainLossPct.toFixed(1) + '%</span>';
        }
        let dayCell = '—';
        if (dayChangePct != null) {
          dayCell = '<span class="' + (dayChangePct >= 0 ? 'pos' : 'neg') + '">' + (dayChangePct >= 0 ? '+' : '') + dayChangePct.toFixed(2) + '%</span>';
        }
        const pbCell = holding.pb != null
          ? '<span class="' + (holding.pb < 1 ? 'pos' : holding.pb >= 3 ? 'neg' : 'neu') + '">' + holding.pb.toFixed(2) + '</span>'
          : '<span class="mu">—</span>';
        const nameCell = holding.name + (holding.note ? '<br><span class="note">' + holding.note + '</span>' : '');
        rows += '<tr><td class="tk">' + holding.tk + '</td><td>' + nameCell + '</td><td>' + holding.sh.toLocaleString() + '</td><td>' + app.functions.fmtD(holding.cost) + '</td><td>' + priceCell + '</td><td>' + valueCell + '</td><td>' + gainCell + '</td><td>' + dayCell + '</td><td>' + pbCell + '</td></tr>';
      });
      staticSectionItems.forEach(function eachStatic(item) {
        const staticValue = '$' + item.value.toLocaleString('en-US', { maximumFractionDigits: 0 });
        rows += '<tr><td class="mu">—</td><td>' + item.name + '<br><span class="note">Physical / vaulted holding — not price tracked</span></td><td><span class="mu">—</span></td><td>' + staticValue + '</td><td><span class="mu">—</span></td><td>' + staticValue + '</td><td>—</td><td>—</td><td><span class="mu">—</span></td></tr>';
      });
      html += '<div class="sec">'
        + '<div class="sechdr"><span class="badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">' + section + '</span>'
        + '<span class="mu" style="font-size:.7rem">$' + sectionValue.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</span></div>'
        + '<table><thead><tr><th>Ticker</th><th>Name</th><th>Shares</th><th>Cost Basis</th><th>Price</th><th>Gain/Loss</th><th>Day Chg</th><th>P/B</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table></div>';
    });
    const staticSections = [];
    app.state.staticItems.forEach(function eachStatic(item) {
      if (secList.indexOf(item.s) < 0 && staticSections.indexOf(item.s) < 0) staticSections.push(item.s);
    });
    staticSections.forEach(function eachStaticSection(section) {
      const items = app.state.staticItems.filter(function filterSection(item) { return item.s === section; });
      const sectionValue = items.reduce(function total(total, item) { return total + item.value; }, 0);
      const color = app.data.COL[section] || '#8b949e';
      let rows = '';
      items.forEach(function eachItem(item) {
        rows += '<tr><td colspan="2">' + item.name + '</td><td colspan="2">$' + item.value.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</td><td colspan="5" class="mu" style="font-size:.7rem">Static — not price tracked</td></tr>';
      });
      html += '<div class="sec">'
        + '<div class="sechdr"><span class="badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">' + section + '</span>'
        + '<span class="mu" style="font-size:.7rem">$' + sectionValue.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '</span></div>'
        + '<table><thead><tr><th>Name</th><th></th><th>Value</th><th></th><th colspan="5"></th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table></div>';
    });
    app.functions.getElement('tab-holdings').innerHTML = html;
  };
}(window));
