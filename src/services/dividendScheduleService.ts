import {
  DividendScheduleHoldingViewModel,
  DividendScheduleMonthViewModel,
  DividendScheduleViewModel,
  Holding
} from '../types';

const DIVIDEND_API_KEY_ENV_NAME = 'FMP_API_KEY';
const DIVIDEND_CALENDAR_URL = 'https://financialmodelingprep.com/stable/dividends-calendar';

interface DividendCalendarEntry {
  symbol?: unknown;
  paymentDate?: unknown;
  dividend?: unknown;
  adjDividend?: unknown;
  currency?: unknown;
  frequency?: unknown;
  period?: unknown;
}

interface HoldingSummary {
  ticker: string;
  name: string;
  shares: number;
}

interface NormalizedDividendEvent {
  ticker: string;
  paymentDate: string;
  dividendPerShare: number;
  currency: string;
  frequency: string | null;
}

interface YahooHistoricalDividend {
  date?: string | Date;
  dividends?: number | null;
}

interface YahooDividendSummary {
  summaryDetail?: {
    dividendRate?: number | null;
    exDividendDate?: string | Date | null;
    currency?: string | null;
  };
  calendarEvents?: {
    exDividendDate?: string | Date | null;
    dividendDate?: string | Date | null;
  };
  price?: {
    currency?: string | null;
  };
}

type YahooFinanceModule = {
  default: new (options?: { suppressNotices?: string[] }) => {
    quoteSummary: (ticker: string, options: { modules: string[] }) => Promise<unknown>;
    historical: (ticker: string, options: { period1: string; period2: string; events: string }) => Promise<unknown>;
  };
};

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));
}

