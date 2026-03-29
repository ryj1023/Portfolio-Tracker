import { Holding, PriceMap, PriceQuote } from '../types';

type YahooFinanceModule = {
  default: new (options?: { suppressNotices?: string[] }) => {
    quote: (ticker: string) => Promise<unknown>;
  };
};

interface YahooQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

function isYahooQuote(value: unknown): value is YahooQuote {
  return value != null && typeof value === 'object';
}

function emptyQuote(): PriceQuote {
  return { price: null, prev: null, change: null, changePct: null };
}

let yahooFinanceModulePromise: Promise<YahooFinanceModule> | null = null;

async function getYahooFinance() {
  yahooFinanceModulePromise ??= import('yahoo-finance2') as Promise<YahooFinanceModule>;
  const module = await yahooFinanceModulePromise;
  return new module.default({ suppressNotices: ['yahooSurvey'] });
}

function toQuote(quote: unknown): PriceQuote {
  if (!isYahooQuote(quote)) {
    return emptyQuote();
  }

  const price = Number.isFinite(quote.regularMarketPrice) ? quote.regularMarketPrice ?? null : null;
  const prev = Number.isFinite(quote.regularMarketPreviousClose) ? quote.regularMarketPreviousClose ?? null : null;
  const change = Number.isFinite(quote.regularMarketChange)
    ? quote.regularMarketChange ?? null
    : (price != null && prev != null ? price - prev : null);
  const changePct = Number.isFinite(quote.regularMarketChangePercent)
    ? quote.regularMarketChangePercent ?? null
    : (change != null && prev ? (change / prev) * 100 : null);

  return { price, prev, change, changePct };
}

export async function fetchPrices(holdings: Holding[]): Promise<PriceMap> {
  const yahooFinance = await getYahooFinance();
  const tickers = [...new Set(holdings.map((holding) => holding.ticker))];
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => ({
      ticker,
      quote: await yahooFinance.quote(ticker)
    }))
  );

  const fulfilledQuotes = new Map<string, unknown>();
  results.forEach((candidate) => {
    if (candidate.status === 'fulfilled') {
      fulfilledQuotes.set(candidate.value.ticker, candidate.value.quote);
    }
  });

  return tickers.reduce<PriceMap>((accumulator, ticker) => {
    accumulator[ticker] = fulfilledQuotes.has(ticker)
      ? toQuote(fulfilledQuotes.get(ticker))
      : emptyQuote();
    return accumulator;
  }, {});
}
