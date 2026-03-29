(function initShowTab(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.showTab = function showTab(id, element) {
    ['holdings', 'charts', 'sectors'].forEach(function eachTab(tabId) {
      app.functions.getElement('tab-' + tabId).style.display = tabId === id ? 'block' : 'none';
    });
    document.querySelectorAll('.tab').forEach(function eachNode(tab) { tab.classList.remove('on'); });
    element.classList.add('on');
    if (id === 'charts') {
      app.functions.drawCharts();
      app.state.chartsReady = true;
    }
  };
}(window));
