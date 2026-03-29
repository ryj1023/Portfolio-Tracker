(function initFmtP(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.fmtP = function fmtP(n, sign) {
    return (sign && n > 0 ? '+' : '') + n.toFixed(2) + '%';
  };
}(window));
