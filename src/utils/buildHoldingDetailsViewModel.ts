import { SECTION_COLORS } from '../data/portfolioData';
import {
  HoldingDetailsPageViewModel,
  HoldingDetailsViewModel,
  PortfolioSnapshot,
  PriceMap,
  RelatedHoldingViewModel
} from '../types';

function formatCurrency(value: number, fractionDigits = 0): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits
  });
}

function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}

function buildRelatedHoldings(snapshot: PortfolioSnapshot, ticker: string, section: string): RelatedHoldingViewModel[] {
  return snapshot.holdings
    .filter((holding) => holding.section === section && holding.ticker.toUpperCase() !== ticker)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 8)
    .map((holding) => ({
      ticker: holding.ticker,
      name: holding.name,
      href: `/holding-details/${encodeURIComponent(holding.ticker)}`
    }));
}

function buildHoldingViewModel(snapshot: PortfolioSnapshot, prices: PriceMap, ticker: string): HoldingDetailsViewModel | null {
  const holding = snapshot.holdings.find((candidate) => candidate.ticker.toUpperCase() === ticker);
  if (!holding) {
    return null;
  }

  const quote = prices[holding.ticker];
  const livePrice = quote?.price ?? null;
  const marketValue = livePrice != null ? livePrice * holding.shares : holding.currentValue;
  const priceToBook = quote?.priceToBook ?? holding.pb;
  const dividendYield = quote?.dividendYield ?? null;

  return {
    ticker: holding.ticker,
    name: holding.name,
    section: holding.section,
    sectionColor: SECTION_COLORS[holding.section] ?? '#94a3b8',
    note: holding.note || null,
    shares: formatNumber(holding.shares),
    snapshotValue: formatCurrency(holding.currentValue),
    livePrice: livePrice != null ? formatCurrency(livePrice, 2) : '—',
    marketValue: marketValue != null ? formatCurrency(marketValue) : '—',
    priceToBook: priceToBook != null ? formatNumber(priceToBook) : '—',
    dividendYield: dividendYield != null ? formatPercent(dividendYield) : 'N/A'
  };
}

export function buildHoldingDetailsViewModel(
  snapshot: PortfolioSnapshot,
  prices: PriceMap,
  requestedTicker: string
): HoldingDetailsPageViewModel {
  const normalizedTicker = requestedTicker.trim().toUpperCase();
  const holding = buildHoldingViewModel(snapshot, prices, normalizedTicker);

  return {
    pageTitle: holding ? `${holding.ticker} · ${holding.name}` : 'Holding Not Found',
    includeDashboardScript: false,
    initialStateJson: '{}',
    backHref: '/?tab=holdings',
    holding,
    relatedHoldings: holding ? buildRelatedHoldings(snapshot, normalizedTicker, holding.section) : [],
    requestedTicker: holding ? undefined : normalizedTicker
  };
}
