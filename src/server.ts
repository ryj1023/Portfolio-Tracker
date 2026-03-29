import path from 'node:path';
import express from 'express';
import { engine } from 'express-handlebars';
import { COMMODITY_RATIO_SYMBOLS } from './data/portfolioData';
import { PortfolioStore } from './services/portfolioStore';
import { fetchPrices, fetchTickerPrices } from './services/priceService';
import { buildClientState, buildDashboardViewModel } from './utils/buildDashboardViewModel';

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

async function buildDashboardPayload() {
  const snapshot = store.getSnapshot();
  const [prices, commodityPrices] = await Promise.all([
    fetchPrices(snapshot.holdings),
    fetchTickerPrices(
      COMMODITY_RATIO_SYMBOLS
        .map((commodity) => commodity.yahooTicker)
        .filter((ticker): ticker is string => ticker != null)
    )
  ]);
  return {
    state: buildClientState(snapshot, prices),
    viewModel: buildDashboardViewModel(snapshot, prices, commodityPrices)
  };
}

app.get('/', async (_request, response, next) => {
  try {
    const { viewModel } = await buildDashboardPayload();
    response.render('home', viewModel);
  } catch (error) {
    next(error);
  }
});

app.get('/api/prices', async (_request, response, next) => {
  try {
    const payload = await buildDashboardPayload();
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/import', async (request, response, next) => {
  try {
    const csv = typeof request.body.csv === 'string' ? request.body.csv : '';
    if (!csv.trim()) {
      response.status(400).json({ message: 'CSV input is required.' });
      return;
    }

    store.importCsv(csv);
    const payload = await buildDashboardPayload();
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
