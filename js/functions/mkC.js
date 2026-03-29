(function initMkC(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.mkC = function mkC(id, type, labels, datasets, extra) {
    if (app.state.CI[id]) app.state.CI[id].destroy();
    app.state.CI[id] = new Chart(app.functions.getElement(id), {
      type: type,
      data: { labels: labels, datasets: datasets },
      options: Object.assign({ responsive: true, plugins: { legend: { labels: { color: '#8b949e', font: { size: 10 }, boxWidth: 11 } } } }, extra || {})
    });
  };
}(window));
