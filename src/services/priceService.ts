import { HistoricalPriceMap, HistoricalPricePoint, Holding, PriceMap, PriceQuote } from '../types';

type YahooFinanceModule = {
  default: new (options?: { suppressNotices?: string[] }) => {
    quote: (ticker: string) => Promise<unknown>;
    quoteSummary: (ticker: string, options: { modules: string[] }) => Promise<unknown>;
    chart: (ticker: string, options: { period1: Date; interval: string }) => Promise<unknown>;
  };
};

interface YahooChartQuote {
  date?: string | Date;
  close?: number | null;
  adjclose?: number | null;
}

interface YahooChartResult {
  quotes?: YahooChartQuote[];
}

interface YahooQuote {
  symbol?: string;
  shortName?: string;
  regularMarketPrice?: number;
  dividendYield?: number;
  trailingAnnualDividendYield?: number;
}

interface YahooQuoteSummary {
  defaultKeyStatistics?: {
    priceToBook?: number | { raw?: number } | null;
  };
  financialData?: {
    priceToBook?: number | { raw?: number } | null;
    dividendYield?: number | { raw?: number } | null;
  };
  summaryDetail?: {
    dividendYield?: number | { raw?: number } | null;
    trailingAnnualDividendYield?: number | { raw?: number } | null;
  };
}

function isYahooQuote(value: unknown): value is YahooQuote {
  return value != null && typeof value === 'object';
}

function emptyQuote(): PriceQuote {
  return { price: null, priceToBook: null, dividendYield: null, shortName: null };
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'raw' in value) {
    const rawValue = (value as { raw?: unknown }).raw;
    return typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null;
  }

  return null;
}

function normalizeYieldPercent(value: unknown): number | null {
  const normalized = normalizeNumber(value);
  if (normalized == null || normalized <= 0) {
    return null;
  }

  return normalized < 1 ? normalized * 100 : normalized;
}

let yahooFinanceModulePromise: Promise<YahooFinanceModule> | null = null;

async function getYahooFinance() {
  yahooFinanceModulePromise ??= import('yahoo-finance2') as Promise<YahooFinanceModule>;
  const module = await yahooFinanceModulePromise;
  return new module.default({ suppressNotices: ['yahooSurvey'] });
}

function toQuote(quote: unknown, quoteSummary?: unknown): PriceQuote {
  if (!isYahooQuote(quote)) {
    return emptyQuote();
  }

  const summary = quoteSummary && typeof quoteSummary === 'object' ? quoteSummary as YahooQuoteSummary : undefined;
  const priceToBook = normalizeNumber(summary?.defaultKeyStatistics?.priceToBook)
    ?? normalizeNumber(summary?.financialData?.priceToBook);

  const dividendYield = normalizeYieldPercent(summary?.summaryDetail?.dividendYield)
    ?? normalizeYieldPercent(summary?.summaryDetail?.trailingAnnualDividendYield)
    ?? normalizeYieldPercent(summary?.financialData?.dividendYield)
    ?? quote.dividendYield
    ?? normalizeYieldPercent(quote.trailingAnnualDividendYield);


  const price = Number.isFinite(quote.regularMarketPrice) ? quote.regularMarketPrice ?? null : null;

  return { price, priceToBook, dividendYield, shortName: quote.shortName ?? null };
}

function isYahooChartResult(value: unknown): value is YahooChartResult {
  return value != null && typeof value === 'object';
}

function toHistoricalPoints(chartResult: unknown): HistoricalPricePoint[] {
  if (!isYahooChartResult(chartResult) || !Array.isArray(chartResult.quotes)) {
    return [];
  }

  return chartResult.quotes
    .map((quote) => {
      const close = typeof quote.adjclose === 'number' && Number.isFinite(quote.adjclose)
        ? quote.adjclose
        : typeof quote.close === 'number' && Number.isFinite(quote.close)
          ? quote.close
          : null;
      if (close == null || close <= 0 || quote.date == null) {
        return null;
      }

      const date = quote.date instanceof Date ? quote.date.toISOString().slice(0, 10) : new Date(quote.date).toISOString().slice(0, 10);
      return Number.isNaN(Date.parse(date)) ? null : { date, close };
    })
    .filter((point): point is HistoricalPricePoint => point != null);
}

async function fetchQuoteMap(tickers: string[], includeFundamentals: boolean): Promise<PriceMap> {
  const yahooFinance = await getYahooFinance();
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      quote: await yahooFinance.quote(ticker),
      quoteSummary: includeFundamentals
        ? await yahooFinance.quoteSummary(ticker, { modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'] })
        : null
    }))
  );

  const fulfilledQuotes = new Map<string, { quote: unknown; quoteSummary: unknown }>();
  results.forEach((candidate) => {
    if (candidate.status === 'fulfilled') {
      fulfilledQuotes.set(candidate.value.ticker, {
        quote: candidate.value.quote,
        quoteSummary: candidate.value.quoteSummary
      });
    }
  });

  return tickers.reduce<PriceMap>((accumulator, ticker) => {
    const data = fulfilledQuotes.get(ticker);
    accumulator[ticker] = data
      ? toQuote(data.quote, data.quoteSummary)
      : emptyQuote();
    return accumulator;
  }, {});
}

export async function fetchPrices(holdings: Holding[]): Promise<PriceMap> {
  return fetchQuoteMap([...new Set(holdings.map((holding) => holding.ticker))], true);
}

export async function fetchTickerPrices(tickers: string[]): Promise<PriceMap> {
  return fetchQuoteMap([...new Set(tickers)], false);
}

export async function fetchTickerHistory(tickers: string[], lookbackDays?: number | null): Promise<HistoricalPriceMap> {
  const uniqueTickers = [...new Set(tickers)];
  const yahooFinance = await getYahooFinance();
  const period1 = typeof lookbackDays === 'number'
    ? new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    : new Date('1900-01-01T00:00:00.000Z');

  const results = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => ({
      ticker,
      chart: await yahooFinance.chart(ticker, { period1, interval: '1d' })
    }))
  );

  return uniqueTickers.reduce<HistoricalPriceMap>((accumulator, ticker) => {
    const match = results.find((result): result is PromiseFulfilledResult<{ ticker: string; chart: unknown }> => result.status === 'fulfilled' && result.value.ticker === ticker);
    accumulator[ticker] = match ? toHistoricalPoints(match.value.chart) : [];
    return accumulator;
  }, {});
}
