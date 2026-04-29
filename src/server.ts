import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { engine } from 'express-handlebars';
import { COMMODITY_RATIO_SYMBOLS } from './data/portfolioData';
import { fetchGoogleSheetCsv } from './services/googleSheetService';
import { PortfolioStore } from './services/portfolioStore';
import { ExpenseStore } from './services/expenseStore';
import { fetchCompanyProfile, fetchPrices, fetchTickerHistory, fetchTickerPrices } from './services/priceService';
import { DashboardTab } from './types';
import { buildClientState, buildDashboardViewModel } from './utils/buildDashboardViewModel';
import { buildHoldingDetailsViewModel } from './utils/buildHoldingDetailsViewModel';

const COMMODITY_LOOKBACK_DAYS: Record<string, number | null> = {
  all: null,
  '1y': 365,
  '3y': 365 * 3,
  '5y': 365 * 5
};

function parseCommodityLookback(value: unknown): string {
  return typeof value === 'string' && value in COMMODITY_LOOKBACK_DAYS ? value : 'all';
}

function parseDashboardTab(value: unknown): DashboardTab {
  return value === 'charts' || value === 'sectors' || value === 'expenses' ? value : 'holdings';
}

const app = express();
const store = new PortfolioStore();
const expenseStore = new ExpenseStore();
const port = Number(process.env.PORT ?? 3000);
const projectRoot = path.resolve(__dirname, '..');

async function refreshPortfolioFromGoogleSheet() {
  const csv = await fetchGoogleSheetCsv();
  store.importCsv(csv);
}

const initialPortfolioLoadPromise = refreshPortfolioFromGoogleSheet().catch((error) => {
  console.error('Unable to hydrate portfolio from Google Sheet; using bundled defaults instead.', error);
});

const expenseStoreInitPromise = expenseStore.initialize().catch((error) => {
  console.error('Unable to load expense data; starting with empty expenses.', error);
});

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main'
}));

app.set('view engine', 'hbs');
app.set('views', path.join(projectRoot, 'views'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(projectRoot, 'public')));

async function buildDashboardPayload(commodityLookback: string, activeTab: DashboardTab) {
  await Promise.all([initialPortfolioLoadPromise, expenseStoreInitPromise]);
  const snapshot = store.getSnapshot();
  const expenseData = expenseStore.getExpenseData();
  const commodityTickers = COMMODITY_RATIO_SYMBOLS
    .map((commodity) => commodity.yahooTicker)
    .filter((ticker): ticker is string => ticker != null);

  const [prices, commodityPrices, commodityHistory] = await Promise.all([
    fetchPrices(snapshot.holdings),
    fetchTickerPrices(commodityTickers),
    fetchTickerHistory(commodityTickers, COMMODITY_LOOKBACK_DAYS[commodityLookback])
  ]);
  return {
    state: buildClientState(snapshot, prices, expenseData, activeTab),
    viewModel: buildDashboardViewModel(snapshot, prices, commodityPrices, commodityHistory, commodityLookback, activeTab, expenseData)
  };
}

async function buildHoldingDetailsPayload(ticker: string) {
  await Promise.all([initialPortfolioLoadPromise, expenseStoreInitPromise]);
  const snapshot = store.getSnapshot();
  const normalizedTicker = ticker.trim().toUpperCase();
  const [prices, companyProfile] = await Promise.all([
    fetchPrices(snapshot.holdings),
    fetchCompanyProfile(normalizedTicker)
  ]);
  return buildHoldingDetailsViewModel(snapshot, prices, normalizedTicker, companyProfile);
}

app.get('/', async (request, response, next) => {
  try {
    await refreshPortfolioFromGoogleSheet();
    const { viewModel } = await buildDashboardPayload(
      parseCommodityLookback(request.query.lookback),
      parseDashboardTab(request.query.tab)
    );
    response.render('home', viewModel);
  } catch (error) {
    next(error);
  }
});

app.get('/holding-details/:ticker', async (request, response, next) => {
  try {
    await refreshPortfolioFromGoogleSheet();
    const viewModel = await buildHoldingDetailsPayload(request.params.ticker);
    response.status(viewModel.holding ? 200 : 404).render('holding-details', viewModel);
  } catch (error) {
    next(error);
  }
});

app.get('/api/prices', async (request, response, next) => {
  try {
    const payload = await buildDashboardPayload(
      parseCommodityLookback(request.query.lookback),
      parseDashboardTab(request.query.tab)
    );
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/import', async (request, response, next) => {
  try {
    const csv = typeof request.body.csv === 'string' ? request.body.csv : '';
    const commodityLookback = parseCommodityLookback(request.body.lookback);
    const activeTab = parseDashboardTab(request.body.tab);
    if (!csv.trim()) {
      response.status(400).json({ message: 'CSV input is required.' });
      return;
    }

    store.importCsv(csv);
    const payload = await buildDashboardPayload(commodityLookback, activeTab);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/expenses/import', async (request, response, next) => {
  try {
    const csv = typeof request.body.csv === 'string' ? request.body.csv : '';
    const commodityLookback = parseCommodityLookback(request.body.lookback);
    const activeTab = parseDashboardTab(request.body.tab);
    if (!csv.trim()) {
      response.status(400).json({ message: 'CSV input is required.' });
      return;
    }

    await expenseStore.importCsv(csv);
    const payload = await buildDashboardPayload(commodityLookback, activeTab);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/sheet/refresh', async (request, response, next) => {
  try {
    const commodityLookback = parseCommodityLookback(request.body.lookback);
    const activeTab = parseDashboardTab(request.body.tab);
    await refreshPortfolioFromGoogleSheet();
    const payload = await buildDashboardPayload(commodityLookback, activeTab);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({
    message: error instanceof Error ? error.message : 'Unexpected server error.'
  });
});

app.listen(port, () => {
  console.log(`Portfolio Dashboard listening on http://localhost:${port}`);
});
