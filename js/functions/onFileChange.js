(function initOnFileChange(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.onFileChange = function onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function handleLoad(loadEvent) {
      app.state.fileCsv = loadEvent.target.result;
      app.functions.getElement('dzLabel').textContent = '✓ ' + file.name;
    };
    reader.readAsText(file);
  };
}(window));
