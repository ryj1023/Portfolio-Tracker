import path from 'node:path';
import express from 'express';
import { engine } from 'express-handlebars';
import { COMMODITY_RATIO_SYMBOLS } from './data/portfolioData';
import { PortfolioStore } from './services/portfolioStore';
import { fetchPrices, fetchTickerHistory, fetchTickerPrices } from './services/priceService';
import { buildClientState, buildDashboardViewModel } from './utils/buildDashboardViewModel';

const COMMODITY_LOOKBACK_DAYS: Record<string, number | null> = {
  all: null,
  '1y': 365,
  '3y': 365 * 3,
  '5y': 365 * 5
};

function parseCommodityLookback(value: unknown): string {
  return typeof value === 'string' && value in COMMODITY_LOOKBACK_DAYS ? value : 'all';
}

const app = express();
const store = new PortfolioStore();
const port = Number(process.env.PORT ?? 3000);
const projectRoot = path.resolve(__dirname, '..');

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main'
}));

app.set('view engine', 'hbs');
app.set('views', path.join(projectRoot, 'views'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(projectRoot, 'public')));

async function buildDashboardPayload(commodityLookback: string) {
  const snapshot = store.getSnapshot();
  const commodityTickers = COMMODITY_RATIO_SYMBOLS
    .map((commodity) => commodity.yahooTicker)
    .filter((ticker): ticker is string => ticker != null);

  const [prices, commodityPrices, commodityHistory] = await Promise.all([
    fetchPrices(snapshot.holdings),
    fetchTickerPrices(commodityTickers),
    fetchTickerHistory(commodityTickers, COMMODITY_LOOKBACK_DAYS[commodityLookback])
  ]);
  return {
    state: buildClientState(snapshot, prices),
    viewModel: buildDashboardViewModel(snapshot, prices, commodityPrices, commodityHistory, commodityLookback)
  };
}

app.get('/', async (request, response, next) => {
  try {
    const { viewModel } = await buildDashboardPayload(parseCommodityLookback(request.query.lookback));
    response.render('home', viewModel);
  } catch (error) {
    next(error);
  }
});

app.get('/api/prices', async (request, response, next) => {
  try {
    const payload = await buildDashboardPayload(parseCommodityLookback(request.query.lookback));
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/import', async (request, response, next) => {
  try {
    const csv = typeof request.body.csv === 'string' ? request.body.csv : '';
    const commodityLookback = parseCommodityLookback(request.body.lookback);
    if (!csv.trim()) {
      response.status(400).json({ message: 'CSV input is required.' });
      return;
    }

    store.importCsv(csv);
    const payload = await buildDashboardPayload(commodityLookback);
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
