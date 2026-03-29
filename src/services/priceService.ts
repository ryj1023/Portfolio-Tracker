import { Holding, PriceMap, PriceQuote } from '../types';

type YahooFinanceModule = {
  default: new (options?: { suppressNotices?: string[] }) => {
    quote: (ticker: string) => Promise<unknown>;
    quoteSummary: (ticker: string, options: { modules: string[] }) => Promise<unknown>;
  };
};

interface YahooQuote {
  symbol?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
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
  return { price: null, prev: null, change: null, changePct: null, priceToBook: null, dividendYield: null, shortName: null };
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
    ?? normalizeYieldPercent(quote.dividendYield)
    ?? normalizeYieldPercent(quote.trailingAnnualDividendYield);

  const price = Number.isFinite(quote.regularMarketPrice) ? quote.regularMarketPrice ?? null : null;
  const prev = Number.isFinite(quote.regularMarketPreviousClose) ? quote.regularMarketPreviousClose ?? null : null;
  const change = Number.isFinite(quote.regularMarketChange)
    ? quote.regularMarketChange ?? null
    : (price != null && prev != null ? price - prev : null);
  const changePct = Number.isFinite(quote.regularMarketChangePercent)
    ? quote.regularMarketChangePercent ?? null
    : (change != null && prev ? (change / prev) * 100 : null);

  return { price, prev, change, changePct, priceToBook, dividendYield, shortName: quote.shortName ?? null };
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
