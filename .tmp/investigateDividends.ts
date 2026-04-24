import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fetchPrices } from '../src/services/priceService';
import { DEFAULT_HOLDINGS } from '../src/data/portfolioData';

async function compute(label: string, holdings: Array<{ ticker: string; shares: number; currentValue: number }>) {
  const priceHoldings = holdings.map((holding) => ({
    section: 'X',
    name: holding.ticker,
    ticker: holding.ticker,
    shares: holding.shares,
    currentValue: holding.currentValue,
    pb: null,
    note: ''
  }));

  const prices = await fetchPrices(priceHoldings);
  const rows = priceHoldings
    .map((holding) => {
      const quote = prices[holding.ticker];
      const marketValue = quote?.price != null ? quote.price * holding.shares : holding.currentValue;
      const base = Number.isFinite(marketValue) && marketValue > 0
        ? marketValue
        : Number.isFinite(holding.currentValue) && holding.currentValue > 0
          ? holding.currentValue
          : 0;
      const yieldPct = quote?.dividendYield ?? null;
      const annual = yieldPct != null && yieldPct > 0 ? base * (yieldPct / 100) : 0;

      return {
        ticker: holding.ticker,
        shares: holding.shares,
        currentValue: holding.currentValue,
        marketValue,
        yieldPct,
        annual
      };
    })
    .filter((row) => row.annual > 0)
    .sort((left, right) => right.annual - left.annual);

  return {
    label,
    totalAnnualDividends: rows.reduce((sum, row) => sum + row.annual, 0),
    top: rows.slice(0, 15)
  };
}

async function main() {
  const repo = path.resolve(__dirname, '..');
  const file = path.join(repo, 'js/data/holdings.js');
  const code = fs.readFileSync(file, 'utf8');
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const rawHoldings = ((sandbox.window as { PortfolioDashboard?: { data?: { HOLDINGS?: Array<{ tk: string; sh: number }> } } }).PortfolioDashboard?.data?.HOLDINGS) ?? [];
  const holdingsJs = rawHoldings.map((holding) => ({
    ticker: holding.tk.replace('PBR.A', 'PBR-A'),
    shares: holding.sh,
    currentValue: 0
  }));
  const defaults = DEFAULT_HOLDINGS.map((holding) => ({
    ticker: holding.ticker,
    shares: holding.shares,
    currentValue: holding.currentValue
  }));

  const results = await Promise.all([
    compute('default', defaults),
    compute('holdings.js', holdingsJs)
  ]);

  console.log(JSON.stringify(results, null, 2));
}

void main();
