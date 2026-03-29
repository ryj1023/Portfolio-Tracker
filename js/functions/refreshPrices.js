(function initRefreshPrices(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.refreshPrices = function refreshPrices() {
    if (!app.state.holdings.length) return;
    app.functions.setStatus('ld', 'Fetching live prices…');
    document.getElementById('rfIcon').className = 'spin';
    const tickers = [];
    app.state.holdings.forEach(function eachHolding(holding) {
      if (tickers.indexOf(holding.tk) < 0) tickers.push(holding.tk);
    });
    app.state.prices = {};
    const batches = [];
    const size = 15;
    for (let index = 0; index < tickers.length; index += size) batches.push(tickers.slice(index, index + size));
    let batchIndex = 0;
    function next() {
      if (batchIndex >= batches.length) {
        app.functions.renderAll();
        document.getElementById('rfIcon').className = '';
        app.functions.setStatus('ok', 'Updated ' + new Date().toLocaleTimeString());
        return;
      }
      app.functions.fetchBatch(batches[batchIndex]).then(function mergePrices(result) {
        Object.assign(app.state.prices, result);
        batchIndex += 1;
        next();
      }).catch(function continueOnFailure() {
        batchIndex += 1;
        next();
      });
    }
    next();
  };
}(window));