function getDateRange(today = new Date()): { from: string; to: string } {
  const fromDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const toDate = addMonths(fromDate, 12);

  return {
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate)
  };
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTicker(value: unknown): string | null {
  const ticker = normalizeText(value);
  return ticker ? ticker.toUpperCase() : null;
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toIsoDate(value);
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T00:00:00.000Z`)
    : new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toIsoDate(parsed);
}

function normalizePositiveNumber(value: unknown): number | null {
  const normalized = normalizeNumber(value);
  return normalized != null && normalized > 0 ? normalized : null;
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addMonthsToIsoDate(value: string, months: number): string {
  const date = parseIsoDate(value);
  return toIsoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())));
}

function isWithinRange(value: string, from: string, to: string): boolean {
  return value >= from && value <= to;
}

function advanceIntoRange(value: string, cadenceMonths: number, from: string, to: string): string | null {
  let current = value;

  while (current < from) {
    current = addMonthsToIsoDate(current, cadenceMonths);
  }

  return current <= to ? current : null;
}

function formatMonthLabel(monthKey: string): string {
  const parsed = new Date(`${monthKey}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function formatDisplayDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00.000Z`));
}

function formatShares(shares: number): string {
  return shares.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatFrequency(value: string | null): string {
  if (!value) {
    return 'Unspecified';
  }

  const normalized = value.toLowerCase();
  if (normalized === 'q' || normalized === 'quarterly') return 'Quarterly';
  if (normalized === 'm' || normalized === 'monthly') return 'Monthly';
  if (normalized === 's' || normalized === 'semi-annual' || normalized === 'semiannual') return 'Semi-Annual';
  if (normalized === 'a' || normalized === 'annual' || normalized === 'yearly') return 'Annual';

  return value;
}

function formatFrequencyFromCadenceMonths(months: number | null): string {
  if (months === 1) return 'Monthly';
  if (months === 3) return 'Quarterly';
  if (months === 6) return 'Semi-Annual';
  if (months === 12) return 'Annual';
  return 'Unspecified';
}

function cadenceMonthsFromFrequency(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'm' || normalized === 'monthly') return 1;
  if (normalized === 'q' || normalized === 'quarterly') return 3;
  if (normalized === 's' || normalized === 'semi-annual' || normalized === 'semiannual') return 6;
  if (normalized === 'a' || normalized === 'annual' || normalized === 'yearly') return 12;
  return null;
}

function formatPerShare(value: number, currency: string): string {
  return `${formatCurrency(value, currency)} / share`;
}

function formatCurrencyTotals(totalsByCurrency: Map<string, number>): string {
  return [...totalsByCurrency.entries()]
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(' • ');
}

function buildUnavailableSchedule(message: string): DividendScheduleViewModel {
  return {
    status: 'unavailable',
    message,
    asOf: toIsoDate(new Date()),
    annualEstimatedPayment: 'N/A',
    months: [],
    payableHoldingCount: 0
  };
}

let yahooFinanceModulePromise: Promise<YahooFinanceModule> | null = null;

async function getYahooFinance() {
  yahooFinanceModulePromise ??= import('yahoo-finance2') as Promise<YahooFinanceModule>;
  const module = await yahooFinanceModulePromise;
  return new module.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
}

function summarizeHoldings(holdings: Holding[]): Map<string, HoldingSummary> {
  return holdings.reduce<Map<string, HoldingSummary>>((accumulator, holding) => {
    const existing = accumulator.get(holding.ticker);
    if (existing) {
      accumulator.set(holding.ticker, {
        ...existing,
        shares: existing.shares + holding.shares
      });
      return accumulator;
    }

    accumulator.set(holding.ticker, {
      ticker: holding.ticker,
      name: holding.name,
      shares: holding.shares
    });
    return accumulator;
  }, new Map<string, HoldingSummary>());
}

function normalizeDividendEvent(entry: unknown): NormalizedDividendEvent | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const dividendEntry = entry as DividendCalendarEntry;
  const ticker = normalizeTicker(dividendEntry.symbol);
  const paymentDate = normalizeDate(dividendEntry.paymentDate);
  const dividendPerShare = normalizeNumber(dividendEntry.dividend) ?? normalizeNumber(dividendEntry.adjDividend);

  if (!ticker || !paymentDate || dividendPerShare == null || dividendPerShare <= 0) {
    return null;
  }

  return {
    ticker,
    paymentDate,
    dividendPerShare,
    currency: normalizeText(dividendEntry.currency) ?? 'USD',
    frequency: normalizeText(dividendEntry.frequency) ?? normalizeText(dividendEntry.period)
  };
}

function expandRecurringEvents(event: NormalizedDividendEvent, from: string, to: string): NormalizedDividendEvent[] {
  const cadenceMonths = cadenceMonthsFromFrequency(event.frequency);
  if (cadenceMonths == null) {
    return isWithinRange(event.paymentDate, from, to) ? [event] : [];
  }

  const events: NormalizedDividendEvent[] = [];
  let paymentDate = advanceIntoRange(event.paymentDate, cadenceMonths, from, to);

  while (paymentDate != null) {
    events.push({
      ...event,
      paymentDate
    });

    const nextPaymentDate = addMonthsToIsoDate(paymentDate, cadenceMonths);
    paymentDate = nextPaymentDate <= to ? nextPaymentDate : null;
  }

  return events;
}

function buildMonthViewModels(rows: DividendScheduleHoldingViewModel[]): DividendScheduleMonthViewModel[] {
  const monthMap = new Map<string, { rows: DividendScheduleHoldingViewModel[]; totalsByCurrency: Map<string, number> }>();

  rows.forEach((row) => {
    const current = monthMap.get(row.paymentMonth) ?? {
      rows: [],
      totalsByCurrency: new Map<string, number>()
    };

    current.rows.push(row);
    const existingTotal = current.totalsByCurrency.get(row.currency) ?? 0;
    const numericValue = Number.parseFloat(row.estimatedPayment.replace(/[^0-9.-]/g, ''));
    current.totalsByCurrency.set(row.currency, existingTotal + (Number.isFinite(numericValue) ? numericValue : 0));
    monthMap.set(row.paymentMonth, current);
  });

  return [...monthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, value]) => ({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      totalEstimatedPayment: formatCurrencyTotals(value.totalsByCurrency),
      rows: value.rows.sort((left, right) => {
        if (left.paymentDate !== right.paymentDate) {
          return left.paymentDate.localeCompare(right.paymentDate);
        }

        return left.ticker.localeCompare(right.ticker);
      })
    }));
}

function normalizeHistoricalDividends(payload: unknown): Array<{ date: string; dividend: number }> {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => {
      const dividendEntry = entry as YahooHistoricalDividend;
      const date = normalizeDate(dividendEntry.date);
      const dividend = normalizePositiveNumber(dividendEntry.dividends);
      if (!date || dividend == null) {
        return null;
      }

      return { date, dividend };
    })
    .filter((entry): entry is { date: string; dividend: number } => entry != null)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function inferCadenceMonthsFromHistory(history: Array<{ date: string; dividend: number }>): number | null {
  if (history.length < 2) {
    return null;
  }

  const recent = history.slice(-4);
  const intervals = recent.slice(1).map((entry, index) => {
    const current = parseIsoDate(entry.date).getTime();
    const previous = parseIsoDate(recent[index].date).getTime();
    return (current - previous) / (1000 * 60 * 60 * 24);
  });

  if (!intervals.length) {
    return null;
  }

  const averageDays = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (averageDays <= 45) return 1;
  if (averageDays <= 120) return 3;
  if (averageDays <= 240) return 6;
  if (averageDays <= 420) return 12;
  return null;
}

function inferCadenceMonthsFromAnnualRate(annualRate: number | null, latestDividend: number | null): number | null {
  if (annualRate == null || latestDividend == null || latestDividend <= 0) {
    return null;
  }

  const paymentsPerYearEstimate = annualRate / latestDividend;
  const candidates: Array<{ paymentsPerYear: number; cadenceMonths: number }> = [
    { paymentsPerYear: 12, cadenceMonths: 1 },
    { paymentsPerYear: 4, cadenceMonths: 3 },
    { paymentsPerYear: 2, cadenceMonths: 6 },
    { paymentsPerYear: 1, cadenceMonths: 12 }
  ];

  for (const candidate of candidates) {
    if (Math.abs(paymentsPerYearEstimate - candidate.paymentsPerYear) <= 0.35) {
      return candidate.cadenceMonths;
    }
  }

  return null;
}

function buildYahooFallbackEvent(
  ticker: string,
  summaryPayload: unknown,
  historicalPayload: unknown,
  from: string,
  to: string
): NormalizedDividendEvent | null {
  const summary = summaryPayload && typeof summaryPayload === 'object' ? summaryPayload as YahooDividendSummary : {};
  const history = normalizeHistoricalDividends(historicalPayload);
  const latestHistoricalDividend = history[history.length - 1] ?? null;
  const annualDividendRate = normalizePositiveNumber(summary.summaryDetail?.dividendRate);
  const knownPaymentDate = normalizeDate(summary.calendarEvents?.dividendDate);
  const cadenceMonths = inferCadenceMonthsFromHistory(history)
    ?? inferCadenceMonthsFromAnnualRate(annualDividendRate, latestHistoricalDividend?.dividend ?? null);
  const estimatedBaseDate = latestHistoricalDividend?.date ?? normalizeDate(summary.calendarEvents?.exDividendDate);
  const paymentDate = knownPaymentDate && isWithinRange(knownPaymentDate, from, to)
    ? knownPaymentDate
    : knownPaymentDate && cadenceMonths != null
      ? advanceIntoRange(knownPaymentDate, cadenceMonths, from, to)
      : estimatedBaseDate && cadenceMonths != null
        ? advanceIntoRange(addMonthsToIsoDate(estimatedBaseDate, cadenceMonths), cadenceMonths, from, to)
        : null;

  const dividendPerShare = latestHistoricalDividend?.dividend
    ?? (annualDividendRate != null && cadenceMonths != null ? annualDividendRate / (12 / cadenceMonths) : null);

  if (!paymentDate || dividendPerShare == null || dividendPerShare <= 0) {
    return null;
  }

  return {
    ticker,
    paymentDate,
    dividendPerShare,
    currency: normalizeText(summary.summaryDetail?.currency) ?? normalizeText(summary.price?.currency) ?? 'USD',
    frequency: formatFrequencyFromCadenceMonths(cadenceMonths)
  };
}

async function fetchYahooDividendFallbackEvents(holdings: Holding[], from: string, to: string): Promise<NormalizedDividendEvent[]> {
  const yahooFinance = await getYahooFinance();
  const tickers = [...new Set(holdings.map((holding) => holding.ticker))];
  const historicalPeriodStart = addMonthsToIsoDate(from, -18);
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const [summary, historical] = await Promise.all([
        yahooFinance.quoteSummary(ticker, { modules: ['summaryDetail', 'calendarEvents', 'price'] }),
        yahooFinance.historical(ticker, { period1: historicalPeriodStart, period2: to, events: 'dividends' })
      ]);

      return {
        ticker,
        event: buildYahooFallbackEvent(ticker, summary, historical, from, to)
      };
    })
  );

  return results
    .filter((result): result is PromiseFulfilledResult<{ ticker: string; event: NormalizedDividendEvent | null }> => result.status === 'fulfilled')
    .map((result) => result.value.event)
    .filter((event): event is NormalizedDividendEvent => event != null)
    .flatMap((event) => expandRecurringEvents(event, from, to));
}

function resolveDividendApiKey(): string {
  const configuredValue = DIVIDEND_API_KEY_ENV_NAME.trim();
  if (!configuredValue) {
    throw new Error('Missing dividend API key configuration.');
  }

  const envValue = process.env[configuredValue]?.trim();
  if (envValue) {
    return envValue;
  }

  throw new Error(`Missing ${configuredValue} environment variable.`);
}

async function fetchDividendCalendar(from: string, to: string): Promise<NormalizedDividendEvent[]> {
  const apiKey = resolveDividendApiKey();

  const url = new URL(DIVIDEND_CALENDAR_URL);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`Dividend calendar request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => normalizeDividendEvent(entry))
    .filter((entry): entry is NormalizedDividendEvent => entry != null);
}

