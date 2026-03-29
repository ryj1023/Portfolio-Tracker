export interface Holding {
  section: string;
  name: string;
  ticker: string;
  shares: number;
  cost: number;
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
  prev: number | null;
  change: number | null;
  changePct: number | null;
}

export type PriceMap = Record<string, PriceQuote>;

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
  costBasis: string;
  price: string;
  marketValue: string;
  gainLossBadge: string | null;
  gainLossClass: string | null;
  dayChange: string;
  dayChangeClass: string | null;
  pb: string;
  pbClass: string | null;
  isStatic: boolean;
}

export interface SectionViewModel {
  name: string;
  color: string;
  totalValue: string;
  rows: HoldingRowViewModel[];
}

export interface SummaryViewModel {
  totalValue: string;
  dayChange: string;
  dayChangeClass: string;
  totalGainLoss: string;
  totalGainLossClass: string;
  equities: number;
  sectors: number;
}

export interface SectorViewModel {
  name: string;
  color: string;
  value: string;
  allocationPct: string;
  costBasis: string;
  gainLoss: string;
  gainLossClass: string;
  holdings: number;
  isStatic: boolean;
  allocationBarWidth: number;
}

export interface ClientState {
  holdings: Holding[];
  staticItems: StaticItem[];
  summaryData: SummaryData;
  prices: PriceMap;
  colors: Record<string, string>;
}

export interface DashboardViewModel {
  pageTitle: string;
  summary: SummaryViewModel;
  sections: SectionViewModel[];
  sectors: SectorViewModel[];
  initialStateJson: string;
}
