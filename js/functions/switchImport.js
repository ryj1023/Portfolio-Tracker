(function initSwitchImport(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.switchImport = function switchImport(mode) {
    app.functions.getElement('iP').style.display = mode === 'paste' ? 'block' : 'none';
    app.functions.getElement('iF').style.display = mode === 'file' ? 'block' : 'none';
    app.functions.getElement('itA').className = 'itab' + (mode === 'paste' ? ' on' : '');
    app.functions.getElement('itB').className = 'itab' + (mode === 'file' ? ' on' : '');
  };
}(window));
