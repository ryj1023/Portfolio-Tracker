(function initGv(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.gv = function gv(holding) {
    const price = app.state.prices[holding.tk];
    return price && price.price ? price.price * holding.sh : null;
  };
}(window));
