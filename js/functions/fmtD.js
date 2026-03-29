(function initFmtD(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.fmtD = function fmtD(n) {
    return '$' + Math.abs(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
}(window));
