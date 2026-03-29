(function initGetElement(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.getElement = function getElement(id) {
    return document.getElementById(id);
  };
}(window));
