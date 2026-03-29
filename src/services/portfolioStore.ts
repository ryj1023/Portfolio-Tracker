import { DEFAULT_HOLDINGS, DEFAULT_STATIC_ITEMS, DEFAULT_SUMMARY } from '../data/portfolioData';
import { parsePortfolioCsv } from '../utils/parsePortfolioCsv';
import { PortfolioSnapshot } from '../types';

function cloneSnapshot(snapshot: PortfolioSnapshot): PortfolioSnapshot {
  return {
    holdings: snapshot.holdings.map((holding) => ({ ...holding })),
    staticItems: snapshot.staticItems.map((item) => ({ ...item })),
    summaryData: { ...snapshot.summaryData }
  };
}

export class PortfolioStore {
  private snapshot: PortfolioSnapshot = {
    holdings: DEFAULT_HOLDINGS.map((holding) => ({ ...holding })),
    staticItems: DEFAULT_STATIC_ITEMS.map((item) => ({ ...item })),
    summaryData: { ...DEFAULT_SUMMARY }
  };

  getSnapshot(): PortfolioSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  importCsv(csv: string): PortfolioSnapshot {
    const parsed = parsePortfolioCsv(csv);
    this.snapshot = {
      holdings: parsed.holdings.length ? parsed.holdings : DEFAULT_HOLDINGS.map((holding) => ({ ...holding })),
      staticItems: parsed.staticItems.length ? parsed.staticItems : DEFAULT_STATIC_ITEMS.map((item) => ({ ...item })),
      summaryData: {
        ...DEFAULT_SUMMARY,
        ...parsed.summaryData
      }
    };

    return this.getSnapshot();
  }
}
