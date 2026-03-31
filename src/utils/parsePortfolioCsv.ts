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

function isStaticPreciousMetalsRow(section: string, name: string, ticker: string, shares: string, value: number): boolean {
  if (section !== 'Precious Metals' || !name || ticker.trim() || shares.trim() || !(value > 0)) {
    return false;
  }

  const lowerName = name.toLowerCase();
  return lowerName.includes('physical gold')
    || lowerName.includes('physical silver')
    || lowerName.includes('physical platinum')
    || lowerName.includes('valuted gold')
    || lowerName.includes('valuted silver')
    || lowerName.includes('vaulted gold')
    || lowerName.includes('vaulted silver');
}

export function mergeStaticItems(base: StaticItem[], imported: StaticItem[]): StaticItem[] {
  const importedSections = new Set(imported.map((item) => item.section));
  return [
    ...base
      .filter((item) => !importedSections.has(item.section))
      .map((item) => ({ ...item })),
    ...imported.map((item) => ({ ...item }))
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
    const cost = parseNumber(columnD);

    if (isTicker(columnB) && shares > 0) {
      holdings.push({
        section: section || 'Other',
        name: columnA,
        ticker: columnB,
        shares,
        cost: Number.isFinite(cost) ? cost : 0,
        pb: null,
        note: columnG
      });
      continue;
    }

    if (isStaticPreciousMetalsRow(section, columnA, columnB, columnC, cost)) {
      staticItems.push({ section, name: columnA, value: cost });
      continue;
    }

    if (columnA === 'Net Worth' && cost > 0) {
      summaryData.netWorth = cost;
    }
  }

  return {
    holdings,
    staticItems: mergeStaticItems(DEFAULT_STATIC_ITEMS, staticItems),
    summaryData
  };
}
