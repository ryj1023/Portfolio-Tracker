(function initRenderAll(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.renderAll = function renderAll() {
    app.functions.renderSummary();
    app.functions.renderHoldings();
    app.functions.renderSectors();
    if (app.state.chartsReady) app.functions.drawCharts();
  };
}(window));
