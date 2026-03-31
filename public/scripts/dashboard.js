(() => {
  const state = window.__PORTFOLIO__ || { holdings: [], staticItems: [], summaryData: {}, prices: {}, colors: {} };
  const charts = {};
  let importMode = 'text';
  let commodityLookback = 'all';

  const getElement = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const mainStatus = {
    pill: getElement('statusPill'),
    text: getElement('statusText')
  };

  const importStatus = {
    pill: getElement('importStatusPill'),
    text: getElement('importStatus')
  };

  function setStatus(target, tone, text) {
    const status = target === 'import' ? importStatus : mainStatus;
    status.pill.className = `status-pill ${tone}`;
    status.pill.textContent = tone === 'loading' ? 'Working' : tone === 'error' ? 'Error' : 'Ready';
    status.text.textContent = text;
  }

  function renderSummary(summary) {
    getElement('sTotal').textContent = summary.totalValue;
    const dayElement = getElement('sDay');
    dayElement.textContent = summary.dayChange;
    dayElement.className = `stat-value ${summary.dayChangeClass}`;
    const gainElement = getElement('sGL');
    gainElement.textContent = summary.totalGainLoss;
    gainElement.className = `stat-value ${summary.totalGainLossClass}`;
    getElement('sCnt').textContent = summary.equities;
    getElement('sSec').textContent = summary.sectors;
  }

  function commodityLookbackOptionsMarkup(commodityRatios) {
    return (commodityRatios?.lookbackOptions || []).map((option) => `
      <option value="${escapeHtml(option.value)}" ${option.selected ? 'selected' : ''}>${escapeHtml(option.label)}</option>
    `).join('');
  }

  function commodityApiUrl(path) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('lookback', commodityLookback);
    return `${url.pathname}${url.search}`;
  }

  function bindCommodityLookbackControl() {
    const select = getElement('commodityLookbackSelect');
    if (!select) {
      return;
    }

    select.addEventListener('change', async (event) => {
      commodityLookback = event.target.value;
      await refreshPrices();
    });
  }

  function renderHoldings(sections, commodityRatios) {
    commodityLookback = commodityRatios?.lookback || commodityLookback;
    getElement('tab-holdings').innerHTML = `${sections.map((section) => `
      <section class="section-card">
        <div class="section-header">
          <span class="section-badge" style="background: ${section.color}22; color: ${section.color}; border-color: ${section.color}44;">${escapeHtml(section.name)}</span>
          <span class="section-total">${escapeHtml(section.totalValue)}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Name</th>
                <th>Shares</th>
                <th>Cost Basis</th>
                <th>Price</th>
                <th>Mkt Value</th>
                <th>Gain/Loss</th>
                <th>Day Chg</th>
                <th>P/B</th>
                <th>Div Yield</th>
              </tr>
            </thead>
            <tbody>
              ${section.rows.map((row) => `
                <tr>
                  <td class="ticker">${row.ticker ? escapeHtml(row.ticker) : '—'}</td>
                  <td>
                    <div>${escapeHtml(row.name)}</div>
                    ${row.note ? `<div class="note">${escapeHtml(row.note)}</div>` : ''}
                  </td>
                  <td>${escapeHtml(row.shares)}</td>
                  <td>${escapeHtml(row.costBasis)}</td>
                  <td>${escapeHtml(row.price)}</td>
                  <td>${escapeHtml(row.marketValue)}</td>
                  <td>${row.gainLossBadge ? `<span class="badge ${row.gainLossClass}">${escapeHtml(row.gainLossBadge)}</span>` : '<span class="muted">—</span>'}</td>
                  <td class="${row.dayChangeClass || 'muted'}">${escapeHtml(row.dayChange)}</td>
                  <td class="${row.pbClass || 'muted'}">${escapeHtml(row.pb)}</td>
                  <td class="${row.dividendYieldClass || 'muted'}">${escapeHtml(row.dividendYield)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `).join('')}

      <section class="section-card">
        <div class="section-header">
          <span class="section-badge" style="background: #38bdf822; color: #38bdf8; border-color: #38bdf844;">Commodity Relative Value Ranking</span>
          <span class="section-total">${escapeHtml(String(commodityRatios?.rankings?.length || 0))} commodities ranked using ${escapeHtml(commodityRatios?.lookbackLabel || 'All time')} history</span>
        </div>
        <div class="section-header">
          <label class="field-label" for="commodityLookbackSelect">Ranking lookback</label>
          <select id="commodityLookbackSelect" class="input-select" aria-label="Commodity ranking lookback">
            ${commodityLookbackOptionsMarkup(commodityRatios)}
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Ticker</th>
                <th>Yahoo Symbol</th>
                <th>Name</th>
                <th>Current Price</th>
                <th>Historically Cheap Vs</th>
              </tr>
            </thead>
            <tbody id="commodity-rankings-body"></tbody>
          </table>
        </div>
      </section>`;

    renderCommodityRatios(commodityRatios);
    bindCommodityLookbackControl();
  }

  function renderSectors(sectors) {
    getElement('tab-sectors').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Value</th>
              <th>Allocation</th>
              <th>Cost Basis</th>
              <th>Gain/Loss</th>
              <th>Holdings</th>
            </tr>
          </thead>
          <tbody>
            ${sectors.map((sector) => `
              <tr>
                <td>
                  <span class="sector-key" style="background: ${sector.color};"></span>
                  ${escapeHtml(sector.name)}
                  ${sector.isStatic ? '<span class="muted small">(static)</span>' : ''}
                </td>
                <td>${escapeHtml(sector.value)}</td>
                <td>
                  <div class="allocation-cell">
                    <div class="allocation-track">
                      <div class="allocation-bar" style="width: ${sector.allocationBarWidth}%; background: ${sector.color};"></div>
                    </div>
                    <span>${escapeHtml(sector.allocationPct)}</span>
                  </div>
                </td>
                <td>${escapeHtml(sector.costBasis)}</td>
                <td class="${sector.gainLossClass}">${escapeHtml(sector.gainLoss)}</td>
                <td>${escapeHtml(String(sector.holdings))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCommodityRatios(commodityRatios) {
    const rankingsBody = getElement('commodity-rankings-body');
    if (!rankingsBody || !commodityRatios) {
      return;
    }

    rankingsBody.innerHTML = commodityRatios.rankings.map((row) => `
      <tr>
        <td>${escapeHtml(String(row.rank))}</td>
        <td class="ticker">${escapeHtml(row.displayTicker)}</td>
        <td>${escapeHtml(row.yahooTicker)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.currentPrice)}</td>
        <td>${escapeHtml(row.comparisonSummary)}</td>
      </tr>
    `).join('');
  }

  function renderViewModel(viewModel) {
    renderSummary(viewModel.summary);
    renderHoldings(viewModel.sections, viewModel.commodityRatios);
    renderSectors(viewModel.sectors);
  }

  function showTab(tabName) {
    document.querySelectorAll('.tab-button[data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    if (tabName === 'charts') {
      drawCharts();
    }
  }

  function destroyChart(id) {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }

  function createChart(id, type, labels, datasets, options) {
    destroyChart(id);
    const context = getElement(id);
    if (!context || !window.Chart) {
      return;
    }

    charts[id] = new window.Chart(context, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#cbd5e1'
            }
          }
        },
        scales: type === 'doughnut' ? undefined : {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          }
        },
        ...options
      }
    });
  }

  function holdingValue(holding) {
    const price = state.prices[holding.ticker]?.price;
    return price != null ? price * holding.shares : holding.cost;
  }

  function drawCharts() {
    const sectorTotals = {};
    state.holdings.forEach((holding) => {
      sectorTotals[holding.section] = (sectorTotals[holding.section] || 0) + holdingValue(holding);
    });
    state.staticItems.forEach((item) => {
      sectorTotals[item.section] = (sectorTotals[item.section] || 0) + item.value;
    });

    const sectors = Object.keys(sectorTotals);
    const colors = sectors.map((section) => state.colors[section] || '#94a3b8');
    createChart('cPie', 'doughnut', sectors, [{ data: sectors.map((section) => sectorTotals[section]), backgroundColor: colors, borderColor: '#0f172a', borderWidth: 2 }], {
      cutout: '58%'
    });

    const topHoldings = [...state.holdings]
      .map((holding) => ({ ticker: holding.ticker, value: holdingValue(holding), section: holding.section }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 15);
    createChart('cTop', 'bar', topHoldings.map((row) => row.ticker), [{
      data: topHoldings.map((row) => row.value),
      backgroundColor: topHoldings.map((row) => `${state.colors[row.section] || '#94a3b8'}cc`),
      borderRadius: 8
    }], {
      plugins: { legend: { display: false } }
    });

    const pbHoldings = state.holdings
      .map((holding) => ({
        ticker: holding.ticker,
        priceToBook: state.prices[holding.ticker]?.priceToBook,
        section: holding.section
      }))
      .filter((holding) => holding.priceToBook != null)
      .sort((left, right) => left.priceToBook - right.priceToBook);
    createChart('cPB', 'bar', pbHoldings.map((holding) => holding.ticker), [{
      data: pbHoldings.map((holding) => holding.priceToBook),
      backgroundColor: pbHoldings.map((holding) => holding.priceToBook < 1 ? '#22c55e99' : holding.priceToBook < 2 ? '#facc1599' : '#ef444499'),
      borderRadius: 8
    }], {
      plugins: { legend: { display: false } }
    });

    const gainLossHoldings = state.holdings
      .map((holding) => {
        const value = holdingValue(holding);
        return {
          ticker: holding.ticker,
          gainLoss: holding.cost ? ((value - holding.cost) / holding.cost) * 100 : 0
        };
      })
      .sort((left, right) => right.gainLoss - left.gainLoss);
    createChart('cGL', 'bar', gainLossHoldings.map((holding) => holding.ticker), [{
      data: gainLossHoldings.map((holding) => holding.gainLoss),
      backgroundColor: gainLossHoldings.map((holding) => holding.gainLoss >= 0 ? '#22c55e99' : '#ef444499'),
      borderRadius: 8
    }], {
      plugins: { legend: { display: false } }
    });
  }

  function openImportModal() {
    const modal = getElement('importModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeImportModal() {
    const modal = getElement('importModal');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function switchImportMode(mode) {
    importMode = mode;
    getElement('importTextTab').classList.toggle('active', mode === 'text');
    getElement('importFileTab').classList.toggle('active', mode === 'file');
    getElement('importTextPanel').classList.toggle('hidden', mode !== 'text');
    getElement('importTextPanel').classList.toggle('active', mode === 'text');
    getElement('importFilePanel').classList.toggle('hidden', mode !== 'file');
    getElement('importFilePanel').classList.toggle('active', mode === 'file');
  }

  async function readCsvInput() {
    if (importMode === 'text') {
      return getElement('csvInput').value.trim();
    }

    const file = getElement('csvFile').files?.[0];
    if (!file) {
      return '';
    }

    return file.text();
  }

  async function refreshPrices() {
    const refreshButton = getElement('refreshPricesButton');
    refreshButton.disabled = true;
    getElement('rfIcon').classList.add('spin');
    setStatus('main', 'loading', 'Fetching fresh prices from the Node backend…');

    try {
      const response = await fetch(commodityApiUrl('/api/prices'));
      if (!response.ok) {
        throw new Error('Unable to refresh prices.');
      }

      const payload = await response.json();
      Object.assign(state, payload.state);
      renderViewModel(payload.viewModel);
      window.history.replaceState({}, '', commodityApiUrl(window.location.pathname));
      if (getElement('tab-charts').classList.contains('active')) {
        drawCharts();
      }
      setStatus('main', 'ok', `Updated ${new Date().toLocaleTimeString()}.`);
    } catch (error) {
      setStatus('main', 'error', error instanceof Error ? error.message : 'Unable to refresh prices.');
    } finally {
      refreshButton.disabled = false;
      getElement('rfIcon').classList.remove('spin');
    }
  }

  async function refreshSheet() {
    const refreshButton = getElement('refreshSheetButton');
    refreshButton.disabled = true;
    getElement('sheetIcon').classList.add('spin');
    setStatus('main', 'loading', 'Refreshing portfolio data from Google Sheets…');

    try {
      const response = await fetch('/api/sheet/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookback: commodityLookback })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to refresh Google Sheet data.');
      }

      Object.assign(state, payload.state);
      renderViewModel(payload.viewModel);
      window.history.replaceState({}, '', commodityApiUrl(window.location.pathname));
      if (getElement('tab-charts').classList.contains('active')) {
        drawCharts();
      }
      setStatus('main', 'ok', `Google Sheet synced ${new Date().toLocaleTimeString()}.`);
    } catch (error) {
      setStatus('main', 'error', error instanceof Error ? error.message : 'Unable to refresh Google Sheet data.');
    } finally {
      refreshButton.disabled = false;
      getElement('sheetIcon').classList.remove('spin');
    }
  }

  async function importPortfolio() {
    setStatus('import', 'loading', 'Importing CSV through the Node backend…');

    try {
      const csv = await readCsvInput();
      if (!csv) {
        throw new Error('Add CSV content or choose a CSV file first.');
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, lookback: commodityLookback })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Import failed.');
      }

      Object.assign(state, payload.state);
      renderViewModel(payload.viewModel);
      window.history.replaceState({}, '', commodityApiUrl(window.location.pathname));
      if (getElement('tab-charts').classList.contains('active')) {
        drawCharts();
      }
      closeImportModal();
      setStatus('main', 'ok', 'Portfolio imported successfully.');
      setStatus('import', 'ok', 'Import complete.');
    } catch (error) {
      setStatus('import', 'error', error instanceof Error ? error.message : 'Import failed.');
    }
  }

  document.querySelectorAll('.tab-button[data-tab]').forEach((button) => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
  getElement('refreshSheetButton').addEventListener('click', refreshSheet);
  getElement('refreshPricesButton').addEventListener('click', refreshPrices);
  getElement('openImportButton').addEventListener('click', openImportModal);
  getElement('closeImportButton').addEventListener('click', closeImportModal);
  getElement('importTextTab').addEventListener('click', () => switchImportMode('text'));
  getElement('importFileTab').addEventListener('click', () => switchImportMode('file'));
  getElement('doImportButton').addEventListener('click', importPortfolio);
  getElement('importModal').addEventListener('click', (event) => {
    if (event.target === getElement('importModal')) {
      closeImportModal();
    }
  });

  commodityLookback = new URLSearchParams(window.location.search).get('lookback') || 'all';
  bindCommodityLookbackControl();

  showTab('holdings');
})();
