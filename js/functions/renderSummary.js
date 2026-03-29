(function initRenderSummary(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.renderSummary = function renderSummary() {
    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;
    app.state.holdings.forEach(function eachHolding(holding) {
      const value = app.functions.gv(holding);
      totalValue += value != null ? value : holding.cost;
      totalCost += holding.cost;
      const price = app.state.prices[holding.tk];
      if (price && price.change) dayChange += price.change * holding.sh;
    });
    app.state.staticItems.forEach(function eachStatic(item) {
      totalValue += item.value;
      totalCost += item.value;
    });
    const displayTotal = app.state.summaryData.netWorth != null ? app.state.summaryData.netWorth : totalValue;
    const gainLoss = totalValue - totalCost;
    const gainLossPct = totalCost ? (gainLoss / totalCost) * 100 : 0;
    const dayChangePct = totalValue ? (dayChange / totalValue) * 100 : 0;
    app.functions.getElement('sTotal').textContent = '$' + displayTotal.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const dayElement = app.functions.getElement('sDay');
    dayElement.textContent = (dayChange >= 0 ? '+' : '−') + '$' + Math.abs(dayChange).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' (' + app.functions.fmtP(dayChangePct, true) + ')';
    dayElement.className = 'v ' + (dayChange >= 0 ? 'pos' : 'neg');
    const gainElement = app.functions.getElement('sGL');
    gainElement.textContent = (gainLoss >= 0 ? '+' : '−') + '$' + Math.abs(gainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' (' + app.functions.fmtP(gainLossPct, true) + ')';
    gainElement.className = 'v ' + (gainLoss >= 0 ? 'pos' : 'neg');
    app.functions.getElement('sCnt').textContent = app.state.holdings.length;
    const sectorSet = {};
    app.state.holdings.forEach(function eachSector(holding) { sectorSet[holding.s] = 1; });
    app.state.staticItems.forEach(function eachStaticSector(item) { sectorSet[item.s] = 1; });
    app.functions.getElement('sSec').textContent = Object.keys(sectorSet).length;
  };
}(window));
