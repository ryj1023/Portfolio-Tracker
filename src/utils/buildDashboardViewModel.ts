import { COMMODITY_RATIO_SYMBOLS, SECTION_COLORS } from '../data/portfolioData';
import {
  ClientState,
  CommodityRatiosViewModel,
  DashboardViewModel,
  Holding,
  HoldingRowViewModel,
  PortfolioSnapshot,
  PriceMap,
  SectorViewModel,
  SectionViewModel
} from '../types';

function formatCurrency(value: number, fractionDigits = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(value), 0)}`;
}

function formatSignedPercent(value: number, fractionDigits = 1): string {
  const sign = value >= 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}%`;
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

function formatShares(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function holdingValue(holding: Holding, prices: PriceMap): number | null {
  const price = prices[holding.ticker]?.price;
  return price != null ? price * holding.shares : null;
}

function buildHoldingRow(holding: Holding, prices: PriceMap): HoldingRowViewModel {
  const price = prices[holding.ticker];
  const marketValue = holdingValue(holding, prices);
  const gainLoss = marketValue != null ? marketValue - holding.cost : null;
  const gainLossPct = gainLoss != null && holding.cost ? (gainLoss / holding.cost) * 100 : null;
  const dayChangePct = price?.changePct ?? null;
  const priceToBook = price?.priceToBook ?? null;
  const dividendYield = price?.dividendYield ?? null;
  const pbClass = priceToBook == null ? null : priceToBook < 1 ? 'pos' : priceToBook >= 3 ? 'neg' : 'neu';
  const dividendYieldClass = dividendYield == null ? null : 'pos';

  return {
    ticker: holding.ticker,
    name: holding.name,
    note: holding.note,
    shares: formatShares(holding.shares),
    costBasis: formatCurrency(holding.cost),
    price: price?.price != null ? formatCurrency(price.price, 2) : '—',
    marketValue: marketValue != null ? formatCurrency(marketValue) : '—',
    gainLossBadge: gainLossPct != null ? formatSignedPercent(gainLossPct, 1) : null,
    gainLossClass: gainLossPct != null ? (gainLossPct >= 0 ? 'pos' : 'neg') : null,
    dayChange: dayChangePct != null ? formatSignedPercent(dayChangePct, 2) : '—',
    dayChangeClass: dayChangePct != null ? (dayChangePct >= 0 ? 'pos' : 'neg') : null,
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
    costBasis: formatCurrency(value),
    price: '—',
    marketValue: formatCurrency(value),
    gainLossBadge: null,
    gainLossClass: null,
    dayChange: '—',
    dayChangeClass: null,
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
    const totalValue = sectionHoldings.reduce((sum, holding) => sum + (holdingValue(holding, prices) ?? holding.cost), 0)
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
  const sectorMap = new Map<string, { value: number; cost: number; holdings: number; hasTrackedHolding: boolean }>();

  snapshot.holdings.forEach((holding) => {
    const current = sectorMap.get(holding.section) ?? { value: 0, cost: 0, holdings: 0, hasTrackedHolding: false };
    current.value += holdingValue(holding, prices) ?? holding.cost;
    current.cost += holding.cost;
    current.holdings += 1;
    current.hasTrackedHolding = true;
    sectorMap.set(holding.section, current);
  });

  snapshot.staticItems.forEach((item) => {
    const current = sectorMap.get(item.section) ?? { value: 0, cost: 0, holdings: 0, hasTrackedHolding: false };
    current.value += item.value;
    current.cost += item.value;
    current.holdings += 1;
    sectorMap.set(item.section, current);
  });

  const totalValue = [...sectorMap.values()].reduce((sum, sector) => sum + sector.value, 0);

  return [...sectorMap.entries()]
    .sort(([, left], [, right]) => right.value - left.value)
    .map(([name, sector]) => {
      const gainLoss = sector.value - sector.cost;
      const allocationPct = totalValue ? (sector.value / totalValue) * 100 : 0;
      const gainLossPct = sector.cost ? (gainLoss / sector.cost) * 100 : 0;
      const isStatic = !sector.hasTrackedHolding;

      return {
        name,
        color: SECTION_COLORS[name] ?? '#94a3b8',
        value: formatCurrency(sector.value),
        allocationPct: `${allocationPct.toFixed(1)}%`,
        costBasis: formatCurrency(sector.cost),
        gainLoss: isStatic ? '—' : `${formatSignedCurrency(gainLoss)} (${formatSignedPercent(gainLossPct, 1)})`,
        gainLossClass: isStatic ? 'muted' : gainLoss >= 0 ? 'pos' : 'neg',
        holdings: sector.holdings,
        isStatic,
        allocationBarWidth: Math.min(allocationPct, 100)
      };
    });
}

function buildCommodityRatios(prices: PriceMap): CommodityRatiosViewModel {
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

  const comparableCount = commodityPrices.filter((commodity) => commodity.currentPriceValue != null).length;
  const rankings = commodityPrices
    .map((commodity) => {
      const currentPriceValue = commodity.currentPriceValue;
      const cheaperThanCount = currentPriceValue == null
        ? 0
        : commodityPrices.filter((candidate) => candidate.currentPriceValue != null && candidate.displayTicker !== commodity.displayTicker && currentPriceValue < candidate.currentPriceValue).length;
      const comparedAgainstCount = currentPriceValue == null ? 0 : Math.max(comparableCount - 1, 0);

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
    rankings
  };
}

export function buildClientState(snapshot: PortfolioSnapshot, prices: PriceMap): ClientState {
  return {
    holdings: snapshot.holdings,
    staticItems: snapshot.staticItems,
    summaryData: snapshot.summaryData,
    prices,
    colors: SECTION_COLORS
  };
}

export function buildDashboardViewModel(snapshot: PortfolioSnapshot, prices: PriceMap, commodityPrices: PriceMap): DashboardViewModel {
  let totalValue = 0;
  let totalCost = 0;
  let dayChange = 0;
  const commodityRatios = buildCommodityRatios(commodityPrices);

  snapshot.holdings.forEach((holding) => {
    const value = holdingValue(holding, prices) ?? holding.cost;
    totalValue += value;
    totalCost += holding.cost;
    const quote = prices[holding.ticker];
    if (quote?.change != null) {
      dayChange += quote.change * holding.shares;
    }
  });

  snapshot.staticItems.forEach((item) => {
    totalValue += item.value;
    totalCost += item.value;
  });

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost ? (totalGainLoss / totalCost) * 100 : 0;
  const dayChangePct = totalValue ? (dayChange / totalValue) * 100 : 0;
  const displayTotal = snapshot.summaryData.netWorth ?? totalValue;
  const clientState = buildClientState(snapshot, prices);
  const sectorCount = new Set([...snapshot.holdings.map((holding) => holding.section), ...snapshot.staticItems.map((item) => item.section)]).size;

  return {
    pageTitle: 'Portfolio Dashboard',
    summary: {
      totalValue: formatCurrency(displayTotal),
      dayChange: `${formatSignedCurrency(dayChange)} (${formatSignedPercent(dayChangePct, 2)})`,
      dayChangeClass: dayChange >= 0 ? 'pos' : 'neg',
      totalGainLoss: `${formatSignedCurrency(totalGainLoss)} (${formatSignedPercent(totalGainLossPct, 1)})`,
      totalGainLossClass: totalGainLoss >= 0 ? 'pos' : 'neg',
      equities: snapshot.holdings.length,
      sectors: sectorCount
    },
    sections: buildSections(snapshot, prices),
    sectors: buildSectors(snapshot, prices),
    commodityRatios,
    initialStateJson: JSON.stringify(clientState).replace(/</g, '\u003c')
  };
}
