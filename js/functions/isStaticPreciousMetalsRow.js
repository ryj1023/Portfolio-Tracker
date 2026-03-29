(function initStaticPreciousMetals(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.isStaticPreciousMetalsRow = function isStaticPreciousMetalsRow(sector, name, ticker, shares, value) {
    if (sector !== 'Precious Metals' || !name || ticker.trim() || shares.trim() || !(value > 0)) return false;
    const lowerName = name.toLowerCase();
    return lowerName.indexOf('physical gold') >= 0
      || lowerName.indexOf('physical silver') >= 0
      || lowerName.indexOf('physical platinum') >= 0
      || lowerName.indexOf('valuted gold') >= 0
      || lowerName.indexOf('valuted silver') >= 0
      || lowerName.indexOf('vaulted gold') >= 0
      || lowerName.indexOf('vaulted silver') >= 0;
  };
}(window));
