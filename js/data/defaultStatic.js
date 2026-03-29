(function initDefaultStatic(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.data.DEFAULT_STATIC = [
    { s: 'Precious Metals', name: 'Physical Gold (3.47 oz)', value: 15587 },
    { s: 'Precious Metals', name: 'Valuted Gold', value: 2241 },
    { s: 'Precious Metals', name: 'Physical Silver (183.94 oz)', value: 12837 },
    { s: 'Precious Metals', name: 'Valuted Silver', value: 897 },
    { s: 'Precious Metals', name: 'Physical Platinum (3.43 oz)', value: 6472 },
    { s: 'Other Stocks', name: 'ADP Balance', value: 24922 },
    { s: 'Crypto', name: 'All Crypto', value: 1739 },
    { s: 'Home Equity', name: 'Equity', value: 50000 },
    { s: 'Cash', name: 'Cash Reserves', value: 15000 }
  ];
}(window));
