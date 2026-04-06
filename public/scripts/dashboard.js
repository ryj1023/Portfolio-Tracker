(() => {
  const state = window.__PORTFOLIO__ || { holdings: [], staticItems: [], summaryData: {}, prices: {}, colors: {}, expenses: null };
  const charts = {};
  let importMode = 'text';
  let expenseImportMode = 'text';
  let commodityLookback = 'all';
  let expenseChart = null;

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

  const expenseImportStatus = {
    pill: getElement('expenseImportStatusPill'),
    text: getElement('expenseImportStatus')
  };

  function setStatus(target, tone, text) {
    const status = target === 'import' ? importStatus : target === 'expense-import' ? expenseImportStatus : mainStatus;
    status.pill.className = `status-pill ${tone}`;
    status.pill.textContent = tone === 'loading' ? 'Working' : tone === 'error' ? 'Error' : 'Ready';
    status.text.textContent = text;
  }

  function renderSummary(summary) {
    getElement('sTotal').textContent = summary.totalValue;
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
                <th>Current Value</th>
                <th>Price</th>
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
                  <td>${escapeHtml(row.currentValue)}</td>
                  <td>${escapeHtml(row.price)}</td>
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
    if (viewModel.expenses) {
      renderExpenses(viewModel.expenses);
    }
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

    if (tabName === 'expenses') {
      renderExpenseChart();
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
    return price != null ? price * holding.shares : holding.currentValue;
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
      borderRadius: 8,
      barPercentage: 0.92,
      categoryPercentage: 0.96
    }], {
      interaction: {
        mode: 'index',
        intersect: false,
        axis: 'x'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (context) => `Price-to-Book: ${Number(context.parsed.y).toFixed(2)}`
          }
        }
      }
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

  function renderExpenses(expenses) {
    // Update summary stats
    const totalSpentEl = getElement('expenseTotalSpent');
    const transactionCountEl = getElement('expenseTransactionCount');
    const dateRangeEl = getElement('expenseDateRange');

    if (totalSpentEl) totalSpentEl.textContent = expenses.totalSpent;
    if (transactionCountEl) transactionCountEl.textContent = expenses.transactionCount;
    if (dateRangeEl) dateRangeEl.textContent = expenses.dateRange;

    // Update category filter options
    const categoryFilter = getElement('categoryFilter');
    if (categoryFilter && expenses.categories) {
      const currentValue = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        expenses.categories.map((cat) => 
          `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.name)} (${cat.count})</option>`
        ).join('');
      categoryFilter.value = currentValue;
    }

    // Render transaction rows
    const tbody = getElement('transactionTableBody');
    if (tbody && expenses.transactions) {
      tbody.innerHTML = expenses.transactions.map((transaction) => `
        <tr data-category="${escapeHtml(transaction.category)}" data-transaction-date="${escapeHtml(transaction.transactionDate)}">
          <td>${escapeHtml(transaction.transactionDate)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td>
            <span class="category-badge" style="background: ${escapeHtml(transaction.categoryColor)}22; color: ${escapeHtml(transaction.categoryColor)}; border-color: ${escapeHtml(transaction.categoryColor)}44;">
              ${escapeHtml(transaction.category)}
            </span>
          </td>
          <td>${escapeHtml(transaction.type)}</td>
          <td class="${transaction.amountClass}">${escapeHtml(transaction.amount)}</td>
          <td class="memo">${escapeHtml(transaction.memo)}</td>
        </tr>
      `).join('');
    }
  }

  function renderExpenseChart() {
    if (!state.expenses || !state.expenses.categories || state.expenses.categories.length === 0) {
      return;
    }

    const canvas = getElement('expenseChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (expenseChart) {
      expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: state.expenses.categories.map((cat) => cat.name),
        datasets: [{
          data: state.expenses.categories.map((cat) => cat.total),
          backgroundColor: state.expenses.categories.map((cat) => cat.color),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            right: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            position: 'right',
            align: 'start',
            maxWidth: 400,
            labels: {
              color: '#f8fafc',
              font: {
                size: 13,
                weight: '500'
              },
              padding: 10,
              boxWidth: 15,
              boxHeight: 15,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const category = state.expenses.categories[i];
                    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
                    return {
                      text: `${label}: ${formatted} (${category.percentage.toFixed(1)}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      fontColor: '#f8fafc',
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                const category = state.expenses.categories[context.dataIndex];
                return `${label}: ${formatted} (${category.percentage.toFixed(1)}%, ${category.count} transactions)`;
              }
            }
          }
        }
      }
    });
  }

  function populateExpenseFilters() {
    if (!state.expenses || !state.expenses.transactions) return;

    const months = new Set();
    const years = new Set();

    state.expenses.transactions.forEach((transaction) => {
      const date = new Date(transaction.transactionDate);
      if (!isNaN(date.getTime())) {
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        years.add(date.getFullYear());
      }
    });

    const monthFilter = getElement('monthFilter');
    const yearFilter = getElement('yearFilter');

    if (monthFilter) {
      monthFilter.innerHTML = '<option value="">All Months</option>' +
        Array.from(months).sort().reverse().map((month) => {
          const date = new Date(month + '-01');
          const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          return `<option value="${escapeHtml(month)}">${escapeHtml(label)}</option>`;
        }).join('');
    }

    if (yearFilter) {
      yearFilter.innerHTML = '<option value="">All Years</option>' +
        Array.from(years).sort().reverse().map((year) => 
          `<option value="${year}">${year}</option>`
        ).join('');
    }
  }

  function filterTransactions() {
    const categoryFilter = getElement('categoryFilter')?.value || '';
    const monthFilter = getElement('monthFilter')?.value || '';
    const yearFilter = getElement('yearFilter')?.value || '';

    const rows = document.querySelectorAll('#transactionTableBody tr');
    rows.forEach((row) => {
      const category = row.getAttribute('data-category') || '';
      const transactionDate = row.getAttribute('data-transaction-date') || '';
      const date = new Date(transactionDate);
      
      let show = true;

      if (categoryFilter && category !== categoryFilter) {
        show = false;
      }

      if (monthFilter && !isNaN(date.getTime())) {
        const rowMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (rowMonth !== monthFilter) {
          show = false;
        }
      }

      if (yearFilter && !isNaN(date.getTime())) {
        if (date.getFullYear() !== parseInt(yearFilter, 10)) {
          show = false;
        }
      }

      row.style.display = show ? '' : 'none';
    });
  }

  function openExpenseImportModal() {
    getElement('expenseImportModal').classList.remove('hidden');
    getElement('expenseImportModal').setAttribute('aria-hidden', 'false');
    setStatus('expense-import', 'ok', 'Choose a CSV source to import.');
  }

  function closeExpenseImportModal() {
    getElement('expenseImportModal').classList.add('hidden');
    getElement('expenseImportModal').setAttribute('aria-hidden', 'true');
  }

  function switchExpenseImportMode(mode) {
    expenseImportMode = mode;
    if (mode === 'text') {
      getElement('expenseImportTextPanel').classList.remove('hidden');
      getElement('expenseImportFilePanel').classList.add('hidden');
      getElement('expenseImportTextTab').classList.add('active');
      getElement('expenseImportFileTab').classList.remove('active');
    } else {
      getElement('expenseImportTextPanel').classList.add('hidden');
      getElement('expenseImportFilePanel').classList.remove('hidden');
      getElement('expenseImportTextTab').classList.remove('active');
      getElement('expenseImportFileTab').classList.add('active');
    }
  }

  async function readExpenseCsvInput() {
    if (expenseImportMode === 'text') {
      return getElement('expenseCsvInput').value;
    }

    const file = getElement('expenseCsvFile').files?.[0];
    if (!file) {
      return '';
    }

    return file.text();
  }

  async function importExpenses() {
    setStatus('expense-import', 'loading', 'Importing expense CSV through the Node backend…');

    try {
      const csv = await readExpenseCsvInput();
      if (!csv) {
        throw new Error('Add CSV content or choose a CSV file first.');
      }

      const response = await fetch('/api/expenses/import', {
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
      renderExpenseChart();
      populateExpenseFilters();
      closeExpenseImportModal();
      setStatus('main', 'ok', 'Expenses imported successfully.');
      setStatus('expense-import', 'ok', 'Import complete.');
    } catch (error) {
      setStatus('expense-import', 'error', error instanceof Error ? error.message : 'Import failed.');
    }
  }

  document.querySelectorAll('.tab-button[data-tab]').forEach((button) => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
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

  getElement('openExpenseImportButton').addEventListener('click', openExpenseImportModal);
  getElement('closeExpenseImportButton').addEventListener('click', closeExpenseImportModal);
  getElement('expenseImportTextTab').addEventListener('click', () => switchExpenseImportMode('text'));
  getElement('expenseImportFileTab').addEventListener('click', () => switchExpenseImportMode('file'));
  getElement('doExpenseImportButton').addEventListener('click', importExpenses);
  getElement('expenseImportModal').addEventListener('click', (event) => {
    if (event.target === getElement('expenseImportModal')) {
      closeExpenseImportModal();
    }
  });

  getElement('categoryFilter')?.addEventListener('change', filterTransactions);
  getElement('monthFilter')?.addEventListener('change', filterTransactions);
  getElement('yearFilter')?.addEventListener('change', filterTransactions);

  commodityLookback = new URLSearchParams(window.location.search).get('lookback') || 'all';
  bindCommodityLookbackControl();
  populateExpenseFilters();
  renderExpenseChart();

  showTab('holdings');
})();
