(function initSectorMap(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.data.SMAP = {
    'oil and gas': 'Oil & Gas',
    'energy service': 'Energy Services',
    'oil tanker': 'Oil Tankers',
    'coal': 'Coal',
    'steel': 'Steel/Iron Ore',
    'dry bulk': 'Dry Bulk',
    'uranium': 'Uranium',
    'precious metal': 'Precious Metals',
    'pgm': 'PGM Miners',
    'gold and silver miners': 'Gold & Silver Miners and Royalty',
    'gold and silver royalty': 'Gold & Silver Miners and Royalty',
    'gold': 'Gold & Silver Miners and Royalty',
    'silver': 'Gold & Silver Miners and Royalty',
    'lithium': 'Lithium/Base Metals',
    'base metal': 'Lithium/Base Metals',
    'fertilizer': 'Fertilizers',
    'copper': 'Copper'
  };
}(window));
