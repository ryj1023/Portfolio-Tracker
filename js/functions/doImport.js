(function initDoImport(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.doImport = function doImport() {
    const errorElement = app.functions.getElement('merr');
    errorElement.style.display = 'none';
    const isPaste = app.functions.getElement('itA').classList.contains('on');
    const csv = isPaste ? app.functions.getElement('csvTxt').value.trim() : app.state.fileCsv;
    if (!csv) {
      errorElement.textContent = 'Please paste CSV text or upload a file first.';
      errorElement.style.display = 'block';
      return;
    }
    const parsed = app.functions.parseCSV(csv);
    if (!parsed.holdings.length && !parsed.staticItems.length) {
      errorElement.textContent = 'No valid holdings found. Check CSV format.';
      errorElement.style.display = 'block';
      return;
    }
    app.state.holdings = parsed.holdings;
    app.state.staticItems = app.functions.mergeStaticItems(app.data.DEFAULT_STATIC, parsed.staticItems);
    app.state.summaryData = Object.assign({}, app.data.DEFAULT_SUMMARY, parsed.summary);
    app.functions.getElement('modal').classList.remove('open');
    app.functions.renderAll();
    if (app.state.holdings.length) app.functions.refreshPrices();
    else app.functions.setStatus('ok', 'Imported static holdings');
  };
}(window));
