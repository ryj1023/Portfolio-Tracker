(function initDropzone(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.initializeDropzone = function initializeDropzone() {
    const dropzone = app.functions.getElement('dz');
    if (!dropzone) return;
    dropzone.addEventListener('dragover', function onDragOver(event) {
      event.preventDefault();
      dropzone.style.borderColor = '#58a6ff';
    });
    dropzone.addEventListener('dragleave', function onDragLeave() {
      dropzone.style.borderColor = '#30363d';
    });
    dropzone.addEventListener('drop', function onDrop(event) {
      event.preventDefault();
      dropzone.style.borderColor = '#30363d';
      const file = event.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function handleLoad(loadEvent) {
        app.state.fileCsv = loadEvent.target.result;
        app.functions.getElement('dzLabel').textContent = '✓ ' + file.name;
      };
      reader.readAsText(file);
    });
  };
}(window));
