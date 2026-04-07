import { COMMODITY_RATIO_SYMBOLS, SECTION_COLORS } from '../data/portfolioData';
import {
  ClientState,
  CommodityLookbackOptionViewModel,
  CommodityRatiosViewModel,
  DashboardTab,
  DashboardViewModel,
  ExpenseData,
  HistoricalPriceMap,
  Holding,
  HoldingRowViewModel,
  PortfolioSnapshot,
  PriceMap,
  SectorViewModel,
  SectionViewModel
} from '../types';
import { buildExpenseViewModel } from './buildExpenseViewModel';

const COMMODITY_LOOKBACK_LABELS: Record<string, string> = {
  all: 'All time',
  '1y': '1 Year',
  '3y': '3 Years',
  '5y': '5 Years'
};

function formatCurrency(value: number, fractionDigits = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}

function formatNumber(value: number, fractionDigits = 4): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

function percentileRank(values: number[], currentValue: number): number | null {
  if (!values.length) {
    return null;
  }

  const belowOrEqualCount = values.filter((value) => value <= currentValue).length;
  return belowOrEqualCount / values.length;
}

function buildRatioSeries(leftTicker: string, rightTicker: string, history: HistoricalPriceMap): number[] {
  const leftHistory = history[leftTicker] ?? [];
  const rightHistory = history[rightTicker] ?? [];

  if (!leftHistory.length || !rightHistory.length) {
    return [];
  }

  const rightByDate = new Map(rightHistory.map((point) => [point.date, point.close]));

  return leftHistory
    .map((point) => {
      const rightClose = rightByDate.get(point.date);
      if (rightClose == null || rightClose <= 0 || point.close <= 0) {
        return null;
      }
      return point.close / rightClose;
    })
    .filter((ratio): ratio is number => ratio != null && Number.isFinite(ratio));
}

