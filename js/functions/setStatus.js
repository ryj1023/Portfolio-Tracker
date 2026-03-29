(function initSetStatus(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.setStatus = function setStatus(status, message) {
    app.functions.getElement('sMsg').textContent = message;
    app.functions.getElement('sDot').className = 'dot' + (status === 'ld' ? ' ld' : status === 'er' ? ' er' : '');
  };
}(window));
