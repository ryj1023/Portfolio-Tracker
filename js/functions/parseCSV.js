(function initParseCsv(global) {
  const app = global.PortfolioDashboard = global.PortfolioDashboard || { data: {}, functions: {} };
  app.functions.parseCSV = function parseCSV(csv) {
    const rows = csv.split(/\r?\n/).map(function mapRow(rowText) {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let index = 0; index < rowText.length; index += 1) {
        if (rowText[index] === '"') inQuotes = !inQuotes;
        else if (rowText[index] === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else current += rowText[index];
      }
      cells.push(current.trim());
      return cells.map(function stripQuotes(cell) {
        return cell.replace(/^"|"$/g, '').trim();
      });
    });
    const result = [];
    const staticResult = [];
    const summary = {};
    let sector = '';
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const A = row[0] || '';
      const B = row[1] || '';
      const C = row[2] || '';
      const D = row[3] || '';
      const F = row[5] || '';
      const G = row[6] || '';
      const lowerA = A.toLowerCase();
      if (lowerA && !B.match(/^[A-Z][A-Z0-9.\-]{1,7}$/) && !C.trim() && !D.trim()) {
        for (const key in app.data.SMAP) {
          if (lowerA.indexOf(key) >= 0) {
            sector = app.data.SMAP[key];
            break;
          }
        }
      }
      const shares = parseFloat(C.replace(/[,$]/g, ''));
      const cost = parseFloat(D.replace(/[,$]/g, ''));
      if (B.match(/^[A-Z][A-Z0-9.\-]{1,7}$/) && shares > 0) {
        const pb = parseFloat(F);
        result.push({
          s: sector || 'Other',
          name: A,
          tk: B,
          sh: shares,
          cost: cost || 0,
          pb: (!Number.isNaN(pb) && pb > 0 && pb < 100) ? pb : null,
          note: G
        });
      } else if (app.functions.isStaticPreciousMetalsRow(sector, A, B, C, cost)) {
        staticResult.push({ s: sector, name: A, value: cost });
      } else if (A === 'Net Worth' && cost > 0) summary.netWorth = cost;
    }
    return { holdings: result, staticItems: staticResult, summary: summary };
  };
}(window));
