(function initMergeStaticItems(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.mergeStaticItems = function mergeStaticItems(base, imported) {
    const importedSectors = {};
    imported.forEach(function eachImported(item) {
      importedSectors[item.s] = 1;
    });
    const merged = base.filter(function filterBase(item) {
      return !importedSectors[item.s];
    }).map(function cloneBase(item) {
      return { s: item.s, name: item.name, value: item.value };
    });
    imported.forEach(function appendImported(item) {
      merged.push({ s: item.s, name: item.name, value: item.value });
    });
    return merged;
  };
}(window));
