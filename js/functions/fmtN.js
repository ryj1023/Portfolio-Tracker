(function initFmtN(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.fmtN = function fmtN(n) {
    return '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
}(window));
