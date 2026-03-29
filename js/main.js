(function initMain(global) {
	const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
	global.doImport = app.functions.doImport;
	global.onFileChange = app.functions.onFileChange;
	global.refreshPrices = app.functions.refreshPrices;
	global.showTab = app.functions.showTab;
	global.switchImport = app.functions.switchImport;
	app.functions.initializeDropzone();
	app.functions.renderAll();
	app.functions.refreshPrices();
}(window));
