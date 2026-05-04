import { DEFAULT_STATIC_ITEMS, SECTOR_MAP } from '../data/portfolioData';
import { Holding, StaticItem, SummaryData } from '../types';

interface ParsedPortfolioCsv {
  holdings: Holding[];
  staticItems: StaticItem[];
  summaryData: SummaryData;
}

const SECTION_HEADER_ALIASES: Array<[string, string]> = [
  ['Oil & Gas', 'Oil & Gas'],
  ['Oil and Gas', 'Oil & Gas'],
  ['Energy Services', 'Energy Services'],
  ['Energy Service', 'Energy Services'],
  ['Oil Tankers', 'Oil Tankers'],
  ['Oil Tanker', 'Oil Tankers'],
  ['Coal', 'Coal'],
  ['Steel/Iron Ore', 'Steel/Iron Ore'],
  ['Steel Iron Ore', 'Steel/Iron Ore'],
  ['Dry Bulk', 'Dry Bulk'],
  ['Uranium', 'Uranium'],
  ['PGM Miners', 'PGM Miners'],
  ['Precious Metals', 'Precious Metals'],
  ['Gold & Silver Miners and Royalty', 'Gold & Silver Miners and Royalty'],
  ['Gold and Silver Miners and Royalty', 'Gold & Silver Miners and Royalty'],
  ['Lithium/Base Metals', 'Lithium/Base Metals'],
  ['Lithium Base Metals', 'Lithium/Base Metals'],
  ['Fertilizers', 'Fertilizers'],
  ['Copper', 'Copper'],
  ['Other Stocks', 'Other Stocks'],
  ['Crypto', 'Crypto'],
  ['Home Equity', 'Home Equity'],
  ['Cash', 'Cash'],
  ['Other', 'Other']
];

function normalizeSectionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function staticItemKey(section: string, name: string): string {
  return `${normalizeSectionText(section)}::${normalizeSectionText(name)}`;
}

function detectSectionHeader(value: string): string | null {
  const normalizedValue = normalizeSectionText(value);

  if (!normalizedValue) {
    return null;
  }

  for (const [alias, section] of SECTION_HEADER_ALIASES) {
    const normalizedAlias = normalizeSectionText(alias);
    if (normalizedValue === normalizedAlias || normalizedValue.startsWith(`${normalizedAlias} `)) {
      return section;
    }
  }

  return null;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function parseNumber(raw: string): number {
  const value = Number.parseFloat(raw.replace(/[,$]/g, ''));
  return Number.isFinite(value) ? value : Number.NaN;
}

function isTicker(raw: string): boolean {
  return /^[A-Z][A-Z0-9.\-]{1,7}$/.test(raw);
}

function normalizeStaticPreciousMetalsName(name: string): string | null {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('physical gold')) {
    return 'Physical Gold (3.47 oz)';
  }

  if (lowerName.includes('physical silver') || lowerName.includes('physcial silver')) {
    return 'Physical Silver (183.94 oz)';
  }

  if (lowerName.includes('physical platinum')) {
    return 'Physical Platinum (3.43 oz)';
  }

  if (lowerName.includes('valuted gold') || lowerName.includes('vaulted gold')) {
    return 'Vaulted Gold';
  }

  if (lowerName.includes('valuted silver') || lowerName.includes('vaulted silver')) {
    return 'Vaulted Silver';
  }

  return null;
}

function parseStaticPreciousMetalsRow(section: string, name: string, ticker: string, value: number): StaticItem | null {
  if (section !== 'Precious Metals' || !(value > 0)) {
    return null;
  }

  const normalizedName = normalizeStaticPreciousMetalsName(name);
  if (!normalizedName) {
    return null;
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  if (normalizedTicker && !['GC=F', 'SI=F', 'PL=F', 'XAUUSD', 'XAGUSD', 'XPTUSD'].includes(normalizedTicker)) {
    return null;
  }

  return {
    section,
    name: normalizedName,
    value
  };
}

function parseStaticOtherStocksRow(name: string, value: number): StaticItem | null {
  if (!(value > 0)) {
    return null;
  }

  const normalizedName = normalizeSectionText(name);
  if (normalizedName !== 'adp balance') {
    return null;
  }

  return {
    section: 'Other Stocks',
    name: 'ADP Balance',
    value
  };
}

export function mergeStaticItems(base: StaticItem[], imported: StaticItem[]): StaticItem[] {
  const importedItemsByKey = new Map(imported.map((item) => [staticItemKey(item.section, item.name), { ...item }]));

  return [
    ...base
      .filter((item) => !importedItemsByKey.has(staticItemKey(item.section, item.name)))
      .map((item) => ({ ...item })),
    ...importedItemsByKey.values()
  ];
}

export function parsePortfolioCsv(csv: string): ParsedPortfolioCsv {
  const rows = csv.split(/\r?\n/).map(splitCsvLine);
  const holdings: Holding[] = [];
  const staticItems: StaticItem[] = [];
  const summaryData: SummaryData = {};
  let section = '';

  for (const row of rows) {
    const [columnA = '', columnB = '', columnC = '', columnD = '', , columnF = '', columnG = ''] = row;
    const normalizedA = normalizeSectionText(columnA);
    const detectedSection = !isTicker(columnB) ? detectSectionHeader(columnA) : null;

    if (detectedSection) {
      section = detectedSection;
    } else if (normalizedA && !isTicker(columnB) && !columnC.trim() && !columnD.trim()) {
      for (const [keyword, mappedSection] of Object.entries(SECTOR_MAP)) {
        if (normalizedA.includes(normalizeSectionText(keyword))) {
          section = mappedSection;
          break;
        }
      }
    }

    const shares = parseNumber(columnC);
    const currentValue = parseNumber(columnD);
    const staticPreciousMetalItem = parseStaticPreciousMetalsRow(section, columnA, columnB, currentValue);
    const staticOtherStockItem = parseStaticOtherStocksRow(columnA, currentValue);

    if (staticPreciousMetalItem) {
      staticItems.push(staticPreciousMetalItem);
      continue;
    }

    if (staticOtherStockItem) {
      staticItems.push(staticOtherStockItem);
      continue;
    }

    if (isTicker(columnB) && shares > 0) {
      holdings.push({
        section: section || 'Other',
        name: columnA,
        ticker: columnB,
        shares,
        currentValue: Number.isFinite(currentValue) ? currentValue : 0,
        pb: null,
        note: columnG
      });
      continue;
    }

    if (columnA === 'Net Worth' && currentValue > 0) {
      summaryData.netWorth = currentValue;
    }
  }

  return {
    holdings,
    staticItems: mergeStaticItems(DEFAULT_STATIC_ITEMS, staticItems),
    summaryData
  };
}
