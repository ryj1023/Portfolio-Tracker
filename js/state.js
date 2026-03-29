(function initState(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.state = {
    holdings: app.data.HOLDINGS.slice(),
    staticItems: app.data.DEFAULT_STATIC.slice(),
    summaryData: Object.assign({}, app.data.DEFAULT_SUMMARY),
    prices: {},
    CI: {},
    chartsReady: false,
    fileCsv: ''
  };
}(window));
