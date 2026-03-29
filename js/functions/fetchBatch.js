(function initFetchBatch(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.fetchBatch = function fetchBatch(tickers) {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: 'Today is ' + today + '. Return ONLY a raw JSON object, no markdown, with current stock prices for: ' + tickers.join(', ') + '. Format: {"TICKER":{"price":1.23,"prev":1.20,"change":0.03,"changePct":2.5},...} Use null for unavailable tickers.' }]
      })
    }).then(function toJson(response) {
      return response.json();
    }).then(function parseContent(data) {
      const text = (data.content || []).filter(function filterBlock(block) { return block.type === 'text'; }).map(function mapBlock(block) { return block.text; }).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try { return JSON.parse(match[0]); } catch (error) { return {}; }
    }).catch(function onError() {
      return {};
    });
  };
}(window));
