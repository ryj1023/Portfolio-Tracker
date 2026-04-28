export interface Holding {
  section: string;
  name: string;
  ticker: string;
  shares: number;
  currentValue: number;
  pb: number | null;
  note: string;
}

export interface StaticItem {
  section: string;
  name: string;
  value: number;
}

export interface SummaryData {
  netWorth?: number;
}

export interface PriceQuote {
  price: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  shortName?: string | null;
}

export type PriceMap = Record<string, PriceQuote>;

export interface HistoricalPricePoint {
  date: string;
  close: number;
}

export type HistoricalPriceMap = Record<string, HistoricalPricePoint[]>;

export interface CommoditySymbol {
  displayTicker: string;
  yahooTicker: string | null;
  name: string;
}

export interface PortfolioSnapshot {
  holdings: Holding[];
  staticItems: StaticItem[];
  summaryData: SummaryData;
}

export interface HoldingRowViewModel {
  ticker: string | null;
  name: string;
  note: string;
  shares: string;
  currentValue: string;
  price: string;
  marketValue: string;
  pb: string;
  pbClass: string | null;
  dividendYield: string;
  dividendYieldClass: string | null;
  isStatic: boolean;
}

export interface CommodityPriceRowViewModel {
  displayTicker: string;
  yahooTicker: string;
  name: string;
  currentPrice: string;
  currentPriceValue: number | null;
}

export interface CommodityRankingRowViewModel {
  rank: number;
  displayTicker: string;
  yahooTicker: string;
  name: string;
  currentPrice: string;
  currentPriceValue: number | null;
  cheaperThanCount: number;
  comparedAgainstCount: number;
  comparisonSummary: string;
}

export interface CommodityLookbackOptionViewModel {
  value: string;
  label: string;
  selected: boolean;
}

export interface CommodityRatiosViewModel {
  rankings: CommodityRankingRowViewModel[];
  lookback: string;
  lookbackLabel: string;
  lookbackOptions: CommodityLookbackOptionViewModel[];
}

export type DashboardTab = 'holdings' | 'charts' | 'sectors' | 'expenses';

export interface SectionViewModel {
  name: string;
  color: string;
  totalValue: string;
  rows: HoldingRowViewModel[];
}

export interface SummaryViewModel {
  totalValue: string;
  equities: number;
  sectors: number;
  annualDividends: string;
}

export interface SectorViewModel {
  name: string;
  color: string;
  value: string;
  allocationPct: string;
  holdings: number;
  isStatic: boolean;
  allocationBarWidth: number;
}

export interface Transaction {
  transactionDate: string;
  postDate: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  memo: string;
}

export interface ExpenseCategory {
  name: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface ExpenseData {
  transactions: Transaction[];
  categories: ExpenseCategory[];
  totalSpent: number;
  startDate: string | null;
  endDate: string | null;
}

export interface TransactionRowViewModel {
  transactionDate: string;
  postDate: string;
  description: string;
  category: string;
  categoryColor: string;
  type: string;
  amount: string;
  amountClass: string;
  memo: string;
}

export interface ExpenseViewModel {
  categories: ExpenseCategory[];
  transactions: TransactionRowViewModel[];
  totalSpent: string;
  transactionCount: number;
  dateRange: string;
}

export interface ClientState {
  holdings: Holding[];
  staticItems: StaticItem[];
  summaryData: SummaryData;
  prices: PriceMap;
  colors: Record<string, string>;
  activeTab: DashboardTab;
  expenses?: ExpenseData;
}

export interface DashboardViewModel {
  pageTitle: string;
  includeDashboardScript: boolean;
  activeTab: DashboardTab;
  activeTabs: {
    holdings: boolean;
    charts: boolean;
    sectors: boolean;
    expenses: boolean;
  };
  summary: SummaryViewModel;
  sections: SectionViewModel[];
  sectors: SectorViewModel[];
  commodityRatios: CommodityRatiosViewModel;
  expenses: ExpenseViewModel;
  initialStateJson: string;
}

export interface HoldingDetailsViewModel {
  ticker: string;
  name: string;
  section: string;
  sectionColor: string;
  note: string | null;
  shares: string;
  snapshotValue: string;
  livePrice: string;
  marketValue: string;
  priceToBook: string;
  dividendYield: string;
}

export interface RelatedHoldingViewModel {
  ticker: string;
  name: string;
  href: string;
}

export interface HoldingDetailsPageViewModel {
  pageTitle: string;
  includeDashboardScript: boolean;
  initialStateJson: string;
  backHref: string;
  holding: HoldingDetailsViewModel | null;
  relatedHoldings: RelatedHoldingViewModel[];
  requestedTicker?: string;
}