function formatShares(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function holdingMarketValue(holding: Holding, prices: PriceMap): number | null {
  const price = prices[holding.ticker]?.price;
  return price != null ? price * holding.shares : null;
}

function buildHoldingRow(holding: Holding, prices: PriceMap): HoldingRowViewModel {
  const price = prices[holding.ticker];
  const marketValue = holdingMarketValue(holding, prices);
  const priceToBook = price?.priceToBook ?? null;
  const dividendYield = price?.dividendYield ?? null;
  const pbClass = priceToBook == null ? null : priceToBook < 1 ? 'pos' : priceToBook >= 3 ? 'neg' : 'neu';
  const dividendYieldClass = dividendYield == null ? null : 'pos';

  return {
    ticker: holding.ticker,
    name: holding.name,
    note: holding.note,
    shares: formatShares(holding.shares),
    currentValue: formatCurrency(holding.currentValue),
    price: price?.price != null ? formatCurrency(price.price, 2) : '—',
    marketValue: marketValue != null ? formatCurrency(marketValue) : '—',
    pb: priceToBook != null ? priceToBook.toFixed(2) : '—',
    pbClass,
    dividendYield: dividendYield != null ? formatPercent(dividendYield, 2) : 'N/A',
    dividendYieldClass,
    isStatic: false
  };
}

function buildStaticRow(name: string, value: number): HoldingRowViewModel {
  return {
    ticker: null,
    name,
    note: 'Physical / vaulted holding — not price tracked',
    shares: '—',
    currentValue: formatCurrency(value),
    price: '—',
    marketValue: formatCurrency(value),
    pb: '—',
    pbClass: null,
    dividendYield: 'N/A',
    dividendYieldClass: null,
    isStatic: true
  };
}

function buildSections(snapshot: PortfolioSnapshot, prices: PriceMap): SectionViewModel[] {
  const orderedSections: string[] = [];

  snapshot.holdings.forEach((holding) => {
    if (!orderedSections.includes(holding.section)) {
      orderedSections.push(holding.section);
    }
  });

  snapshot.staticItems.forEach((item) => {
    if (!orderedSections.includes(item.section)) {
      orderedSections.push(item.section);
    }
  });

  return orderedSections.map((section) => {
    const sectionHoldings = snapshot.holdings.filter((holding) => holding.section === section);
    const sectionStaticItems = snapshot.staticItems.filter((item) => item.section === section);
    const totalValue = sectionHoldings.reduce((sum, holding) => sum + (holdingMarketValue(holding, prices) ?? holding.currentValue), 0)
      + sectionStaticItems.reduce((sum, item) => sum + item.value, 0);

    return {
      name: section,
      color: SECTION_COLORS[section] ?? '#94a3b8',
      totalValue: formatCurrency(totalValue),
      rows: [
        ...sectionHoldings.map((holding) => buildHoldingRow(holding, prices)),
        ...sectionStaticItems.map((item) => buildStaticRow(item.name, item.value))
      ]
    };
  });
}

function buildSectors(snapshot: PortfolioSnapshot, prices: PriceMap): SectorViewModel[] {
  const sectorMap = new Map<string, { value: number; holdings: number; hasTrackedHolding: boolean }>();

  snapshot.holdings.forEach((holding) => {
    const current = sectorMap.get(holding.section) ?? { value: 0, holdings: 0, hasTrackedHolding: false };
    current.value += holdingMarketValue(holding, prices) ?? holding.currentValue;
    current.holdings += 1;
    current.hasTrackedHolding = true;
    sectorMap.set(holding.section, current);
  });

  snapshot.staticItems.forEach((item) => {
    const current = sectorMap.get(item.section) ?? { value: 0, holdings: 0, hasTrackedHolding: false };
    current.value += item.value;
    current.holdings += 1;
    sectorMap.set(item.section, current);
  });

  const totalValue = [...sectorMap.values()].reduce((sum, sector) => sum + sector.value, 0);

  return [...sectorMap.entries()]
    .sort(([, left], [, right]) => right.value - left.value)
    .map(([name, sector]) => {
      const allocationPct = totalValue ? (sector.value / totalValue) * 100 : 0;

      return {
        name,
        color: SECTION_COLORS[name] ?? '#94a3b8',
        value: formatCurrency(sector.value),
        allocationPct: `${allocationPct.toFixed(1)}%`,
        holdings: sector.holdings,
        isStatic: !sector.hasTrackedHolding,
        allocationBarWidth: Math.min(allocationPct, 100)
      };
    });
}

function buildCommodityRatios(prices: PriceMap, history: HistoricalPriceMap, lookback: string): CommodityRatiosViewModel {
  const commodityPrices = COMMODITY_RATIO_SYMBOLS
    .map((commodity) => {
      const price = commodity.yahooTicker ? prices[commodity.yahooTicker]?.price ?? null : null;
      return {
        displayTicker: commodity.displayTicker,
        yahooTicker: commodity.yahooTicker ?? '—',
        name: commodity.name,
        currentPrice: price != null ? formatCurrency(price, 2) : 'N/A',
        currentPriceValue: price
      };
    })
    .sort((left, right) => {
      if (left.currentPriceValue == null && right.currentPriceValue == null) return left.displayTicker.localeCompare(right.displayTicker);
      if (left.currentPriceValue == null) return 1;
      if (right.currentPriceValue == null) return -1;
      return left.currentPriceValue - right.currentPriceValue;
    });

  const rankings = commodityPrices
    .map((commodity) => {
      const currentPriceValue = commodity.currentPriceValue;
      let cheaperThanCount = 0;
      let comparedAgainstCount = 0;

      if (currentPriceValue != null && commodity.yahooTicker !== '—') {
        commodityPrices.forEach((candidate) => {
          if (
            candidate.displayTicker === commodity.displayTicker
            || candidate.currentPriceValue == null
            || candidate.yahooTicker === '—'
          ) {
            return;
          }

          const currentRatio = candidate.currentPriceValue !== 0 ? currentPriceValue / candidate.currentPriceValue : null;
          const ratioHistory = buildRatioSeries(commodity.yahooTicker, candidate.yahooTicker, history);
          const percentile = currentRatio != null ? percentileRank(ratioHistory, currentRatio) : null;

          if (percentile == null) {
            return;
          }

          comparedAgainstCount += 1;
          if (percentile < 0.5) {
            cheaperThanCount += 1;
          }
        });
      }

      return {
        rank: 0,
        displayTicker: commodity.displayTicker,
        yahooTicker: commodity.yahooTicker,
        name: commodity.name,
        currentPrice: commodity.currentPrice,
        currentPriceValue,
        cheaperThanCount,
        comparedAgainstCount,
        comparisonSummary: comparedAgainstCount > 0 ? `${cheaperThanCount} of ${comparedAgainstCount}` : 'N/A'
      };
    })
    .sort((left, right) => {
      if (left.currentPriceValue == null && right.currentPriceValue == null) {
        return left.displayTicker.localeCompare(right.displayTicker);
      }
      if (left.currentPriceValue == null) return 1;
      if (right.currentPriceValue == null) return -1;
      if (right.cheaperThanCount !== left.cheaperThanCount) {
        return right.cheaperThanCount - left.cheaperThanCount;
      }
      if (right.comparedAgainstCount !== left.comparedAgainstCount) {
        return right.comparedAgainstCount - left.comparedAgainstCount;
      }
      if (left.currentPriceValue !== right.currentPriceValue) {
        return left.currentPriceValue - right.currentPriceValue;
      }
      return left.displayTicker.localeCompare(right.displayTicker);
    })
    .map((commodity, index) => ({
      ...commodity,
      rank: index + 1
    }));

  return {
    rankings,
    lookback,
    lookbackLabel: COMMODITY_LOOKBACK_LABELS[lookback] ?? COMMODITY_LOOKBACK_LABELS.all,
    lookbackOptions: Object.entries(COMMODITY_LOOKBACK_LABELS).map<CommodityLookbackOptionViewModel>(([value, label]) => ({
      value,
      label,
      selected: value === lookback
    }))
  };
}

export function buildClientState(snapshot: PortfolioSnapshot, prices: PriceMap, expenseData: ExpenseData | undefined, activeTab: DashboardTab): ClientState {
  return {
    holdings: snapshot.holdings,
    staticItems: snapshot.staticItems,
    summaryData: snapshot.summaryData,
    prices,
    colors: SECTION_COLORS,
    activeTab,
    expenses: expenseData
  };
}

export function buildDashboardViewModel(
  snapshot: PortfolioSnapshot,
  prices: PriceMap,
  commodityPrices: PriceMap,
  commodityHistory: HistoricalPriceMap,
  commodityLookback: string,
  activeTab: DashboardTab,
  expenseData?: ExpenseData
): DashboardViewModel {
  let totalValue = 0;
  let totalAnnualDividends = 0;
  const commodityRatios = buildCommodityRatios(commodityPrices, commodityHistory, commodityLookback);

  snapshot.holdings.forEach((holding) => {
    const value = holdingMarketValue(holding, prices) ?? holding.currentValue;
    totalValue += value;

    const dividendYield = prices[holding.ticker]?.dividendYield;
    if (dividendYield != null && dividendYield > 0) {
      totalAnnualDividends += value * (dividendYield / 100);
    }
  });

  snapshot.staticItems.forEach((item) => {
    totalValue += item.value;
  });

  const displayTotal = snapshot.summaryData.netWorth ?? totalValue;
  const clientState = buildClientState(snapshot, prices, expenseData, activeTab);
  const sectorCount = new Set([...snapshot.holdings.map((holding) => holding.section), ...snapshot.staticItems.map((item) => item.section)]).size;

  const expenses = expenseData ? buildExpenseViewModel(expenseData) : {
    categories: [],
    transactions: [],
    totalSpent: '$0.00',
    transactionCount: 0,
    dateRange: 'No transactions'
  };

  return {
    pageTitle: 'Portfolio Dashboard',
    activeTab,
    activeTabs: {
      holdings: activeTab === 'holdings',
      charts: activeTab === 'charts',
      sectors: activeTab === 'sectors',
      expenses: activeTab === 'expenses'
    },
    summary: {
      totalValue: formatCurrency(displayTotal),
      equities: snapshot.holdings.length,
      sectors: sectorCount,
      annualDividends: formatCurrency(totalAnnualDividends)
    },
    sections: buildSections(snapshot, prices),
    sectors: buildSectors(snapshot, prices),
    commodityRatios,
    expenses,
    initialStateJson: JSON.stringify(clientState).replace(/</g, '\u003c')
  };
}
