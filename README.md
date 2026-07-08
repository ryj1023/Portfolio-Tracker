# Portfolio Dashboard

This dashboard now runs as a Node.js + TypeScript + Handlebars application.

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the app in watch mode at `http://localhost:3000`
- `npm run check` — run TypeScript validation
- `npm run build` — compile the server to `dist/`
- `npm start` — run the compiled app

## Local config

- Create a local `.env` file and set `GOOGLE_SHEET_URL` to your sheet URL.
- Set `FMP_API_KEY` to a Financial Modeling Prep API key to enable the dividend schedule tab.
- `.env` and other local env files are ignored by git.
- Example:

```env
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/<your-sheet-id>
FMP_API_KEY=<your-financial-modeling-prep-api-key>
```

## Architecture

- `src/server.ts` — Express server and API routes
- `src/data/portfolioData.ts` — default holdings, static items, colors, and sector map
- `src/services/portfolioStore.ts` — in-memory portfolio snapshot state
- `src/services/priceService.ts` — server-side price fetching
- `src/utils/parsePortfolioCsv.ts` — CSV import parsing and static metals merging
- `src/utils/buildDashboardViewModel.ts` — server-side dashboard view model generation
- `views/` — Handlebars layout and page templates
- `public/` — browser assets for styling, tabs, charts, and import interactions

## API

- `GET /` — render the dashboard page
- `GET /api/prices` — refresh the current dashboard snapshot with latest prices
- `GET /api/dividend-schedule` — fetch the next upcoming dividend payment date for each dividend-paying holding over the next 12 months
- `POST /api/import` — import CSV payloads with `{ "csv": "..." }`
- `POST /api/sheet/refresh` — reload the portfolio snapshot from `GOOGLE_SHEET_URL`