export async function fetchDividendSchedule(holdings: Holding[]): Promise<DividendScheduleViewModel> {
  const holdingsByTicker = summarizeHoldings(holdings);
  if (!holdingsByTicker.size) {
    return buildUnavailableSchedule('No holdings are available to build a dividend schedule.');
  }

  const { from, to } = getDateRange();

  try {
    let events: NormalizedDividendEvent[] = [];

    try {
      events = await fetchDividendCalendar(from, to);
    } catch {
      events = [];
    }

    const fmpTickers = new Set<string>();
    const scheduledEvents: NormalizedDividendEvent[] = [];

    events
      .filter((event) => holdingsByTicker.has(event.ticker))
      .sort((left, right) => left.paymentDate.localeCompare(right.paymentDate))
      .forEach((event) => {
        fmpTickers.add(event.ticker);
        scheduledEvents.push(event);
      });

    if (fmpTickers.size < holdingsByTicker.size) {
      const yahooFallbackEvents = await fetchYahooDividendFallbackEvents(
        holdings.filter((holding) => !fmpTickers.has(holding.ticker)),
        from,
        to
      );

      scheduledEvents.push(...yahooFallbackEvents);
    }

    const rows = scheduledEvents
      .sort((left, right) => {
        if (left.paymentDate !== right.paymentDate) {
          return left.paymentDate.localeCompare(right.paymentDate);
        }

        return left.ticker.localeCompare(right.ticker);
      })
      .map((event) => {
        const holding = holdingsByTicker.get(event.ticker) as HoldingSummary;
        const estimatedPaymentValue = holding.shares * event.dividendPerShare;
        const paymentMonth = event.paymentDate.slice(0, 7);

        return {
          ticker: event.ticker,
          name: holding.name,
          shares: formatShares(holding.shares),
          paymentDate: formatDisplayDate(event.paymentDate),
          paymentMonth,
          dividendPerShare: formatPerShare(event.dividendPerShare, event.currency),
          estimatedPayment: formatCurrency(estimatedPaymentValue, event.currency),
          currency: event.currency,
          frequency: formatFrequency(event.frequency)
        };
      });

    const annualTotalsByCurrency = scheduledEvents.reduce((totalsByCurrency, event) => {
      const holding = holdingsByTicker.get(event.ticker) as HoldingSummary;
      const currentTotal = totalsByCurrency.get(event.currency) ?? 0;
      totalsByCurrency.set(event.currency, currentTotal + (holding.shares * event.dividendPerShare));
      return totalsByCurrency;
    }, new Map<string, number>());

    if (!rows.length) {
      return buildUnavailableSchedule('No upcoming dividend payment dates were returned for your current holdings in the next 12 months.');
    }

    return {
      status: 'ready',
      message: 'Upcoming dividend payments grouped by payment month. Dates and per-share amounts use live market data, with recent dividend cadence used when an issuer has not published the next payment event in the primary feed.',
      asOf: from,
      annualEstimatedPayment: formatCurrencyTotals(annualTotalsByCurrency),
      months: buildMonthViewModels(rows),
      payableHoldingCount: rows.length
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load the dividend schedule.';
    return buildUnavailableSchedule(message);
  }
}